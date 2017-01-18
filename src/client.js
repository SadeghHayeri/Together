'use strict'
var Downloader = require('./downloader.js')
var request = require('request')
var io = require('socket.io-client')
var Transmitter = require('./transmitterClient.js')
var bonjour = require('bonjour')()

class SearchNetwork {

  constructor() {
    this.serverList = []
    this.findServers();
    this.findInterval = setInterval(() => {this.findServers()}, 2000);
  }

  getServerList() {
    return this.serverList.map( data => {
      return {
        name: data.name.substring(9),
        ip: data.referer.address
      }
    })
  }

  findServers() {
    var that = this
    bonjour.find({ type: 'http' }, function (service) {

      if( service.name.split('|')[0] === 'Together' ) {
        var index = that.serverList.findIndex( (data) => {
          return data.referer.address === service.referer.address
        })

        if( index === -1 )
          that.serverList.push( service )
        else
          that.serverList[index] = service

      }
    })
  }

}


class Client {
  constructor( ip, socketPort, transmitterPort ) {
    this.connect({ ip: 'http://' + ip, port: socketPort })
    this.transmitter = new Transmitter({ ip: 'http://' + ip, port: transmitterPort })
    this.downloads = []
    this.inDownload = false
  }

  checkDownload(socket) {
    if( !this.inDownload )
      socket.emit('imReady')
  }

  connect( serverInfo ) {
    var socket = io.connect(`${serverInfo.ip}:${serverInfo.port}`, {reconnect: true})

    var that = this
    socket.on('connect', function(socket) {
      this.on('newChunk', (chunk) => {


        var folderName = chunk.url.split("/")[chunk.url.split("/").length-1]
        var newDownload = {
          name: folderName,
          partNum: chunk.partNum,
          complete: false,
        }
        that.downloads.push(newDownload)
        that.inDownload = true

        var downloader = new Downloader( chunk.url, chunk.startRange, chunk.endRange, folderName, chunk.partNum, () => {
          that.inDownload = false
          that.downloads[that.downloads.length-1].complete = true
          this.emit('downloadComplete', chunk)
          that.transmitter.sendFile(folderName, chunk._id, chunk.partNum)
          that.checkDownload(this)
        })
        downloader.start()

        this.on('getStatus', () => {
          this.emit( 'status', downloader.status() )
        })

      })

      setInterval( () => { that.checkDownload(this) }, 1000);

    })
  }
}

module.exports = { Client, SearchNetwork }

// var client = new Client('localhost', 4444, 5555)
