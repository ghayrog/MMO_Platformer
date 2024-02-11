const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const adminRoutes = require('./routes/admin');
const playerRoutes = require('./routes/player');
const app = express();
const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server);

const gameServer = require('./engine/server.js');
const game = new gameServer.Game(io);

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

app.use(adminRoutes);
app.use(playerRoutes);

app.use((req, res, next) => {
	res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

server.listen(80);


//server.listen(80);

/*
app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html');
});

users = [];
connections = [];

io.sockets.on('connection', function(socket){
	console.log("Connect");
	connections.push(socket);

	socket.on('disconnect', function(data) {
		console.log("Disconnect");
		connections.splice(connections.indexOf(socket), 1);
	});

	socket.on('send mess', function(data) {
		io.sockets.emit('add mess', {name: data.name, msg: data.msg})
	});
});
*/