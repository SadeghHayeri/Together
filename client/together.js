'use strict';
var Downloader = require('downloader')
var request = require('request');
var io = require('socket.io-client');

class Together {

  constructor( serverInfo ) {

    var socket = io.connect(`${serverInfo.ip}:${serverInfo.port}`, {reconnect: true});
    socket.on('connect', function(socket) {
      console.log('ok!');
      Together.info.connect = true;
    });

    // check status and
    setTimeout(Together.imReady, 1000);

  }

  imReady() {
    
  }

}
Together.info = {
  connect: false
};

var t = new Together({
  ip: 'http://localhost',
  port: 8080
});
