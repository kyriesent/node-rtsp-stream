ws = require 'ws'
util = require 'util'
events = require 'events'
Mpeg1Muxer = require './mpeg1muxer'

STREAM_MAGIC_BYTES = "jsmp" # Must be 4 bytes

VideoStream = (options) ->
  @name = options.name

  @streamUrl = options.streamUrl

  @width = options.width
  @height = options.height

  @wsPort = options.wsPort

  @inputStreamStarted = false
  @stream = undefined

  @startMpeg1Stream()
  @pipeStreamToSocketServer()

  return @

util.inherits VideoStream, events.EventEmitter

VideoStream::startMpeg1Stream = ->
  @mpeg1Muxer = new Mpeg1Muxer
    url: @streamUrl
  self = @
  return  if @inputStreamStarted
  @mpeg1Muxer.on 'mpeg1data', (data) ->
    self.emit 'camdata', data

  @

VideoStream::pipeStreamToSocketServer = ->
  self = @
  @wsServer = new ws.Server port: @wsPort
  @wsServer.on "connection", (socket) ->
    self.onSocketConnect socket
  @wsServer.broadcast = (data, opts) ->
    for i of @clients
      if @clients[i].readyState is 1
        @clients[i].send data, opts
      else
        console.log "Error: Client (" + i + ") not connected."

  @on 'camdata', (data) ->
    self.wsServer.broadcast data

VideoStream::onSocketConnect = (socket) ->
  # Send magic bytes and video size to the newly connected socket
  # struct { char magic[4]; unsigned short width, height;}
  self = @
  streamHeader = new Buffer(8)
  streamHeader.write STREAM_MAGIC_BYTES
  streamHeader.writeUInt16BE @width, 4
  streamHeader.writeUInt16BE @height, 6
  socket.send streamHeader,
    binary: true

  console.log "#{@name}: New WebSocket Connection (" + @wsServer.clients.length + " total)"
  socket.on "close", (code, message) ->
    console.log "#{@name}: Disconnected WebSocket (" + self.wsServer.clients.length + " total)"

module.exports = VideoStream