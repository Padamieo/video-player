const fs = require('fs');
const $ = require('jQuery');
const hipchatter = require('hipchatter');

var parsedData = JSON.parse(fs.readFileSync('private.json', 'utf8'));
var hipchat = new hipchatter(parsedData.private);

var hipchatRoomName = 'Regus Music';
var youtube = require('youtube-iframe-player');
var lastMessageDate = new Date();

var bail = true;
var queue = [];
var currentlyPlaying;
var youtubePlayer;

//Enable Dev Tools with Control+Shift+I
document.addEventListener("keydown", function (e) {
    if (e.which === 123) {
        require('remote').getCurrentWindow().toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
});

//Set up the YouTube Embed
youtube.init(function () {
    youtubePlayer = youtube.createPlayer('video-player', {
        width: '720',
        height: '405',
        //videoId: "R8MWKsheHxk",
        playerVars: {'autoplay': 0, 'controls': 1},
        events: {
            'onReady': playerReady,
            'onStateChange': onPlayerStateChange
        }
    });

    function playerReady(event) {
        console.log("Player is ready");
        console.log(event);
        playVideo();
    }

    function onPlayerStateChange(event) {
        console.log("Player state change");
        console.log(event);
        if (event.data === 0 || event.data === -1) {
            playVideo();
        }
    }
});

var lastPlayStarted = new Date();
function playVideo(forceSkip) {
    if (forceSkip || youtubePlayer.getPlayerState() == 5 || (new Date() - lastPlayStarted > 3000 && youtubePlayer.getPlayerState() == -1)) {
        lastAttempted = new Date();
        if (queue.length > 0) {
            var request = queue.shift();
            console.log("Playing next item in queue: " + request.name + " - " + request.youtube);
            currentlyPlaying = request;
            document.getElementsByClassName("user")[0].innerHTML = "<p>" + request.name + "</p>";
            youtubePlayer.cueVideoById(request.youtube, 5, "medium");
            youtubePlayer.playVideo();
        }
    }
    updateQueue();
}

var updateTimeout;
function performUpdate() {
    get_hipchat_history();
    updateTimeout = setTimeout(performUpdate, 10000);
}
performUpdate();


function updateQueue() {
    //console.log(queue);
    $("#queue").empty();
    for (var i = 0; i < queue.length; i++) {
        var current = queue[i];
        $("#queue").append(buildHtml(current));
    }
}

function buildHtml(message) {
    return $("<div>").append(
        $("<img>").attr({
            "src": message.thumb,
            "height": "120px",
            "widget": "200px"
        })
    ).append($("<p>").addClass("requestor").text(message.name)
    ).append($("<p>").addClass("requested-title").text(message.title)
    );
}

function get_hipchat_history() {
    hipchat.history(hipchatRoomName, function (err, history) {
        if (err) {
            console.log("Error with hipchat: " + err);
        }
        for (var key in history.items) {
            var thisMessage = history.items[key];
            handleHistoryItem(thisMessage);
        }
    });
}

function handleHistoryItem(thisMessage) {
    var messageDate = Date.parse(thisMessage.date);
    var messageOwner = thisMessage.from.name;

    if (messageDate < Date.parse(lastMessageDate)) {
        return;
    }
    lastMessageDate = messageDate;

    if (thisMessage.message == "skip" && currentlyPlaying.name == messageOwner) {
        playVideo(true);
    }
    if (!is_youtube(thisMessage.message) || duplicate_hipchat_video(thisMessage)) {
        return;
    }
    var youtubeId = parse_youtube_url(thisMessage.message);

    $.getJSON("https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=" + youtubeId + "&format=json", function (data, status, xhr) {
        var request = {
            youtube: youtubeId,
            name: messageOwner,
            thumb: data.thumbnail_url,
            title: data.title,
            data: data
        };

        var testQueue = queue.map(function (item) {
            return item.youtube
        });
        if (testQueue.indexOf(request.youtube) === -1) {
            console.log("New video: " + request.name + " - " + request.youtube);
            //console.log(thisMessage);
            queue.push(request);
            playVideo();
        }
    });
}

function is_youtube(message) {
    return message.includes("youtube");
}

function duplicate_hipchat_video(message) {
    return message.from == "Link";
}

function parse_youtube_url(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
}