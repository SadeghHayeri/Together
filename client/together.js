'use strict';
var Downloader = require('./downloader.js')
var request = require('request');
var io = require('socket.io-client');
var Transmitter = require('./transmitterClient.js');

var downloads = [];
var transmitter = {};

function checkDownload(socket) {
  socket.emit('imReady');
}

function connect( serverInfo ) {

  var socket = io.connect(`${serverInfo.ip}:${serverInfo.port}`, {reconnect: true});
  socket.on('connect', function(socket) {
    this.on('newChunk', (chunk) => {

      var folderName = chunk.url.split("/")[chunk.url.split("/").length-1];
      var newDownload = {
        name: folderName,
        partNum: chunk.partNum,
        complete: false,
      }
      downloads.push(newDownload);

      new Downloader( chunk.url, chunk.startRange, chunk.endRange, folderName, chunk.partNum, () => {
        downloads[downloads.length-1].complete = true;
        transmitter.sendFile(folderName, chunk.partNum);
        checkDownload(this);
      }).start();

    });
    checkDownload(this);
  });

}

function start( ip, socketPort, TransmitterPort ) {
  connect({ ip: ip, port: socketPort });
  transmitter = new Transmitter({ ip: ip, port: TransmitterPort });
}

start( 'http://localhost', 8888, 9999);
