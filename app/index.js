const fs = require('fs');
const $ = require('jQuery');
const hipchatter = require('hipchatter');

var apikey = 'AIzaSyDYwPzLevXauI-kTSVXTLroLyHEONuF9Rw';

var parsedData = JSON.parse(fs.readFileSync('private.json', 'utf8'));
var hipchat = new hipchatter(parsedData.private);

var hipchatRoomName = 'Regus Music';
var youtube = require('youtube-iframe-player');
var lastMessageDate = new Date();

var bail = true;
var queue = [];
var youtubePlayer;
var currentlyPlaying;
var votesToSkip = 0;


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
        // console.log("Player is ready");
        // console.log(event);
        playVideo();
    }

    function onPlayerStateChange(event) {
        // console.log("Player state change");
        // console.log(event);
        if (event.data === 0 || event.data === -1) {
            playVideo();
        }
    }
});

var lastPlayStarted = new Date();
function playVideo(forceSkip) {
    if (youtubePlayer == undefined) {
        return;
    }
    if (forceSkip || youtubePlayer.getPlayerState() == 5 || youtubePlayer.getPlayerState() == 0 || (new Date() - lastPlayStarted > 3000 && youtubePlayer.getPlayerState() == -1)) {
        lastPlayStarted = new Date();
        votesToSkip = 0;
        if (queue.length > 0) {
            var request = queue.shift();
            console.log("Playing next item in queue: " + request.name + " - " + request.title);
            currentlyPlaying = request;
            document.getElementsByClassName("user")[0].innerHTML = "<p>" + request.name + "</p>";
            document.getElementById("video-title").innerHTML = request.title;
            document.getElementById("video-length").innerHTML = request.length;
            youtubePlayer.cueVideoById(request.youtube, 5, "medium");
            youtubePlayer.playVideo();
        } else {
            youtubePlayer.stopVideo();
        }
    }
    updateQueue();
}

var updateTimeout;
function performUpdate() {
    get_hipchat_history();
    playVideo();
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
            console.log("Error with HipChat: " + err);
        }
        for (var key in history.items) {
            var thisMessage = history.items[key];
            var messageDate = Date.parse(thisMessage.date);
            if (messageDate <= lastMessageDate) {
                continue;
            }
            lastMessageDate = messageDate;
            handleHistoryItem(thisMessage);
        }
    });
}

function handleHistoryItem(thisMessage) {
    var messageOwner = thisMessage.from.name;

    if (thisMessage.message == "skip") {
        votesToSkip += 1;
        if ((currentlyPlaying !== undefined && currentlyPlaying.name == messageOwner) || votesToSkip > 2) {
            playVideo(true);
            return;
        }
    }
    if (thisMessage.message.indexOf("search: ") !== -1) {
        searchViaApi(thisMessage.message.replace("search: ", ""), messageOwner, function(request) {
            addToQueueIfNotExist(request);
        });
        return;
    }
    if (!is_youtube(thisMessage.message) || duplicate_hipchat_video(thisMessage)) {
        return;
    }
    var youtubeId = parse_youtube_url(thisMessage.message);
    getVideoInformation(youtubeId, messageOwner, function(request) {
        addToQueueIfNotExist(request);
    });
}

function addToQueueIfNotExist(request) {
    var testQueue = queue.map(function (item) {
        return item.youtube
    });
    if (testQueue.indexOf(request.youtube) === -1) {
        console.log("New video: " + request.name + " - " + request.title);
        queue.push(request);
    }
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

function searchViaApi(search, messageOwner, callback) {
    $.get("https://www.googleapis.com/youtube/v3/search", {
        part: 'snippet, id',
        q: search,
        maxResults: 50,
        type: 'video',
        key: apikey
    },
    function(data) {
        $.each(data.items, function(i, item) {
            var videoId = item.id.videoId;
            getVideoInformation(videoId, callback);
        });
    });
}

function getVideoInformation(videoId, messageOwner, callback) {
    $.get("https://www.googleapis.com/youtube/v3/videos", {
        part: 'snippet, contentDetails',
        key: apikey,
        id: videoId
    },
    function(video) {
        if (video.items.length > 0) {
            var item = video.items[0];

            var videoID = item.id;
            var title = item.snippet.title;
            var thumb = item.snippet.thumbnails.high.url;
            var channelProfile = item.snippet.thumbnails;
            var channelTitle = item.snippet.channelTitle;
            var videoDuration = convertTime(item.contentDetails.duration);

            if (title.length > 65) {
                title = title.substring(0, 65).trim() + '...';
            }
            var request = {
                youtube: videoID,
                name: messageOwner,
                thumb: thumb,
                channelTitle: channelTitle,
                channelProfile: channelProfile,
                title: title,
                length: videoDuration,
                data: item
            };

            if (callback) {
                callback(request);
            }
        }
    });
}

function convertTime(duration) {
    var a = duration.match(/\d+/g);

    if (duration.indexOf('M') >= 0 && duration.indexOf('H') == -1 && duration.indexOf('S') == -1) {
        a = [0, a[0], 0];
    }

    if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1) {
        a = [a[0], 0, a[1]];
    }
    if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1 && duration.indexOf('S') == -1) {
        a = [a[0], 0, 0];
    }

    duration = 0;

    if (a.length == 3) {
        duration = duration + parseInt(a[0]) * 3600;
        duration = duration + parseInt(a[1]) * 60;
        duration = duration + parseInt(a[2]);
    }

    if (a.length == 2) {
        duration = duration + parseInt(a[0]) * 60;
        duration = duration + parseInt(a[1]);
    }

    if (a.length == 1) {
        duration = duration + parseInt(a[0]);
    }
    var h = Math.floor(duration / 3600);
    var m = Math.floor(duration % 3600 / 60);
    var s = Math.floor(duration % 3600 % 60);
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
}

Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
};
NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
};
