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

    console.log(Downloader.options);

    if (!fs.existsSync(Downloader.options.folderName))
      fs.mkdirSync(Downloader.options.folderName);

    progress( request(Downloader.options), {
      throttle: 100,
      delay: 0
    })

    .on('progress', function (state) {
      state.begin = true;
      Downloader.currStatus = state;
      console.log(Downloader.currStatus);
    })
    .on('error', function (err) {
      console.log(err);
      // TODO: handle error
    })
    .on('end', function () {
        Downloader.callback(true);
    })

    .pipe(fs.createWriteStream(Downloader.options.folderName + "/" + Downloader.options.fileName));

  }

  status() {
    return Downloader.currStatus;
  }

}
Downloader.options = {};
Downloader.callback = {};
Downloader.currStatus = {begin: false};

module.exports = Downloader;

// var newDownload = new Downloader('http://cdn.p30download.com/?b=p30dl-mobile&f=ProCapture.v2.0.6_p30download.com.apk',
// 0,
// 2000000,
// 'Downloads',
// 3,
// function() {
//   console.log('yess!');
// });
// newDownload.start();


// function callback(error, response, body) {
//   if (!error && response.statusCode == 206) {
//   }
//   console.log(response.headers['content-length']);
// }
// request.head(options, callback)
// // progress( request.head(options, callback) );
