'use strict';
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

// list of currently connected clients
var drawing_client;
var fabricator_client;
var browser_client;
var tss_client;
var clients = [];

const PORT = process.env.PORT || 3000;

const server = express()
    .use(express.static(__dirname))
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({
	server
});

// FIXME: need a better way of actually storing last ping times to check
// keep alive times, otherwise opening multiple pages with sockets could
// cause problems.
const heartbeatDelay = 10000;
const heartbeat = setInterval(() => {
    const packet = {
      type: "heartbeat",
      timestamp: new Date().toLocaleTimeString()
    };
    clients.forEach((client) => {
        if (client !== fabricator_client) {
            client.send(JSON.stringify(packet));
        }
    });
}, heartbeatDelay);

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
	} else if (clientName === 'tss') {
		tss_client = ws;
	} else if (clientName === 'drawing') {
	    drawing_client = ws;
	}

	ws.on('message', function incoming(message) {
        if (message === undefined) {
            console.log(`Received empty message from ${clientName}`);
        }
        try {
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
                    let fabData = message.toString();
                    console.log('message', clientName, fabData);
                }
            }
            if (json_data.type == "canvas" && browser_client) {
                browser_client.send(message);
                console.log("message canvas data sent");
            }
            if (json_data.type == "tssInstructions"
                || json_data.type == "tssEnvelope" && tss_client) {
                tss_client.send(message);
                console.log(`message ${json_data.type} sent`);
            }
            if (fabricator_client && (
                    json_data.type == "gcode"
                    || json_data.type == "requestMachineState")) {
                fabricator_client.send(JSON.stringify(json_data));
                console.log('message', clientName, message);
            }
        }
        catch (e) {
            console.error(e);
        }
	});


	ws.on('close', function close() {
		console.log(clientName + ' client disconnected');
		if (clientName != "browser" && browser_client) {
			browser_client.send(clientName + ' client disconnected');
		}
		if (clientName == "drawing") {
			drawing_client = null;
        } else if (clientName == "tss") {
            tss_client = null;
		} else if (clientName == "fabricator") {
			fabricator_client = null;
		} else if (clientName == "browser") {
			browser_client = null;
		}
		clients.splice(index, 1);
	});
});
