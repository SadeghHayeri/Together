'use strict';
var request = require('request');
var http = require('http');
var io = require('socket.io');

const CHUNKSIZE = 1048576;
var downloadList = [];

function newDownload( url ) {

  request.head({url:url}, (error, response, body) => {
    if( !error && response.headers['content-length'] !== undefined ) {
      console.log(`Size: ${response.headers['content-length']} (${Math.round(response.headers['content-length']/1048576)}Mb)`);
      var download = {
        url: url,
        size: response.headers['content-length'],
        needToDownload: response.headers['content-length'],
        lastPart: 0
      };
      downloadList.push( download );
    } else {
      console.log('error!');
    }
  });

}

// TODO:clean this!
function getNewChunk() {

  for (var i = 0; i < downloadList.length; i++) {
    if( downloadList[i].needToDownload !== 0 ) {

      var packetSize = (downloadList[i].needToDownload>CHUNKSIZE)? CHUNKSIZE : downloadList[i].needToDownload;
      var chunk = {
        url: downloadList[i].url,
        startRange: downloadList[i].lastPart * CHUNKSIZE,
        endRange: downloadList[i].lastPart * CHUNKSIZE + packetSize - ( (downloadList[i].needToDownload>CHUNKSIZE)? 1 : 0 ),
        partNum: downloadList[i].lastPart
      }

      downloadList[i].needToDownload -= packetSize;
      downloadList[i].lastPart++;

      return chunk;

    }
  }

  return false;
}


function startServer( portNum ) {
  var server = http.createServer((req, res) => {
    res.writeHead(404, {'Content-Type': 'text/html'});
    res.end('<h1>:)</h1>');
  });
  server.listen(portNum);
  io = io.listen(server);
  console.log('server is running on port:' + portNum);

  // Add a connect listener
  io.sockets.on('connection', (socket) => {
    console.log('Client connected.');

    // listen to clients!
    socket.on('imReady', (data) => {
      var newChunk = getNewChunk();
      if( newChunk ) {
        console.log(newChunk);
        socket.emit('newChunk', newChunk);
      }
    });

    // Disconnect listener
    socket.on('disconnect', () => {
      console.log('Client disconnected.');
    });
  });
}

function main( portNum ) {
  startServer(8080);
  newDownload('http://googleshirazi.com/Content/images/googlelogo_color_272x92dp.png?v=3.5');
  newDownload('http://hdwallpapershdpics.com/wp-content/uploads/2016/05/stunning-full-hd.jpeg');
  // newDownload('http://cdn.download.ir/?b=dlir-mac&f=Smart.Converter.Pro.2.3.0.www.download.ir.rar');
  newDownload('https://www.google.com/url?sa=i&rct=j&q=&esrc=s&source=images&cd=&cad=rja&uact=8&ved=0ahUKEwjjpu2dnoPRAhWNM1AKHc49AbkQjRwIBw&url=http%3A%2F%2Fwww.deviantart.com%2Ftag%2Fiji&psig=AFQjCNFJpTiXyWSJazjQGgeQsGdZHGV5lA&ust=1482339247296096');
};
main();
