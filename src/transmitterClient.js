'use strict';
var io = require('socket.io-client');
var ss = require('socket.io-stream');
var fs = require('fs');

class TransmitterClient {

  constructor( serverInfo ) {
    var socket = io.connect(serverInfo.ip + ":" + serverInfo.port);
    TransmitterClient.socket = socket;
  }

  sendFile( fileName, _id,  partNum ) {
    var stream = ss.createStream();
    ss(TransmitterClient.socket).emit('sendFile', stream, {fileName: fileName, _id: _id, partNum: partNum});
    var f = fs.createReadStream(`Downloads/tmp/${fileName}/${fileName}.part${partNum}`).pipe(stream);
    f.on('finish',() => {
      fs.unlink(`Downloads/tmp/${fileName}/${fileName}.part${partNum}`, (err) => {
        if (err) throw err;
        console.log(`${fileName}/${fileName}.part${partNum} successfully deleted!`);
      });
      console.log('send finish!');
    });
  }

}
TransmitterClient.socket = {};

module.exports = TransmitterClient;
