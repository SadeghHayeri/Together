var path = require('path');
var DEBUG = require('debug')('app');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

const port = process.env.PORT || 80;

var express = require("express");
var http = require("http");
var app = express();
var server = http.createServer(app).listen(port, function () {
  console.log(`Twitter app listening on port ${port}!`);
});
var io = require("socket.io")(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Handle login form
app.post('/new', function(req, res) {
    console.log(req.body.url);
    res.send('ok!');
});

// Handle 404
app.use(function(req, res) {
    DEBUG('404');
    res.send('404: Page not Found', 404);
});

// Handle 500
app.use(function(error, req, res, next) {
    DEBUG('500');
    res.send('500: Internal Server Error', 500);
});

io.on('connection', function (socket) {
    console.log('new connection!');
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});
