var path = require('path')
const electron = require('electron')

const BrowserWindow = electron.BrowserWindow
const {ipcMain} = require('electron')
const app = electron.app
const debug = /--debug/.test(process.argv[2])
if (process.mas) app.setName('Electron APIs')
var fs = require('fs')
var myIp = require('ip').address()
var {Client, SearchNetwork} = require('./client.js')

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// function getStatus() {
//
//   var status = {}
//
//   // find percent
//   var downloadedChunk = 0;
//   for (var i = 0; i < clientList.length; i++)
//     downloadedChunk += clientList[i].chunks.length;
//   var totalChunk = 0;
//   for (var i = 0; i < downloadList.length; i++)
//     totalChunk += downloadList[i].partsCount;
//   status.percent = Math.ceil( (downloadedChunk/totalChunk) * 100 );
//
//   // find speed
//   status.speed = 0;
//   for (var i = 0; i < clientList.length; i++)
//     status.speed += clientList[i].status.speed;
//
//   status.workers = 0
//   status.clients = []
//   for (var i = 0; i < clientList.length; i++) {
//     status.clients.push({
//       id: clientList[i].id,
//       chunkPercent: clientList[i].status.percent,
//       speed: Math.round( clientList[i].status.speed/1024 ),
//     })
//     status.workers += (clientList[i].connect)? 1 : 0
//   }
//
//   status.timestamp = Date.now()
//   return status
// }
var mainWindow = null
var findServerWindow = null
var serverWindow = null
var clientWindow = null

var currWindow = null

function createWindows() {

  var windowOptions = {
    title: 'Together',
    resizable: (debug)? true : false,
    frame: false,
    backgroundColor: '#001622',
    show: false
  }

  if (process.platform === 'linux') {
    windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
  }

  windowOptions.width = 655
  windowOptions.height = 319
  mainWindow = new BrowserWindow(windowOptions)
  mainWindow.loadURL(path.join('file://', __dirname, 'render/mainWindow/index.html'))

  windowOptions.width = 655
  windowOptions.height = 371
  findServerWindow = new BrowserWindow(windowOptions)
  findServerWindow.loadURL(path.join('file://', __dirname, 'render/findServerWindow/index.html'))

  windowOptions.width = 655
  windowOptions.height = 393
  serverWindow = new BrowserWindow(windowOptions)
  serverWindow.loadURL(path.join('file://', __dirname, 'render/serverWindow/index.html'))

  windowOptions.width = 300
  windowOptions.height = 200
  clientWindow = new BrowserWindow(windowOptions)
  clientWindow.loadURL(path.join('file://', __dirname, 'render/clientWindow/index.html'))

  // close windows
  mainWindow.on('closed', function () {mainWindow = null})
  findServerWindow.on('closed', function () {findServerWindow = null})
  serverWindow.on('closed', function () {serverWindow = null})
  clientWindow.on('closed', function () {clientWindow = null})

}

function moveTo( windowName ) {
  windowName.show()
  if( currWindow )
    currWindow.hide()
  currWindow = windowName
  if (debug) {
    currWindow.webContents.openDevTools()
    currWindow.maximize()
    // require('devtron').install()
  }
}

app.on('ready', function () {
  createWindows()

  // show mainWindow in start
  mainWindow.once('ready-to-show', () => {
    moveTo(mainWindow)
  })

  // change windows
  ipcMain.once('selectWindows', (event, windowName) => {
    switch (windowName) {
      case 'findServerWindow':
        moveTo(findServerWindow)
        break;
      case 'mainWindow':
        moveTo(mainWindow)
        break;
      case 'serverWindow':
        moveTo(serverWindow)
        break;
      default:
        console.log('error!');
        moveTo(mainWindow)
    }
  })

  // get info for serverWindow
  var searchNetwork = new SearchNetwork()
  ipcMain.on('findServerWindow', (event, arg) => {
    if( currWindow === findServerWindow ) {
      event.sender.send('findServerWindow:servers', searchNetwork.getServerList());
    }
  })

  ipcMain.on('findServerWindow:connect', (event, ip) => {
    var client = new Client( ip, config.connection.socketPort, config.connection.transmitterPort );
    moveTo(clientWindow)
  })

  // get info for serverWindow
  ipcMain.on('serverWindow', (event, arg) => {
    if( currWindow === serverWindow ) {
      event.sender.send('serverWindow:setIp', myIp);
      event.sender.send('serverWindow:setStatus', getStatus());
    }
  })

})
