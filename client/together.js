'use strict';
var Downloader = require('./downloader.js')
var request = require('request');
var io = require('socket.io-client');
var Transmitter = require('./transmitterClient.js');

////////////////////////////////////////////////////////////////////////////////
var path = require('path');
const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const app = electron.app
const debug = /--debug/.test(process.argv[2])
if (process.mas) app.setName('Electron APIs')
var mainWindow = null

function createWindow () {
  var windowOptions = {
    width: 150,
    height: 100,
    title: app.getName(),
  }

  if (process.platform === 'linux') {
    windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
  }

  mainWindow = new BrowserWindow(windowOptions)
  mainWindow.loadURL(path.join('file://', __dirname, '/index.html'))

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

      var downloader = new Downloader( chunk.url, chunk.startRange, chunk.endRange, folderName, chunk.partNum, () => {
        downloads[downloads.length-1].complete = true;
        transmitter.sendFile(folderName, chunk.partNum);
        checkDownload(this);
      });
      downloader.start();

      this.on('getStatus', () => {
        this.emit( 'status', downloader.status() );
      });

    });
    checkDownload(this);

  });

}

function start( ip, socketPort, TransmitterPort ) {
  connect({ ip: 'http://' + ip, port: socketPort });
  transmitter = new Transmitter({ ip: 'http://' + ip, port: TransmitterPort });
}

start( 'localhost', 5555, 6666);
