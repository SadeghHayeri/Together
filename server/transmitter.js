'use strict';
var socket = require('socket.io');
var ss = require('socket.io-stream');
var path = require('path');
var fs = require('fs');

class Transmitter {

  constructor( portNum ) {

    var io = socket.listen(portNum);
    io.on('connection', function(socket) {
      console.log('new connection!');

      ss(socket).on('sendFile', function(stream, data) {
        console.log('new file :)');
        var filename = path.basename(data.name);

        if (!fs.existsSync('Downloads'))
          fs.mkdirSync('Downloads');

        if (!fs.existsSync('Downloads/' + data.fileName))
          fs.mkdirSync('Downloads/' + data.fileName);

        stream.pipe(fs.createWriteStream(`Downloads/${data.fileName}/${data.fileName}.part${data.partNum}`));
      });

    });
    console.log('Transmitter is running on port: ' + portNum);

  }

}

module.exports = Transmitter;

var tt = new Transmitter(9090);
