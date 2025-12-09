const EventEmitter = require('events');
var Mpeg1Muxer = require('./mpeg1muxer')
/**
 * RtspMpegSource:
 * ----------------
 * A single-responsibility class that:
 *   - Connects to an RTSP camera stream
 *   - Launches FFmpeg (via Mpeg1Muxer) to convert RTSP → MPEG1
 *   - Extracts video metadata (width/height) from FFmpeg stderr
 *   - Emits events for metadata availability, MPEG1 data frames, and stream termination
 *
 * This class does NOT handle WebSocket transmission.
 * It is designed to be used by higher-level components such as MultiStreamServer.
 */
class RtspMpegSource extends EventEmitter{
    constructor(options) {
        super();
        this.options = options
        // Human-readable stream name (e.g., "cam01")
        this.name = options.name

        // RTSP URL from which FFmpeg will read the video stream
        this.streamUrl = options.streamUrl

        // Optional initial width/height.
        // If not provided, they will be parsed from FFmpeg stderr.
        this.width = options.width 
        this.height = options.height 

        // FFmpeg process handle (inherited from Mpeg1Muxer)
        this.stream = undefined

        // Indicates whether width/height metadata has been fully extracted
        this.metaDataReady = false;

        // Required by JSMpeg. The first 4 bytes of the stream header.
        this.STREAM_MAGIC_BYTES = "jsmp"

        // Start the RTSP → MPEG1 conversion pipeline immediately
        this._startMpeg1Stream()
    }

 /**
  * Initializes Mpeg1Muxer, launches FFmpeg, and attaches listeners.
  * This function is responsible for:
  *   - FFmpeg error handling
  *   - Metadata parsing (resolution extraction)
  *   - Emitting MPEG1 binary chunks
*/    
    _startMpeg1Stream() {  
        this.mpeg1Muxer = new Mpeg1Muxer({
            ffmpegOptions: this.options.ffmpegOptions,
            url: this.streamUrl,
            ffmpegPath: this.options.ffmpegPath == undefined ? "ffmpeg" : this.options.ffmpegPath
        })
        this.stream = this.mpeg1Muxer.stream
        //--------------------------------------------------------------
        // FFmpeg ERROR handler
        //--------------------------------------------------------------
        this.stream.on('error', (err) => {
            console.error(`[${this.name}] FFmpeg process error:`, err);
            this.killStream();
        });
        
        //--------------------------------------------------------------
        // Parse FFmpeg stderr to extract video resolution (width/height)
        //--------------------------------------------------------------
        let gettingInputData = false;
        let inputData = [];
        let gettingOutputData = false;
        let outputData = [];
        this.mpeg1Muxer.on('ffmpegStderr', (data) => {
            var size
            data = data.toString()
            if (data.indexOf('Input #') !== -1) {
            gettingInputData = true
            }
            if (data.indexOf('Output #') !== -1) {
            gettingInputData = false
            gettingOutputData = true
            }
            if (data.indexOf('frame') === 0) {
            gettingOutputData = false
            }
            if (gettingInputData) {
                inputData.push(data.toString())
                size = data.match(/\d+x\d+/)
                if (size != null) {
                    size = size[0].split('x')
                    if (this.width == null) {
                        this.width = parseInt(size[0], 10)
                    }
                    if (this.height == null) {
                        this.height = parseInt(size[1], 10)
                        this.metaDataReady = true;
                        return this.emit('metaDataReady')
                    }
                }
            }
        })

        this.mpeg1Muxer.on('mpeg1data', (data) => {
            return this.emit('camdata', data)
        })
    }
/**
 * Kills the FFmpeg process and notifies listeners.
*/
    killStream(){
        console.log("killStream triggered — terminating FFmpeg");
        this.stream.kill();  // Terminates FFmpeg process
        this.emit('killStream')
    }
/**
 * Returns an 8-byte header required by JSMpeg clients.
 * Format:
 *   4 bytes: "jsmp" magic string
 *   2 bytes: width  (big-endian)
 *   2 bytes: height (big-endian)
*/
    getHeaderForClient() {
        const header = Buffer.alloc(8);
        header.write(this.STREAM_MAGIC_BYTES);
        header.writeUInt16BE(this.width, 4);
        header.writeUInt16BE(this.height, 6);
        return header
    }
}
module.exports = RtspMpegSource;
