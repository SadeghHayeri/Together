const {ipcRenderer} = require('electron')

$(document).ready(function() {

  $('.submitBtn').click( () => {
    ipcRenderer.send('newServerDialog:start', {
      name: 'sadegh',
      download: true,
    })
  })

  $('.cancelBtn').click( () => {
    ipcRenderer.send('newServerDialog:cancel')
  })

})
