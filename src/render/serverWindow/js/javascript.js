const {ipcRenderer} = require('electron')

$(document).ready(function() {

  var areaChartData = []

  var myChart = $('#areaChart').epoch({
    type: 'time.area',
    data: areaChartData,
    axes: ['bottom', 'left'],
    ticks: { time: 10, left: 5 },
    tickFormats: { time: function(d) { return new Date(time*1000).toString() } },
    historySize: 240
  })

  function makeChart( length ) {
    areaChartData = []
    for (var i = 0; i < length; i++)
      areaChartData.push({
        label: 'a',
        values:[]
      })
    myChart.update(areaChartData)
  }

  var dataSize = 0
  function addData( newData ) {

    if( newData.length === dataSize ) {
      myChart.push(newData)
    } else {
      makeChart( newData.length )
      dataSize = newData.length
      addData( newData )
    }

  }

  setInterval( () => {
    ipcRenderer.send('serverWindow')
  }, 1000)

  var lastSize = 0
  ipcRenderer.on('serverWindow:setStatus', (event, status) => {

    var newData = []
    for (var i = 0; i < status.clients.length; i++)
      newData.push({time: status.timestamp, y: status.clients[i].speed})

    addData( newData )

    $('#workers').html(status.workers)
    $('#percent').html(status.percent)
    $('#speed').html( () => {
      if(status.speed/1048576 > 1)
        return(`${Math.round( status.speed/1048576 * 100 ) / 100} Mb`)
      return(`${Math.round( status.speed/1024 )} Kb`)
    })

  })
  ipcRenderer.once('serverWindow:setIp', (event, ip) => {
    $('#ip').html(ip)
  })
  ipcRenderer.send('serverWindow')

})
