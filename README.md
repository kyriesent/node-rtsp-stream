node-rtsp-stream
================

Stream any RTSP stream and output to websocket for consumption by [jsmpeg](https://github.com/phoboslab/jsmpeg). HTML5 streaming video! (Requires ffmpeg)

Usage:

```
$ npm install node-rtsp-stream
```

On server:
```
Stream = require('node-rtsp-stream');
stream = new Stream({
  name: 'name',
  streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
  wsPort: 9999
  ffmpegOptions: { // options ffmpeg flags
    '-stats': '', // an option with no neccessary value uses a blank string
    '-force_fps': 30 // options with required values specify the value after the key
  }
});
    
```

On client:
```
client = new WebSocket('ws://localhost:9999');
player = new jsmpeg(client, {
  canvas: canvas // Canvas should be a canvas DOM element
});

```

For more information on how to use jsmpeg to stream video, visit https://github.com/phoboslab/jsmpeg

Please note that framerate from cameras must be greater than or equal to 15fps for mpeg1 encoding, otherwise ffmpeg errors will prevent video encoding to occur. If you have a camera with advanced configuration options, make sure it streams video at a recommended 25fps.
