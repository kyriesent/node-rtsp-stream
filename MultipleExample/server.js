var http = require('http');
var url = require('url');
var server = http.createServer();
var VideoStream;
VideoStream = require('../');
const WebSocket = require('ws');
const wss1 = new WebSocket.Server({ noServer: true });
const wss2 = new WebSocket.Server({ noServer: true });

const stream1 = new VideoStream({
    name: 'name',
    streamUrl: 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov',
    Server: wss1,
    ffmpegOptions: {
        '-stats': '',
        '-r': 30
    }
})

const stream2 = new VideoStream({
    name: 'name2',
    streamUrl: 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov',
    Server: wss2,
    ffmpegOptions: {
        '-stats': '',
        '-r': 30
    }
})

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/foo') {
        wss1.handleUpgrade(request, socket, head, function done(ws) {
            wss1.emit('connection', ws, request);
        });
    } else if (pathname === '/bar') {
        wss2.handleUpgrade(request, socket, head, function done(ws) {
            wss2.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.listen(9999);