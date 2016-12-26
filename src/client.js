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
  constructor( ip, socketPort, TransmitterPort ) {
    this.connect({ ip: 'http://' + ip, port: socketPort })
    this.transmitter = new Transmitter({ ip: 'http://' + ip, port: TransmitterPort })
    this.downloads = []
    this.transmitter = {}
  }

  checkDownload(socket) {
    socket.emit('imReady')
  }

  connect( serverInfo ) {
    var socket = io.connect(`${serverInfo.ip}:${serverInfo.port}`, {reconnect: true})

    var thisClient = this  //TODO: do this in better way
    socket.on('connect', function(socket) {
      this.on('newChunk', (chunk) => {

        var folderName = chunk.url.split("/")[chunk.url.split("/").length-1]
        var newDownload = {
          name: folderName,
          partNum: chunk.partNum,
          complete: false,
        }
        thisClient.downloads.push(newDownload)

        var downloader = new Downloader( chunk.url, chunk.startRange, chunk.endRange, folderName, chunk.partNum, () => {
          thisClient.downloads[thisClient.downloads.length-1].complete = true
          transmitter.sendFile(folderName, chunk.partNum)
          thisClient.checkDownload(this)
        })
        downloader.start()

        this.on('getStatus', () => {
          console.log(downloader.status())
          this.emit( 'status', downloader.status() )
        })

      })
      thisClient.checkDownload(this)

    })
  }
}

module.exports = { Client, SearchNetwork }

// var client = new Client('localhost', 4444, 5555)
