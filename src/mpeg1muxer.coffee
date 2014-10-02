child_process = require 'child_process'
util = require 'util'
events = require 'events'

Mpeg1Muxer = (options) ->
  self = @
  
  @url = options.url

  @stream = child_process.spawn "ffmpeg", [
    "-rtsp_transport"
    "tcp"
    "-i"
    @url
    '-f'
    'mpeg1video'
    # '-vf'
    # 'crop=iw-mod(iw\\,2):ih-mod(ih\\,2)'
    '-b:v'
    '800k'
    '-r'
    '30'
    '-'
  ], {detached: false}

  @inputStreamStarted = true
  @stream.stdout.on 'data', (data) ->
    self.emit 'mpeg1data', data

  @stream.stderr.pipe global.process.stderr

  @

util.inherits Mpeg1Muxer, events.EventEmitter

module.exports = Mpeg1Muxer