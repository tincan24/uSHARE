var SpotifyApi = require("./spotify-api.js");
var socketIo = require("socket.io");

var socketManager = new Object();

var spotifyApi = new SpotifyApi();
spotifyApi.setup();

var io = socketIo();
socketManager.io = io;

io.on("connection", function(socket){
  var pid = socket.handshake.query['pid'];
  var hostId = socket.handshake.query['hostId'];
  socket.join(pid);
  
  socket.on('get_playlist', function(data){
    spotifyApi.getPlaylist(hostId, pid, function(error, response, body){
      if (!error) {
        var playlist = JSON.parse(body);
        var tracks = new Array();

        (playlist.tracks.items).forEach(function(d){   
          var artists = new Array();

          for(var i = 0; i < d.track.artists.length; i++){
            artists.push(d.track.artists[i].name);
          }

          tracks.push({
                        id: d.track.id,
                        name: d.track.name,
                        artist: artists.join(),
                      });
        });

        socket.emit('playlist_loaded', { tracks: tracks });
      } else {
        console.log(error);
        console.log('get playlist error');
      }
    });
  })  

  socket.on('add_track', function(data){
    var track = data['track'];
    var uri = 'spotify:track:' + track.id;

    spotifyApi.addTrack(hostId, pid, uri, function(error, response, body) {
      if (error) {
        //TODO ERROR HANDLING
      } else {
        socket.to(pid).emit('playlist_changed', { track: { id: track.id,
                                                          name: track.name,
                                                          artist: track.artist,
                                                        },
                                                 status: "add"
                                               });
        socket.emit('playlist_changed', { track: { id: track.id,
                                                  name: track.name,
                                                  artist: track.artist,
                                                },
                                          status: "add"
                                        });
      }
    });    
  });

  socket.on('remove_track', function(data){
    var uri = 'spotify:track:' + data.id;

    spotifyApi.removeTrack(hostId, pid, uri, function(error, response, body) {
      if (error) {
        //TODO ERROR HANDLING
      } else {
        socket.to(pid).emit('playlist_changed', { track: { id: data['id'] },
                                               status: "remove"
                                             });
        socket.emit('playlist_changed', { track: { id: data['id'] },
                                          status: "remove"
                                        });
      }
    });    
  });

  socket.on('close_room', function(data){
    socket.to(pid).emit('kicked', {});
  });

  socket.on('disconnect', function(){    
    socket.leave(pid);
  })
});

module.exports = socketManager;