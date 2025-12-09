/**
 * Clean, safe, fully overrideable Mpeg1Muxer
 * ------------------------------------------
 * Responsibilities:
 *  - Spawn FFmpeg process for RTSP → MPEG1 conversion
 *  - Emit events: "mpeg1data", "ffmpegStderr", "exitWithError"
 *  - Allow override of both "-f" and "-codec:v" safely
 *  - Provide stable default output suitable for JSMpeg
 */

const child_process = require("child_process");
const EventEmitter = require("events");
const util = require("util");

function Mpeg1Muxer(options) {
    EventEmitter.call(this);

    this.url = options.url;
    this.ffmpegOptions = options.ffmpegOptions || {};
    this.exitCode = undefined;
    this.additionalFlags = [];

    // Collect additional FFmpeg flags from ffmpegOptions
    for (const key in this.ffmpegOptions) {
        this.additionalFlags.push(key);
        const value = String(this.ffmpegOptions[key]);
        if (value !== "") {
            this.additionalFlags.push(value);
        }
    }

    console.log("[Mpeg1Muxer] Spawn FFmpeg with override-safe default Mpeg1 output");

    // ---------------------------------------------
    // 1. Determine overrideable default ffmpeg flags
    // ---------------------------------------------
    const userFormat = this.ffmpegOptions["-f"];
    const userCodec = this.ffmpegOptions["-codec:v"];

    // Default output format (required for JSMpeg compatibility)
    const outputFormat = userFormat || "mpeg1video";

    // Codec is optional — only add if developer provided it
    const outputCodec = userCodec || null;

    // ---------------------------------------------
    // 2. Build FFmpeg command with safe override
    // ---------------------------------------------
    this.spawnOptions = [
        "-rtsp_transport", "tcp",
        "-i", this.url,
        "-f", outputFormat,
    ];

    if (outputCodec) {
        this.spawnOptions.push("-codec:v", outputCodec);
    }

    // Append developer-specified flags last
    this.spawnOptions.push(...this.additionalFlags);

    // FFmpeg outputs MPEG1 data to stdout
    this.spawnOptions.push("-");

    // ---------------------------------------------
    // 3. Spawn FFmpeg
    // ---------------------------------------------
    this.stream = child_process.spawn(
        options.ffmpegPath || "ffmpeg",
        this.spawnOptions,
        { detached: false }
    );

    this.inputStreamStarted = true;

    // ---------------------------------------------
    // 4. Hook FFmpeg output events
    // ---------------------------------------------

    // MPEG1 binary output → send to video streamer
    this.stream.stdout.on("data", (data) => {
        this.emit("mpeg1data", data);
    });

    // FFmpeg diagnostic output
    this.stream.stderr.on("data", (data) => {
        this.emit("ffmpegStderr", data);
    });

    // Exit handler (FFmpeg ended)
    this.stream.on("exit", (code, signal) => {
        if (code !== 0) {
            console.error(`[Mpeg1Muxer] FFmpeg exited with code=${code}, signal=${signal}`);
            this.exitCode = code;
            this.emit("exitWithError", { code, signal });
        } else {
            console.log("[Mpeg1Muxer] FFmpeg exited normally");
        }
    });

    return this;
}

util.inherits(Mpeg1Muxer, EventEmitter);

module.exports = Mpeg1Muxer;


