'use strict';
var progress = require('request-progress');
var request = require('request');
var fs = require('fs');

class Downloader {

  constructor( url, startRange, endRange, folderName, partNum, callback ) {
    Downloader.options.fileName = url.split("/")[url.split("/").length-1] + `.part${partNum}`;
    Downloader.options.folderName = folderName;
    Downloader.options.url = url;
    Downloader.options.headers = {'Range': `bytes=${startRange}-${endRange}`};
    Downloader.callback = callback;
  }

  start() {

    if (!fs.existsSync('Downloads'))
      fs.mkdirSync('Downloads');


    if (!fs.existsSync('Downloads/' + Downloader.options.folderName))
      fs.mkdirSync('Downloads/' + Downloader.options.folderName);

    progress( request(Downloader.options), {
      throttle: 100,
      delay: 0
    })

    .on('progress', (state) => {
      state.begin = true;
      Downloader.currStatus = state;
    })
    .on('error', (err) => {
      console.log(err);
      // TODO: handle error
    })
    .on('end', () => {
        Downloader.callback(true);
    })

    .pipe(fs.createWriteStream('Downloads/' + Downloader.options.folderName + "/" + Downloader.options.fileName));

  }

  status() {
    return Downloader.currStatus;
  }

}
Downloader.options = {};
Downloader.callback = {};
Downloader.currStatus = {begin: false};

module.exports = Downloader;
