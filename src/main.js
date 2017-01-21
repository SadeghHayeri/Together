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
var Server = require('./server.js')

var config = require('./config.js')

var mainWindow = null
var findServerWindow = null
var serverWindow = null
var clientWindow = null
var newServerDialog = null
var newDownloadDialog = null

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

  windowOptions.width = 150
  windowOptions.height = 150
  clientWindow = new BrowserWindow(windowOptions)
  clientWindow.loadURL(path.join('file://', __dirname, 'render/clientWindow/index.html'))

  windowOptions.width = 420
  windowOptions.height = 190
  windowOptions.parent = mainWindow
  windowOptions.modal = true
  newServerDialog = new BrowserWindow(windowOptions)
  newServerDialog.loadURL(path.join('file://', __dirname, 'render/newServerDialog/index.html'))

  windowOptions.parent = serverWindow
  newDownloadDialog = new BrowserWindow(windowOptions)
  newDownloadDialog.loadURL(path.join('file://', __dirname, 'render/newDownloadDialog/index.html'))

  // close windows
  mainWindow.on('closed', function () {mainWindow = null})
  findServerWindow.on('closed', function () {findServerWindow = null})
  serverWindow.on('closed', function () {serverWindow = null})
  clientWindow.on('closed', function () {clientWindow = null})
  newServerDialog.on('closed', function () {newServerDialog = null})
  newDownloadDialog.on('closed', function () {newDownloadDialog = null})

}

function moveTo( windowName ) {
  if( currWindow )
    currWindow.hide()
  currWindow = windowName
  windowName.show()
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

  var server = null
  var client = null

  // mainWindow ////////////////////////////////////////////////////////////////
  ipcMain.on('selectWindows', (event, windowName) => {
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
      case 'newServerDialog':
        newServerDialog.show()
        break;
      default:
        console.log('error!');
        moveTo(mainWindow)
    }
  })
  //////////////////////////////////////////////////////////////////////////////

  // newServerDialog ///////////////////////////////////////////////////////////
  ipcMain.on('newServerDialog:start', (event, arg) => {
    if( currWindow === mainWindow ) {
      server = new Server(config.connection.socketPort, config.connection.transmitterPort, config.connection.bonjourPort, config.chunkSize, arg.name)
      newServerDialog.hide()
      moveTo(serverWindow)
      if(arg.download)
        client = new Client( myIp, config.connection.socketPort, config.connection.transmitterPort );
    }
  })

  ipcMain.on('newServerDialog:cancel', (event, arg) => {
    if( currWindow === mainWindow ) {
      newServerDialog.hide()
    }
  })
  //////////////////////////////////////////////////////////////////////////////


  // findServerWindow //////////////////////////////////////////////////////////
  var searchNetwork = new SearchNetwork()
  ipcMain.on('findServerWindow', (event, arg) => {
    if( currWindow === findServerWindow ) {
      event.sender.send('findServerWindow:servers', searchNetwork.getServerList());
    }
  })

  ipcMain.on('findServerWindow:connect', (event, ip) => {
    client = new Client( ip, config.connection.socketPort, config.connection.transmitterPort );
    moveTo(clientWindow)
  })
  //////////////////////////////////////////////////////////////////////////////

  // serverWindow //////////////////////////////////////////////////////////////
  ipcMain.on('serverWindow', (event, arg) => {
    if( currWindow === serverWindow ) {
      // console.log(server.getStatus());
      if( currWindow === serverWindow ) {
        event.sender.send('serverWindow:setIp', myIp);
        event.sender.send('serverWindow:setStatus', server.getStatus());
      }
    }
  })

  ipcMain.on('serverWindow:newDownload', (event, arg) => {
    if( currWindow === serverWindow ) {
      newDownloadDialog.show()
    }
  })
  //////////////////////////////////////////////////////////////////////////////

  // newDownloadDialog /////////////////////////////////////////////////////////
  ipcMain.on('newDownloadDialog:addUrl', (event, url) => {
    if( currWindow === serverWindow ) {
      server.newDownload(url)
      newDownloadDialog.hide()
    }
  })

  ipcMain.on('newDownloadDialog:cancel', (event, arg) => {
    if( currWindow === serverWindow ) {
      newDownloadDialog.hide()
    }
  })
  //////////////////////////////////////////////////////////////////////////////

})
