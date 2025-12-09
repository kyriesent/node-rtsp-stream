/**
 * Example usage of the MultiStreamServer class.
 * -----------------------------------------------------
 * This file demonstrates how a developer can map
 * WebSocket paths (e.g., "/cam01") to actual RTSP URLs.
 *
 * Important:
 *  - The key (e.g. "cam01") acts as a unique identifier
 *    for one RTSP source.
 *  - callbackGetRtspUrl() defines how the mapping works.
 *  - Developers may use:
 *        • static hardcoded mapping (like here)
 *        • database lookup
 *        • dynamic configuration
 *        • or even use the RTSP URL itself as the path
 *
 *
 * VERY IMPORTANT — ABOUT JSMpeg vs jsmpeg CLIENTS
 * ---------------------------------------------------
 *
 * JSMpeg (modern, maintained version — https://github.com/phoboslab/jsmpeg)
 * ------------------------------------------------------------------------
 * ✔ JSMpeg **requires** FFmpeg to output MPEG-TS (Transport Stream) format.
 * ✔ Therefore, you MUST explicitly set:
 *
 *          "-f": "mpegts",
 *          "-codec:v": "mpeg1video",
 *
 *
 *
 * jsmpeg (older, unofficial/minimal client)
 * ------------------------------------------------------------------------
 * ✔ The old “jsmpeg” library expects **raw MPEG1 video**, not MPEG-TS.
 * ✔ Therefore, you MUST NOT set:
 *
 *          "-f": "mpegts"
 *          "-codec:v": "mpeg1video"
 *
 * ✔ If you include them, the video will break (color blocks, noise).
 *
 *
 * Summary:
 * ---------------------------------------------------
 *   Web client uses **JSMpeg**  →  KEEP the two options above
 *   Web client uses **jsmpeg** → REMOVE the two options above
 *
 *
 * Your MultiStreamServer can support both, depending on what
 * your front-end video decoder uses.
 */

const MultiStreamServer = require('./MultiStreamServer');

//-------------------------------------------
// Example RTSP source mapping table
//-------------------------------------------
// The key becomes the WebSocket path:
//     ws://localhost:9999/cam01  →  testRtspMap["cam01"]
//
const testRtspMap = {
    "cam01": 'rtsp://210.99.70.120:1935/live/cctv001.stream',
    "cam02": 'rtsp://210.99.70.120:1935/live/cctv002.stream',
    "cam03": 'rtsp://210.99.70.120:1935/live/cctv003.stream',
};
//-------------------------------------------
// Create MultiStreamServer instance
//-------------------------------------------
const multiStreamServer = new MultiStreamServer({
    port: 9999,

    ffmpegOptions: {
        // FFmpeg flags (passed to Mpeg1Muxer)
        '-stats': '',       // an option with no neccessary value uses a blank string
        '-b:v': '800k',     // Video bitrate
        '-r': 30,           // Output framerate,

        /**
         * IMPORTANT:
         * Uncomment these ONLY IF your web client uses JSMpeg.
         * If using old "jsmpeg", leave these commented out.
         */
        // "-f": "mpegts",
        // "-codec:v": "mpeg1video",
    },

    /**
     * shouldCloseConnection():
     * This callback determines whether the server should
     * close a client's WebSocket connection based on the
     * received message.
     *
     * Returning TRUE → wsClient.close()
     */
    shouldCloseConnection: (msg) => {
        return ["stop", "quit", "close"].includes(msg.action);
    },

    /**
     * callbackGetRtspUrl():
     * Converts the WebSocket path (e.g., "cam01")
     * to the actual RTSP URL.
     *
     * This is intentionally developer-defined:
     *  - You can return a hardcoded source (as here)
     *  - Or fetch from a DB
     *  - Or validate permissions
     *  - Or dynamically build RTSP URLs
     */
    callbackGetRtspUrl: async (path) => {
        console.log("Requested stream path:", path);
        return testRtspMap[path];
    }
});
