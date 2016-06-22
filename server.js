
//OPTIONS//
var port = "80"; //the port which the server will start on. If port 80 then server must be run as root.

//END OPTIONS//


//****DO NOT EDIT BELOW****//
var express = require('express');
var http = require('http');
var socketIO = require('socket.io');
var path = require('path');
var INotifyWait = require('inotifywait');
var fs = require('fs');
var nodemailer = require('nodemailer');

var app = express();
console.log(__dirname);
app.use(express.static(path.join(__dirname, "www")));
var server = http.createServer(app);
var io = socketIO.listen(server, {log: false});
var count = 0;
app.get("/", function(req, res){
	ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
	count = count + 1;
	console.log("New user: " + ip + " (" + count + ")");
	res.sendFile(__dirname + "/www/index.html");
});


io.sockets.on("connection", function(socket){
	fs.readFile(__dirname + "/post.json", 'utf8', function (err,data) {
	  if (err) {
		return console.log(err);
	  }
	  socket.emit('firstConnect', data);
	});
	
	fs.readFile(__dirname + "/oldPosts.json", 'utf8', function (err,data) {
	  if (err) {
		return console.log(err);
	  }
	  socket.emit('oldPosts', data);
	});
	
	socket.on('sm', function(data){
		if(data.p == "customPasswordHere"){
			console.log("Broadcasted message: " + data.m);
			io.sockets.emit('smr',data.m);
		}
	});	

	socket.on('errorReport', function(data){
		console.log("An error report was submitted");
		var transporter = nodemailer.createTransport({
		    service: 'gmail',
		    auth: {
		        user: 'username@gmail.com',
		        pass: 'password'
		    }
		});
		transporter.sendMail({
		    from: 'hitgrabber-error@hg.net',
		    to: 'username@gmail.com',
		    subject: data.subject + " - from: " + data.email,
		    text: data.description
		});
	});		
});

var watcher = new INotifyWait(__dirname + "/post.json", { recursive: false });
watcher.on('change', function (filename) {
	fs.readFile(filename, 'utf8', function (err,data) {
	  if (err) {
		return console.log(err);
	  }
	  io.sockets.emit('newPost', data);
	});
});

server.listen(port);
console.log("Server started and listening on port "+port);
