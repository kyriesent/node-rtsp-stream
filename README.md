# node-rtsp-stream (Enhanced Multi-Stream Version)

A extension of the original **node-rtsp-stream**, supporting:

- Multiple RTSP streams simultaneously  
- A single WebSocket server with path-based routing  
- Safe metadata handling (no more null width/height)  
- Flexible FFmpeg option overrides  
- Compatibility with **JSMpeg** (Player API) *and* **jsmpeg** (WebSocket API)

This version improves scalability, modularity, and real-world usability for multi-camera systems.

---

## Features

### 1. Multi-stream WebSocket Server
Instead of running one WebSocket server **per stream**, this version introduces:
A **single** WebSocket server handles all streams, and each path maps to a unique RTSP source.

### 2. Modular Architecture
The old `VideoStream` class handled too many responsibilities.  
It is now **cleanly separated** into:

| Class | Responsibility |
|-------|----------------|
| `RtspMpegSource` | RTSP → FFmpeg → MPEG1 decoding |
| `MultiStreamServer` | WebSocket routing, multiplexing, client handling |

### 3. Metadata Safety (width/height)
Headers are now sent **only after** metadata is parsed from FFmpeg.  
Clients connecting early are queued until metadata becomes ready.

### 4. Flexible FFmpeg Options
Users can override:

- `-f`
- `-codec:v`
- Any ffmpeg flag

This ensures backwards compatibility with:

| Player | Required FFmpeg Format |
|--------|------------------------|
| **JSMpeg** | requires: `-f mpegts` + `-codec:v mpeg1video` |
| **jsmpeg** | must **not** receive these options |

Both players are now supported.

---

# Usage
```
$ npm install node-rtsp-stream
```
On server:
```
const MultiStreamServer = require('node-rtsp-stream/MultiStreamServer');

const rtspMap = {
  cam01: "rtsp://example.com/cam01",
  cam02: "rtsp://example.com/cam02"
};

new MultiStreamServer({
  port: 9999,

  // optional FFmpeg flags
  ffmpegOptions: {
    '-stats': '',
    '-r': 30
  },

  // developer defines how wsPath → RTSP URL is resolved
  callbackGetRtspUrl: async (path) => rtspMap[path],

  // optional cleanup logic
  shouldCloseConnection: (msg) => {
      return ["stop", "quit", "close"].includes(msg.action);
  },
});

    
```
On client Two client-side players are supported:
1) jsmpeg (WebSocket constructor)
```
<html>
<body>
	<canvas id="canvas"></canvas>
</body>

<script type="text/javascript" src="jsmpeg.min.js"></script>
<script type="text/javascript">
	const player = new jsmpeg(
    new WebSocket("ws://localhost:9999/cam01"),
    { canvas: document.getElementById("canvas") }
  );
</script>
</html>
```
2) JSMpeg (Player API)
```
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
