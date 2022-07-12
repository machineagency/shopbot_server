'use strict';
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

// list of currently connected clients
var drawing_client;
var fabricator_client;
var browser_client;
var clients = [];

const PORT = process.env.PORT || 3000;

const server = express()
    .use(express.static(__dirname))
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
		drawing_client = ws;
		if (fabricator_client) {
			drawing_client.send("fabricator connected");
		}
	} else if (clientName == 'fabricator') {
		fabricator_client = ws;


	} else if (clientName === 'browser') {
		browser_client = ws;
	}

	ws.on('message', function incoming(message) {
		if (browser_client) {
			browser_client.send(message);
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
			if (drawing_client) {
				drawing_client.send(JSON.stringify(json_data));
                console.log('message', clientName, message);
			}
		}
        if (json_data.type == "canvas" && browser_client) {
            browser_client.send(message);
            console.log("message canvas data sent");
        }
		if (json_data.type == "gcode" && fabricator_client) {

			if (browser_client) {
				browser_client.send("gcode generated: " + JSON.stringify(json_data) + "\n");
			}
			fabricator_client.send(JSON.stringify(json_data));
            console.log('message', clientName, message);
		}

	});


	ws.on('close', function close() {
		console.log(clientName + ' client disconnected');
		if (clientName != "browser" && browser_client) {
			browser_client.send(clientName + ' client disconnected');
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
