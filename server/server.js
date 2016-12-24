'use strict';
var request = require('request');
var http = require('http');
var io = require('socket.io');
var clear = require('clear');
var Transmitter = require('./transmitter.js');
var myIp = require('ip').address();

////////////////////////////////////////////////////////////////////////////////
var path = require('path')
const electron = require('electron')

const BrowserWindow = electron.BrowserWindow
const app = electron.app
const debug = /--debug/.test(process.argv[2])
if (process.mas) app.setName('Electron APIs')
var mainWindow = null

function getStatus() {

  var status = {}

  // find percent
  var downloadedChunk = 0;
  for (var i = 0; i < clientList.length; i++)
    downloadedChunk += clientList[i].chunks.length;
  var totalChunk = 0;
  for (var i = 0; i < downloadList.length; i++)
    totalChunk += downloadList[i].partsCount;
  status.percent = Math.ceil( (downloadedChunk/totalChunk) * 100 );

  // find speed
  status.speed = 0;
  for (var i = 0; i < clientList.length; i++)
    status.speed += clientList[i].status.speed;

  status.workers = 0
  status.clients = []
  for (var i = 0; i < clientList.length; i++) {
    status.clients.push({
      id: clientList[i].id,
      chunkPercent: clientList[i].status.percent,
      speed: Math.round( clientList[i].status.speed/1024 ),
    })
    status.workers += (clientList[i].connect)? 1 : 0
  }

  status.timestamp = Date.now()
  return status
}

function createWindow () {
  var windowOptions = {
    width: 600,
    height: 393,
    title: app.getName(),
    // transparent: true,
    // resizable: false,
    frame: false,
  }

  if (process.platform === 'linux') {
    windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
  }

  mainWindow = new BrowserWindow(windowOptions)
  mainWindow.loadURL(path.join('file://', __dirname, 'gui/index.html'))

  const {ipcMain} = require('electron')
  ipcMain.once('getMeInfo', (event, arg) => {
    event.sender.send('setIp', myIp);

    setInterval( function() {
      event.sender.send('setStatus', getStatus());
    }, 1000);

  })

  // Launch fullscreen with DevTools open, usage: npm run debug
  if (debug) {
    mainWindow.webContents.openDevTools()
    mainWindow.maximize()
    require('devtron').install()
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}
app.on('ready', function () {
  createWindow()
})
////////////////////////////////////////////////////////////////////////////////

const Mb = 1048576;
const CHUNKSIZE = 10 * Mb;

var downloadList = [];
var clientList = [];

function newDownload( url ) {

  request.head({url:url}, (error, response, body) => {
    if( !error && response.headers['content-length'] !== undefined ) {
      console.log(`Size: ${response.headers['content-length']} (${Math.round(response.headers['content-length']/1048576)}Mb)`);
      var download = {
        url: url,
        size: response.headers['content-length'],
        needToDownload: response.headers['content-length'],
        lastPart: 0,
        partsCount: Math.ceil( response.headers['content-length'] / CHUNKSIZE ),
        parts: []
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

      downloadList[i].parts.push({
        partNum: downloadList[i].lastPart,
        startRange:downloadList[i].lastPart * CHUNKSIZE,
        endRange: downloadList[i].lastPart * CHUNKSIZE + packetSize - ( (downloadList[i].needToDownload>CHUNKSIZE)? 1 : 0 ),
        receive: false
      });

      return chunk;
    }
  }

  return false;
}

function newConnection( id ) {
  clientList.push({
    id: id,
    status: {begin: false, speed: 0},
    chunks: [],
    connect: true
  });
}

function addNewChunk( id, chunk ) {
  for (var i = 0; i < clientList.length; i++) {
    if( clientList[i].id === id ) {

      clientList[i].begin = true;
      clientList[i].chunks.push(chunk);

    }
  }
}

function addNewStatus( id, status ) {
  for (var i = 0; i < clientList.length; i++) {
    if( clientList[i].id === id ) {

      clientList[i].status = status;

    }
  }
}

function disconnectClient( id ) {
  for (var i = 0; i < clientList.length; i++) {
    if( clientList[i].id === id ) {

      clientList[i].connect = false;
      clientList[i].status.speed = 0;
      clientList[i].percent = 0;
      clientList[i].complete = false;

    }
  }
}

function startServer( socketPort, TransmitterPort ) {
  var server = http.createServer((req, res) => {
    res.writeHead(404, {'Content-Type': 'text/html'});
    res.end('<h1>:)</h1>');
  });
  server.listen(socketPort);
  io = io.listen(server);
  console.log('server is running on port:' + socketPort);

  // Add a connect listener
  io.sockets.on('connection', (socket) => {
    console.log(`Client connected. (${socket.id})`);

    newConnection(socket.id);

    // listen to clients!
    socket.on('imReady', (data) => {
      var newChunk = getNewChunk();
      if( newChunk ) {
        addNewChunk( socket.id, newChunk );
        socket.emit('newChunk', newChunk);
      }
    });

    // send 'getStatus' to client to request download status!
    var statusTimer = setInterval( function() { socket.emit('getStatus'); } , 100);
    socket.on('status', (status) => {
      addNewStatus( socket.id, status );
    });

    // Disconnect listener
    socket.on('disconnect', () => {
      clearInterval(statusTimer);
      console.log(":::" + socket.id);
      disconnectClient(socket.id);
      console.log('Client disconnected.');
    });
  });

  new Transmitter(TransmitterPort, CHUNKSIZE);
}

// setInterval( () => {printStatus()} , 100);
startServer(4444, 5555);

// newDownload('http://googleshirazi.com/Content/images/googlelogo_color_272x92dp.png?v=3.5');
// newDownload('http://hdwallpapershdpics.com/wp-content/uploads/2016/05/stunning-full-hd.jpeg');
// newDownload('http://cdn.download.ir/?b=dlir-mac&f=Smart.Converter.Pro.2.3.0.www.download.ir.rar');
// newDownload('https://www.google.com/url?sa=i&rct=j&q=&esrc=s&source=images&cd=&cad=rja&uact=8&ved=0ahUKEwjjpu2dnoPRAhWNM1AKHc49AbkQjRwIBw&url=http%3A%2F%2Fwww.deviantart.com%2Ftag%2Fiji&psig=AFQjCNFJpTiXyWSJazjQGgeQsGdZHGV5lA&ust=1482339247296096');
newDownload('http://ir.30nama.download/movies/t/Tomorrowland_2015_DUBBED_1080p_x265_BluRay_30nama_30NAMA.mkv');
