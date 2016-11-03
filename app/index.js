

var fs = require('fs');
var parsedData = JSON.parse(fs.readFileSync('private.json', 'utf8'));

const hipchatter = require('hipchatter');
var hipchat = new hipchatter(parsedData.private);

var hipchatRoomName = 'Regus Music';
var lastChatId = -1; // presume your thiniking : localStorage.setItem("example", "data");
var lastMessageDate = new Date();

var youtube = require('youtube-iframe-player');

setInterval(function() {
  hipchat.history(hipchatRoomName, function(err, history){
    console.log("HERE");
    //console.log(err);
    console.log(history);

    for (var key in history.items) {
      var thisMessage = history.items[key];

      if (Date.parse(thisMessage.date) < Date.parse(lastMessageDate)) {
        console.log("This message is old");
        continue;
      }

      if(is_youtube(thisMessage.message)){
        if(!duplicate_hipchat_video(thisMessage.message)){
          play_youtube(parse_youtube_url(thisMessage.message));
        }
      }

      //console.log(is_youtube(thisMessage.message));
      // console.log("NEW MESSAGE: " + thisMessage.message);
    }

  // print the last message
  //console.log(history.items[history.items.length-1].message);
  //     console.log(history.items.length)
  //     console.log(history.items[history.items.length-2]);
  });
}, 10000);

function is_youtube(message){
  return message.includes("youtube");
}

function duplicate_hipchat_video(message){
  return message.includes("<p>");
}

function parse_youtube_url(url){
  var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
  var match = url.match(regExp);
  return (match&&match[7].length==11)? match[7] : false;
}

/*
Object {date: "2016-11-03T13:30:59.857873+00:00", from: Object, id: "5fb74f1e-fe9d-4098-9f00-ce08a42e44b0", mentions: Array[0], message: "https://www.youtube.com/watch?v=btPJPFnesV4"…}
date
:
"2016-11-03T13:30:59.857873+00:00"
from
:
Object
id
:
"5fb74f1e-fe9d-4098-9f00-ce08a42e44b0"
mentions
:
Array[0]
message
:
"https://www.youtube.com/watch?v=btPJPFnesV4"
type
:
"message"
__proto__
:
Object
*/

function play_youtube(video_id){
  youtube.init(function() {
    console.log('API Loaded');

    var youtubePlayer = youtube.createPlayer('video-player', {
      width: '720',
      height: '405',
      videoId: video_id, //'M7lc1UVf-VE',
      playerVars: { 'autoplay': 0, 'controls': 1 },
      events: {
        'onReady': playerReady,
        'onStateChange': onPlayerStateChange
      }
    });

    function playerReady(event) {
      youtubePlayer.playVideo();
    }

    function onPlayerStateChange(event) {
      console.log('Player State Changed: ', event);
    }
  });
}
