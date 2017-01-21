'use strict';
var socket = require('socket.io');
var ss = require('socket.io-stream');
var path = require('path');
var fs = require('fs');

var progress = require('progress-stream');

class Transmitter {

  constructor( portNum, chunkSize, db ) {

    var io = socket.listen(portNum);
    io.on('connection', function(socket) {

      ss(socket).on('sendFile', function(stream, data) {
        var filename = path.basename(data.fileName);

        if (!fs.existsSync('Downloads'))
          fs.mkdirSync('Downloads');

        if (!fs.existsSync('Downloads/' + data.fileName))
          fs.mkdirSync('Downloads/' + data.fileName);


        var str = progress({ length: chunkSize });
        str.on('progress', function(progress) {
          progress.begin = true;
          Transmitter.status = progress;
        });

        var stream = stream.pipe(str).pipe(fs.createWriteStream(`Downloads/${data.fileName}/${data.fileName}.part${data.partNum}`));
        stream.on('finish', () => {

          var that = this
          db.findOne( { _id: data._id } , function (err, dbData) {
            if(err || !dbData) {
              console.log('error in receive file!');
            }

            var chunkIndex = dbData.parts.findIndex((el) => {
              return ( el.partNum == data.partNum )
            })

            dbData.parts[chunkIndex].transferred = true

            db.update({'_id': data._id}, { $set: { parts: dbData.parts } })
            db.persistence.compactDatafile()
          })

        })

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
