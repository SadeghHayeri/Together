const {ipcRenderer} = require('electron')

$(document).ready(function() {

  $('#startBtn').click( () => {
    ipcRenderer.send('newServerDialog:start', {
      name: $('#name').val(),
      download: true
    })
  })

  $('#cancelBtn').click( () => {
    ipcRenderer.send('newServerDialog:cancel')
  })

})
