const {ipcRenderer} = require('electron')

$(document).ready(function() {

  setInterval(function () {
    ipcRenderer.send('findServerWindow')
  }, 5000);

  var lastServers = []
  ipcRenderer.on('findServerWindow:servers', (event, servers) => {
    if( servers.length !== 0 ) {

      if( servers != lastServers ) {
        console.log(servers != lastServers)
        console.log(servers)
        console.log(lastServers)
        var serversBox = ""
        for (var i = 0; i < servers.length; i++) {
          serversBox +=
            `<div id="${servers[i].ip}" class="server">
              <p class="left">${servers[i].name}</p>
              <p class="right">${servers[i].ip}</p>
            </div>`
        }
        $('#serversBox').html(serversBox)
        lastServers = servers
      }

    } else {
    }
  })
})
