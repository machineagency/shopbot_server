const HOST = location.origin.replace(/^http/, 'ws')
const ws = new WebSocket(HOST,'browser');

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

ws.onmessage = function (event) {
    let message = JSON.parse(event.data);
    if (message.type === "canvas") {
        deserializeCanvas(message.data);
    }
};
