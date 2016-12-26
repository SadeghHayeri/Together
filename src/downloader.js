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

    if (!fs.existsSync('Downloads/tmp'))
      fs.mkdirSync('Downloads/tmp');

    if (!fs.existsSync('Downloads/tmp/' + Downloader.options.folderName))
      fs.mkdirSync('Downloads/tmp/' + Downloader.options.folderName);

    progress( request(Downloader.options), {
      throttle: 100,
      delay: 0
    })

    .on('progress', (state) => {
      state.begin = true;
      state.complete = false;
      Downloader.currStatus = state;
    })
    .on('error', (err) => {
      console.log(err);
      // TODO: handle error
    })
    .on('end', () => {
        Downloader.callback(true);
        Downloader.currStatus.time.remaining = 0;
        Downloader.currStatus.speed = 0;
        Downloader.currStatus.percent = 1;
        Downloader.currStatus.complete = true;
    })

    .pipe(fs.createWriteStream('Downloads/tmp/' + Downloader.options.folderName + "/" + Downloader.options.fileName));

  }

  status() {
    return Downloader.currStatus;
  }

}
Downloader.options = {};
Downloader.callback = {};
Downloader.currStatus = {
  time: { elapsed: 0, remaining: 0 },
  speed: 0,
  percent: 0,
  size: { total: 0, transferred: 0 },
  begin: false,
  complete: false
};

module.exports = Downloader;
