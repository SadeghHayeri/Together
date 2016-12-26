var concat = require('concat-files');

class Concat {
  concat( fileName, partCount ) {
    var files = []

    //TODO: check file exist
    for (var i = 0; i < partCount; i++)
      files.push(`Downloads/${fileName}/${fileName}.part${i}`)


    concat(files, `Downloads/finish/${fileName}`, (err) => {
      if (err) throw err
      console.log(fileName + ' done');
    })
  }
}
