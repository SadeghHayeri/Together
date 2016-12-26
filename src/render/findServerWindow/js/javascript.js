const {ipcRenderer} = require('electron')

$(document).ready(function() {

  setInterval(function () {
    ipcRenderer.send('findServerWindow')
  }, 2000);

  var lastServers = []
  ipcRenderer.on('findServerWindow:servers', (event, servers) => {
    if( servers.length !== 0 ) {

      if( servers != lastServers ) {
        var serversBox = ""
        for (var i = 0; i < servers.length; i++) {
          serversBox +=
            `<div onClick="ipcRenderer.send('findServerWindow:connect', '${servers[i].ip}' )" id="${servers[i].ip}" class="server">
              <p class="left">${servers[i].name}</p>
              <p class="right">${servers[i].ip}</p>
            </div>`
        }
        $('#serversBox').html(serversBox)
        lastServers = servers
      }

    } else {
      //TODO: server not found!
    }
  })

  $('.connectBtn').click( () => {
    ipcRenderer.send( 'findServerWindow:connect', $('.connectText').val() )
  })

})
