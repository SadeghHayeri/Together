const {ipcRenderer} = require('electron')

$(document).ready(function() {

  setInterval( () => {
    ipcRenderer.send( 'downloadHistoryDialog' )
  }, 5000)

  ipcRenderer.on('downloadHistoryDialog:downloadHistory', (event, status) => {
    var downloadsDom = ""

    for (var i = 0; i < status.length; i++) {
      downloadsDom += '<div style="box-shadow: -'
      downloadsDom += 590 - status[i].percent * 590
      downloadsDom += 'px 0px 0px 0px rgba(0, 0, 0, .2) inset;" id="'
      downloadsDom += status[i]._id
      downloadsDom += '" class="download '
      downloadsDom += (status[i].status == 'Complete')? 'white' : ( (status[i].status == 'Pause')? "red" : "green")
      downloadsDom += '"><div class="img"></div><div class="box"><div class="name">'
      downloadsDom += status[i].name
      downloadsDom += '</div><div class="size">'
      downloadsDom += status[i].percentString
      downloadsDom += '</div></div><div class="speed">'
      downloadsDom += status[i].speed
      downloadsDom += '</div></div>'
    }

    $('#serversBox').html(downloadsDom)
  })

  $('#startBtn').click( () => {
    ipcRenderer.send( 'downloadHistoryDialog:addUrl', $('#url').val() )
  })

  $('#cancelBtn').click( () => {
    ipcRenderer.send('downloadHistoryDialog:cancel')
  })

})
