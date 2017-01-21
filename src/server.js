'use strict'
var Transmitter = require('./transmitter.js')
var request = require('request')
var io = require('socket.io')
var clear = require('clear')
var http = require('http')
var fs = require('fs')
var bonjour = require('bonjour')()
var Datastore = require('nedb')

class Server {
  constructor( socketPort, transmitterPort, bonjourPort, chunkSize, name ) {
    this.db = new Datastore({ filename: 'together.db', autoload: true });

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
    var that = this
    io.sockets.on('connection', (socket) => {
      console.log(`Client connected. (${socket.handshake.address} - ${socket.id})`)
      this.newConnection(socket.id)

      // listen to clients!
      socket.on('imReady', (data) => {
        this.getNewChunk( socket.id, (newChunk) => {
          console.log('***********');
          console.log(newChunk);
          console.log('***********');
          if( newChunk ) {
            this.addNewChunk( socket.id, newChunk )
            socket.emit('newChunk', newChunk)
          }
        })
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

      socket.on('downloadComplete', (chunk) => {
        that.setDownloadComplete( chunk )
      })
    })

    new Transmitter(transmitterPort, chunkSize, this.db)
    this.downloadList = []
    this.clientList = []
    this.chunkSize = chunkSize
  }

  setDownloadComplete( data ) {
    var that = this
    this.db.findOne( { _id: data._id } , function (err, dbData) {
      if(err || !dbData) {
        console.log('error in receive file!');
      }

      var chunkIndex = dbData.parts.findIndex((el) => {
        return ( el.partNum == data.partNum )
      })

      dbData.parts[chunkIndex].done = true

      that.db.update({'_id': data._id}, { $set: { parts: dbData.parts } })
      that.db.persistence.compactDatafile()
    })
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
          parts: []
        }
        this.db.insert( download, (err, key) => {

          if(err) {
            console.log('there is an error with downloader!');
          } else {
            var partsCount = Math.ceil( response.headers['content-length'] / this.chunkSize )
            var downloaded = 0
            for (var i = 0; i < partsCount; i++) {
              var packetSize = (download.size - downloaded > this.chunkSize)? this.chunkSize : (download.size - downloaded)
              var chunk = {
                partNum: i,
                startRange: downloaded,
                endRange: downloaded + packetSize,
                workerId: 'undefined',
                done: false,
                transferred: false
              }
              this.db.update({ _id: key._id }, { $push: { parts: chunk } });
              downloaded += packetSize + 1
            }
          }
          this.db.persistence.compactDatafile()

          console.log(`newDownload added! (${key._id})`);
        })
      } else {
        console.log('error!')
      }
    })
  }

  getNewChunk(workerId, callback) {

    var that = this
    this.db.findOne( { 'parts.workerId': 'undefined', 'parts.done': false }, function (err, data) {
      if(err || !data) {
        return callback(false)
      }

      var chunkIndex = data.parts.findIndex((el) => {
        return (el.workerId) == 'undefined' && (el.done == false)
      })

      var chunk = {
        _id: data._id,
        url: data.url,
        partNum: data.parts[chunkIndex].partNum,
        startRange: data.parts[chunkIndex].startRange,
        endRange: data.parts[chunkIndex].endRange
      }

      data.parts[chunkIndex].workerId = workerId
      // var index = 'parts.' + chunkIndex.toString() + '.workerId'
      that.db.update({'_id': data._id}, { $set: { parts: data.parts } })
      that.db.persistence.compactDatafile()

      return callback(chunk)

    })

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

    var that = this
    this.db.findOne( { $or: [{ 'parts.workerId': id, 'parts.done': false }, { 'parts.workerId': id, 'parts.done': true, 'parts.transferred': false }] } , function (err, data) {
      if(err || !data) {
        return callback(false)
      }

      var chunkIndex = data.parts.findIndex((el) => {
        return ( (el.workerId) == id && (el.done == false) ) || ( (el.workerId) == id && (el.done == true) && (el.transferred == false) )
      })

      data.parts[chunkIndex].workerId = 'undefined'
      data.parts[chunkIndex].done = false
      data.parts[chunkIndex].transferred = false

      that.db.update({'_id': data._id}, { $set: { parts: data.parts } })
      that.db.persistence.compactDatafile()
    })

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
