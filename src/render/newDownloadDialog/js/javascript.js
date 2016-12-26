const {ipcRenderer} = require('electron')

$(document).ready(function() {

  $('#startBtn').click( () => {
    ipcRenderer.send( 'newDownloadDialog:addUrl', $('#url').val() )
  })

  $('#cancelBtn').click( () => {
    ipcRenderer.send('newDownloadDialog:cancel')
  })

})
