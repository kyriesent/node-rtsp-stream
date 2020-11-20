node-rtsp-stream
================

Stream any RTSP stream and output to websocket for consumption by [jsmpeg](https://github.com/phoboslab/jsmpeg). HTML5 streaming video! (Requires ffmpeg)

Usage:

```
$ npm install node-rtsp-stream
```

On server:
```js
Stream = require('node-rtsp-stream')
stream = new Stream({
  name: 'name',
  streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
  wsPort: 9999,
  ffmpegOptions: { // options ffmpeg flags
    '-stats': '', // an option with no neccessary value uses a blank string
    '-r': 30 // options with required values specify the value after the key
  }
})
    
```

On client:
```html
<html>
<body>
	<canvas id="canvas"></canvas>
</body>

<script type="text/javascript" src="jsmpeg.min.js"></script>
<script type="text/javascript">
	player = new JSMpeg.Player('ws://localhost:9999', {
	  canvas: document.getElementById('canvas') // Canvas should be a canvas DOM element
	})	
</script>
</html>
```

Multiple streaming solutions:
```js
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
```

Multiple streaming on client
```html
<html>

<body>
    <canvas id="canvas"></canvas>
    <canvas id="canvas2"></canvas>
</body>

<script type="text/javascript" src="./js/jsmpeg.min.js"></script>
<script type="text/javascript">
    player = new JSMpeg.Player('ws://localhost:9999/foo', {
        canvas: document.getElementById('canvas') // Canvas should be a canvas DOM element
    })

    player2 = new JSMpeg.Player('ws://localhost:9999/bar', {
        canvas: document.getElementById('canvas2') // Canvas2 should be a canvas DOM element
    })	
</script>

</html>
```

ps: you can run the MultipleExample and open \MultipleExample\client.html on your Browser.
```js
  node .\MultipleExample\server.js 
```

For more information on how to use jsmpeg to stream video, visit https://github.com/phoboslab/jsmpeg

Please note that framerate from cameras must be greater than or equal to 15fps for mpeg1 encoding, otherwise ffmpeg errors will prevent video encoding to occur. If you have a camera with advanced configuration options, make sure it streams video at a recommended 25fps.
