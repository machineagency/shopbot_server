function deserializeCanvas(data) {
    let canvas = document.getElementById("tss-canvas");
    let img = new Image();
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
    };

    img.src = data;
}

function initializeHeartbeat(ws) {
    const period = 10000;
    const sendHeartbeat = () => {
        const packet = {
            type: "heartbeat",
            timestamp: new Date().toLocaleTimeString()
        };
        ws.send(JSON.stringify(packet));
    };
    return setInterval(sendHeartbeat, period);
}

function cancelHeartbeat(interval) {
    clearInterval(interval);
}

function main() {
    const HOST = location.origin.replace(/^http/, 'ws')
    const ws = new WebSocket(HOST,'browser');
    let heartbeat = initializeHeartbeat(ws);
    ws.onmessage = function (event) {
        let message = JSON.parse(event.data);
        if (message.type === "canvas") {
            deserializeCanvas(message.data);
        }
    };
    ws.onclose = function (event) {
        cancelHeartbeat(heartbeat);
    };
}

main();
