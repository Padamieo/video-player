

var fs = require('fs');
var parsedData = JSON.parse(fs.readFileSync('private.json', 'utf8'));

const hipchatter = require('hipchatter');

var hipchat = new hipchatter(parsedData.private);
var hipchatRoomName = 'Regus Music';
var lastChatId = -1;
var lastMessageDate = new Date();

//setInterval(function() {
  hipchat.history(hipchatRoomName, function(err, history){
    console.log("HERE");
    console.log(err);
    console.log(history);
    console.log(history.length);
    for (var i = 0; i < history.length; i++) {
      console.log("ASHASHASH");
      var thisMessage = history[i];

      if (Date.parse("thisMessage.date") < lastMessageDate) {
        console.log("This message is old");
        continue;
      }
      console.log("NEW MESSAGE: " + thisMessage.message);
    }
  // print the last message
  //console.log(history.items[history.items.length-1].message);
  //     console.log(history.items.length)
  //     console.log(history.items[history.items.length-2]);
  });
//}, 1000);

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


var youtube = require('youtube-iframe-player');

youtube.init(function() {
  console.log('API Loaded');

  var youtubePlayer = youtube.createPlayer('video-player', {
    width: '720',
    height: '405',
    videoId: 'M7lc1UVf-VE',
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
