'use strict';
var socket = require('socket.io');
var ss = require('socket.io-stream');
var path = require('path');
var fs = require('fs');

var progress = require('progress-stream');

class Transmitter {

  constructor( portNum, CHUNKSIZE ) {

    var io = socket.listen(portNum);
    io.on('connection', function(socket) {

      ss(socket).on('sendFile', function(stream, data) {
        var filename = path.basename(data.fileName);

        if (!fs.existsSync('Downloads'))
          fs.mkdirSync('Downloads');

        if (!fs.existsSync('Downloads/' + data.fileName))
          fs.mkdirSync('Downloads/' + data.fileName);


        var str = progress({ length: CHUNKSIZE });
        str.on('progress', function(progress) {
          progress.begin = true;
          Transmitter.status = progress;
        });

        stream.pipe(str)
              .pipe(fs.createWriteStream(`Downloads/${data.fileName}/${data.fileName}.part${data.partNum}`));

      });

    });
    console.log('Transmitter is running on port: ' + portNum);

  }

  getStatus() {
    return Transmitter.status;
  }
}
Transmitter.status = {
  begin: false
}

module.exports = Transmitter;
