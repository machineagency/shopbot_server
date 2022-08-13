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

function getConnectedClientNames() {
    let clients = [];
    if (drawing_client) {
        clients.push("drawing");
    }
    if (tss_client) {
        clients.push("tss");
    }
    if (fabricator_client) {
        clients.push("fabricator");
    }
    return clients;
}

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
	} else if (clientName === 'tss') {
		tss_client = ws;
	} else if (clientName === 'drawing') {
	    drawing_client = ws;
	}

    // On drawing client connection, send it the list of all known connections.
    if (drawing_client) {
        let connectNotice = {
            type: "connectionStatus",
            who: getConnectedClientNames(),
            status: "connect"
        };
        drawing_client.send(JSON.stringify(connectNotice));
    }

	ws.on('message', function incoming(message) {
        if (message === undefined || message == null) {
            console.log(`Received empty message, disregarding.`);
            return;
        }
        try {
            if (browser_client) {
                browser_client.send(message);
            }
            var json_data = JSON.parse(message);
            if (drawing_client && json_data.type == "fabricatorData") {
                drawing_client.send(JSON.stringify(json_data));
                let fabData = message.toString();
                console.log('message', clientName, fabData);
            }
            if (browser_client && json_data.type == "canvas") {
                browser_client.send(message);
                console.log("message canvas data sent");
            }
            if (tss_client && (json_data.type == "tssInstructions"
                || json_data.type == "tssMachineParams"
                || json_data.type == "tssEnvelope")) {
                tss_client.send(message);
                console.log(`message ${json_data.type} sent`);
            }
            if (fabricator_client && (
                    json_data.type == "gcode"
                    || json_data.type == "requestMachineState")) {
                fabricator_client.send(JSON.stringify(json_data));
                console.log('message', clientName, message);
            }
            if (json_data.type == "heartbeat") {
                let ack = {
                    name: "server",
                    type: "ack"
                };
                if (json_data.name == "drawing" && drawing_client) {
                    drawing_client.send(JSON.stringify(ack));
                }
                if (json_data.name == "tss" && tss_client) {
                    tss_client.send(JSON.stringify(ack));
                }
                if (json_data.name == "fabricator" && fabricator_client) {
                    fabricator_client.send(JSON.stringify(ack));
                }
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

        // Send a disconnect notice to the drawing client
        if (drawing_client) {
            let disconnectNotice = {
                type: "connectionStatus",
                who: [clientName.toString()],
                status: "disconnect"
            };
            drawing_client.send(JSON.stringify(disconnectNotice));
        }
	});
});
