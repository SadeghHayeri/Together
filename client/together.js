'use strict';
var Downloader = require('./downloader.js')
var request = require('request');
var io = require('socket.io-client');

function checkDownload(socket) {
  socket.emit('imReady');
}

function connect( serverInfo ) {

  var socket = io.connect(`${serverInfo.ip}:${serverInfo.port}`, {reconnect: true});
  socket.on('connect', function(socket) {

    this.on('newChunk', (chunk) => {
      var folderName = chunk.url.split("/")[chunk.url.split("/").length-1];
      var currDownload = new Downloader( chunk.url, chunk.startRange, chunk.endRange, folderName, chunk.partNum, () => {
        checkDownload(this);
      });
      currDownload.start();
    });
    checkDownload(this);

  });

}

connect({ ip: 'http://localhost', port: 8080 });
