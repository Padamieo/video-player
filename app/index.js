

var fs = require('fs');
var parsedData = JSON.parse(fs.readFileSync('private.json', 'utf8'));

const hipchatter = require('hipchatter');
var hipchat = new hipchatter(parsedData.private);

var hipchatRoomName = 'Regus Music';
var lastMessageDate = new Date();
var youtube = require('youtube-iframe-player');
var bail = true;
var queue = [];
var youtubePlayer;

setInterval(function() {
  if(bail){
    get_hipchat_history();
  }
  //console.log(queue);
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

          var currentVideoID = parse_youtube_url(thisMessage.message);

          var request = {
            youtube: currentVideoID,
            name: thisMessage.from.name
          };

          if (typeof youtubePlayer == "undefined") {
            play_youtube(request);
          }else{

            if( youtubePlayer.getPlayerState() == 1 ){

              var testQueue = queue.map(function(item){ return item.youtube });
              if ( testQueue.indexOf(currentVideoID) === -1) {
                queue.push(request);
              }

            }else{
              playQueueVideo(request);
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

function play_youtube(newrequest){
  youtube.init(function() {

    youtubePlayer = youtube.createPlayer('video-player', {
      width: '720',
      height: '405',
      videoId: newrequest.youtube,
      playerVars: { 'autoplay': 0, 'controls': 1 },
      events: {
        'onReady': playerReady,
        'onStateChange': onPlayerStateChange
      }
    });

    function playerReady(event) {
      //console.log(newrequest.name);
      updateRequester(newrequest);
      youtubePlayer.playVideo();
    }

    function onPlayerStateChange(event) {
      if(event.data == 0){
        if(queue.length != 0){
          var request = queue.shift();
          //console.log(request.name);
          updateRequester(request);
          playQueueVideo(request.youtube);
        }
      }
      if(event.data == -1){
        if(queue.length != 0){
          var request = queue.shift();
          updateRequester(request);
          playQueueVideo(request.youtube);
        }
      }
    }

  });
}

function playQueueVideo(request){
  youtubePlayer.cueVideoById(request.youtube, 5, "medium");
  youtubePlayer.playVideo();
}

function updateRequester(request){
  //console.log(request.name);
  document.getElementsByClassName("queue")[0].innerHTML = "<p>"+request.name+"</p>";
}
