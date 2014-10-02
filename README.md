node-rstp-stream
================

Stream any RSTP stream and output to websocket for consumption by [jsmpeg](https://github.com/phoboslab/jsmpeg). HTML5 streaming video! (Requires ffmpeg)

Usage:

```
$ npm install node-rstp-stream
```

On server:
```
Stream = require('node-rstp-stream');
stream = new Stream({
    name: 'name',
    streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
    wsPort: 9999,
    width: 240,
    height: 160,
});
    
```

On client:
```
client = new Websocket('ws://localhost:9999');
player = new jsmpeg(client, {
    canvas: canvas // Canvas should be a canvas DOM element
});

```

For more information on how to use jsmpeg to stream video, visit https://github.com/phoboslab/jsmpeg