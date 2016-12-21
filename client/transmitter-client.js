'use strict';
var io = require('socket.io-client');
var ss = require('socket.io-stream');
var fs = require('fs');

class TransmitterClient {

  constructor( serverInfo ) {
    var socket = io.connect(serverInfo.ip + ":" + serverInfo.port);
    TransmitterClient.socket = socket;
  }

  sendFile( fileName, partNum ) {
    var stream = ss.createStream();
    ss(TransmitterClient.socket).emit('sendFile', stream, {fileName: fileName, partNum: partNum});
    fs.createReadStream(`Downloads/${fileName}/${fileName}.part${partNum}`).pipe(stream);
  }

}
TransmitterClient.socket = {};

var t = new TransmitterClient({ ip: 'http://localhost', port: 9090 });
t.sendFile( 'stunning-full-hd.jpeg', 0 );
t.sendFile( 'googlelogo_color_272x92dp.png?v=3.5', 0 );
