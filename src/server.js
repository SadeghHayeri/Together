'use strict'
var Transmitter = require('./transmitter.js')
var request = require('request')
var io = require('socket.io')
var clear = require('clear')
var http = require('http')
var fs = require('fs')
var bonjour = require('bonjour')()

class Server {
  constructor( socketPort, transmitterPort, bonjourPort, chunkSize, name ) {

    // advertise an HTTP server
    bonjour.publish({ name: 'Together|' + name, type: 'http', port: bonjourPort })

    var server = http.createServer((req, res) => {
      res.writeHead(404, {'Content-Type': 'text/html'})
      res.end(':)')
    })
    server.listen(socketPort)
    io = io.listen(server)
    console.log('server is running on port:' + socketPort)

    // Add a connect listener
    io.sockets.on('connection', (socket) => {
      console.log(`Client connected. (${socket.handshake.address} - ${socket.id})`)
      this.newConnection(socket.id)

      // listen to clients!
      socket.on('imReady', (data) => {
        var newChunk = this.getNewChunk()
        if( newChunk ) {
          this.addNewChunk( socket.id, newChunk )
          socket.emit('newChunk', newChunk)
        }
      })

      // send 'getStatus' to client to request download status!
      var statusTimer = setInterval( function() { socket.emit('getStatus') } , 100)
      socket.on('status', (status) => {
        this.addNewStatus( socket.id, status )
      })

      // Disconnect listener
      socket.on('disconnect', () => {
        clearInterval(statusTimer)
        this.disconnectClient(socket.id)
        console.log(`Client disconnected. (${socket.handshake.address} - ${socket.id})`)
      })
    })

    new Transmitter(transmitterPort, chunkSize)
    this.downloadList = []
    this.clientList = []
    this.chunkSize = chunkSize
  }

  getStatus() {
    var status = {}

    // find percent
    var downloadedChunk = 0;
    for (var i = 0; i < this.clientList.length; i++)
      downloadedChunk += this.clientList[i].chunks.length;
    var totalChunk = 0;
    for (var i = 0; i < this.downloadList.length; i++)
      totalChunk += this.downloadList[i].partsCount;
    status.percent = Math.ceil( (downloadedChunk/totalChunk) * 100 );

    // find speed
    status.speed = 0;
    for (var i = 0; i < this.clientList.length; i++)
      status.speed += this.clientList[i].status.speed;

    status.workers = 0
    status.clients = []
    for (var i = 0; i < this.clientList.length; i++) {
      status.clients.push({
        id: this.clientList[i].id,
        chunkPercent: this.clientList[i].status.percent,
        speed: Math.round( this.clientList[i].status.speed/1024 ),
      })
      status.workers += (this.clientList[i].connect)? 1 : 0
    }

    status.timestamp = Date.now()
    return status
  }


  newDownload( url ) {
    request.head({url:url}, (error, response, body) => {
      if( !error && response.headers['content-length'] !== undefined ) {
        console.log(`Size: ${response.headers['content-length']} (${Math.round(response.headers['content-length']/1048576)}Mb)`)
        var download = {
          url: url,
          size: response.headers['content-length'],
          needToDownload: response.headers['content-length'],
          lastPart: 0,
          partsCount: Math.ceil( response.headers['content-length'] / this.chunkSize ),
          parts: []
        }
        this.downloadList.push( download )
      } else {
        console.log('error!')
      }
    })
  }

  getNewChunk() {
    for (var i = 0; i < this.downloadList.length; i++) {
      if( this.downloadList[i].needToDownload !== 0 ) {

        var packetSize = (this.downloadList[i].needToDownload>this.chunkSize)? this.chunkSize : this.downloadList[i].needToDownload
        var chunk = {
          url: this.downloadList[i].url,
          startRange: this.downloadList[i].lastPart * this.chunkSize,
          endRange: this.downloadList[i].lastPart * this.chunkSize + packetSize - ( (this.downloadList[i].needToDownload>this.chunkSize)? 1 : 0 ),
          partNum: this.downloadList[i].lastPart
        }

        this.downloadList[i].needToDownload -= packetSize
        this.downloadList[i].lastPart++

        this.downloadList[i].parts.push({
          partNum: this.downloadList[i].lastPart,
          startRange:this.downloadList[i].lastPart * this.chunkSize,
          endRange: this.downloadList[i].lastPart * this.chunkSize + packetSize - ( (this.downloadList[i].needToDownload>this.chunkSize)? 1 : 0 ),
          receive: false
        })

        return chunk
      }
    }

    return false
  }

  newConnection( id ) {
    this.clientList.push({
      id: id,
      status: {begin: false, speed: 0},
      chunks: [],
      connect: true
    })
  }

  disconnectClient( id ) {
    for (var i = 0; i < this.clientList.length; i++) {
      if( this.clientList[i].id === id ) {

        this.clientList[i].connect = false
        this.clientList[i].status.speed = 0
        this.clientList[i].percent = 0
        this.clientList[i].complete = false

      }
    }
  }

  addNewChunk( id, chunk ) {
    for (var i = 0; i < this.clientList.length; i++) {
      if( this.clientList[i].id === id ) {
        this.clientList[i].begin = true
        this.clientList[i].chunks.push(chunk)
      }
    }
  }

  addNewStatus( id, status ) {
    for (var i = 0; i < this.clientList.length; i++) {
      if( this.clientList[i].id === id ) {
        this.clientList[i].status = status
      }
    }
  }

}

module.exports = Server
