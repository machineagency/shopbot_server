'use strict';
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');


// list of currently connected clients
var drawing_client;
var fabricator_client;
var browser_client;
var authoring_client;
var clients = [];


const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
	.use((req, res) => res.sendFile(INDEX))
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({
	server
});

wss.on('connection', (ws) => {
	console.log('Client connected', ws.protocol);
	var protocol = ws.protocol;
	var connection = ws;
	var index = clients.push(connection) - 1;
	var clientName = ws.protocol;
	if (clientName == 'drawing') {
		if (authoring_client) {
			authoring_client.send("drawing client connected");
		}


		drawing_client = ws;
		if (fabricator_client) {
			drawing_client.send("fabricator connected");
		}
	} else if (clientName == 'fabricator') {
		fabricator_client = ws;


	} else if (clientName == 'authoring') {
		authoring_client = ws;
		if (drawing_client) {
			drawing_client.send("authoring client connected");
		}
	} 

	ws.on('message', function incoming(message) {
		console.log('message', clientName, message);

		if (browser_client) {
			//browser_client.send(message);
		}
		var json_data = JSON.parse(message);
		if (json_data.name == "fabricator") {
			if (browser_client) {
				browser_client.send("fabricator connected");
			}
			fabricator_client = ws;
			clientName = "fabricator";
			if (drawing_client) {
				drawing_client.send("fabricator connected");
			}

		}
		if (json_data.type == "fabricator_data") {

			if (browser_client) {
				//browser_client.send("fabrication data generated " + String(authoring_client));
			}
			if (drawing_client) {
				//browser_client.send("sending fab data to drawing client");
				drawing_client.send(JSON.stringify(json_data));

			}
		}
		if (json_data.type == "gcode" && fabricator_client) {

			if (browser_client) {
				browser_client.send("gcode generated: " + JSON.stringify(json_data) + "\n");
			}
			fabricator_client.send(JSON.stringify(json_data));
		} else if (json_data.type == "behavior_data" || json_data.type == "behavior_change" || json_data.type == "authoring_response" ) {
			if (authoring_client) {
				authoring_client.send(JSON.stringify(json_data));
			}
		}

		if (json_data.type == "brush_init") {
			ws.send("init_data_received");
		} else {
			ws.send("message received");
		}

		if (json_data.type == "data_request" || json_data.type == "authoring_request") {
			if(json_data.requester == "authoring" && authoring_client && drawing_client){
				console.log("requesting authoring response from drawing client");
				drawing_client.send(JSON.stringify(json_data));
			}
		}


	});


	ws.on('close', function close() {
		console.log(clientName + ' client disconnected');
		if (clientName != "browser" && browser_client) {
			browser_client.send(clientName + ' client disconnected');
		}
		if (clientName == "authoring") {
			authoring_client = null;
		}
		if (clientName == "drawing") {
			drawing_client = null;
		} else if (clientName == "fabricator") {
			fabricator_client = null;

		} else if (clientName == "browser") {
			browser_client = null;
		}
		clients.splice(index, 1);
	});
});