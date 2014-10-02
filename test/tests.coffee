describe 'node-rstp-stream', ->
  VideoStream = require '../'
  it 'should not throw an error when instantiated', (done) ->
    videoStream = new VideoStream
      name: 'wowza',
      streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov'
      wsPort: 9999
      width: 240
      height: 160
    done()