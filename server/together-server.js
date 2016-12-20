'use strict';
var request = require('request');
var http = require('http');
var io = require('socket.io');

const CHUNKSIZE = 1048576

class Server {
  constructor( portNum ) {

    var server = http.createServer(function(req, res) {
      // Send HTML headers and message
      res.writeHead(404, {'Content-Type': 'text/html'});
      res.end('<h1>Aw, snap! 404</h1>');
    });
    server.listen(portNum);
    io = io.listen(server);

    // Add a connect listener
    io.sockets.on('connection', function(socket) {
      console.log('Client connected.');

      // Disconnect listener
      socket.on('disconnect', function() {
      console.log('Client disconnected.');
      });
    });

  }

  newDownload( url ) {
    request.head({url:url}, function(error, response, body) {
      console.log(`Size: ${response.headers['content-length']/1024}Kb`);
      var download = {
        url: url,
        needToDownload: response.headers['content-length']
      };
      Server.options.downloadList.push( download );
    });
  }

}
Server.options = {
  downloadList: []
};
