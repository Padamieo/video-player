

var fs = require('fs');
var parsedData = JSON.parse(fs.readFileSync('private.json', 'utf8'));

const hipchatter = require('hipchatter');
var hipchat = new hipchatter(parsedData.private);

var hipchatRoomName = 'Regus Music';
var lastChatId = -1; // presume your thiniking : localStorage.setItem("example", "data");
var lastMessageDate = new Date();

var youtube = require('youtube-iframe-player');
var bail = true;
var queue = [];
var youtubePlayer;

setInterval(function() {
  if(bail){
    get_hipchat_history();
  }
  console.log(queue);
}, 10000);

function get_hipchat_history(){
  hipchat.history(hipchatRoomName, function(err, history){

    for (var key in history.items) {
      var thisMessage = history.items[key];

      if (Date.parse(thisMessage.date) < Date.parse(lastMessageDate)) {
        continue;
      }

      if(is_youtube(thisMessage.message)){
        if(!duplicate_hipchat_video(thisMessage.message)){
          if (typeof youtubePlayer == "undefined") {
            play_youtube(parse_youtube_url(thisMessage.message));
          }else{
            if( youtubePlayer.getPlayerState() == 1 ){
              queue.push(parse_youtube_url(thisMessage.message));
            }else{
              playQueueVideo(parse_youtube_url(thisMessage.message));
            }
          }
          lastMessageDate = new Date();
        }
      }
    }

  });
}

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

function play_youtube(video_id){
  youtube.init(function() {

    youtubePlayer = youtube.createPlayer('video-player', {
      width: '720',
      height: '405',
      videoId: video_id,
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
      if(event.data == 0){
        playQueueVideo(queue.pop());
      }
    }

  });
}

function playQueueVideo(videoId){
  youtubePlayer.cueVideoById(videoId, 5, "medium");
  youtubePlayer.playVideo();
}
