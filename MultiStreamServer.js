/**
 * MultiStreamServer
 * ------------------
 * Manages multiple RTSP → MPEG1 pipelines and exposes them as individual WebSocket streams.
 *
 * Key Concepts:
 * -------------
 * - Each unique `path` corresponds to EXACTLY ONE RTSP source.
 * - The mapping rule is fully customizable:
 *      • A developer may map `/cam01` → rtsp://ip/cam1
 *      • Or map `/abc123` → some DB lookup
 *      • Or even use the RTSP URL itself as the identifier
 *      → As long as `path` uniquely identifies one RTSP source, the system works.
 *
 * - Multiple clients can subscribe to the same `path`, sharing one FFmpeg process.
 * - When the last client disconnects, FFmpeg is terminated and stream resources are freed.
 */
const EventEmitter = require('events');
const WebSocket = require('ws');
const RtspMpegSource = require('./RtspMpegSource');

 /**
     * @param {Object} options
     * @param {number} options.port - WebSocket server port
     * @param {Object} options.ffmpegOptions - Passed directly to RtspMpegSource (Mpeg1Muxer)
     * @param {(msg: object, wsClient: WebSocket, path: string)=>boolean} [options.shouldCloseConnection]
     * @param {(path: string)=>Promise<string>|string} options.callbackGetRtspUrl
     *        Developer-defined rule for mapping paths → RTSP URLs.
     *        Example:
     *          "/cam01" → "rtsp://ip/cam1"
     *          "/A9F33" → lookup from database
     *          "/whatever" → direct URL string
*/
class MultiStreamServer extends EventEmitter{
    constructor({port, ffmpegOptions, shouldCloseConnection, callbackGetRtspUrl}) {
        super();

        this.port = port
        this.ffmpegOptions = ffmpegOptions

        this.httpServer = require('http').createServer();
        this.wsServer = new WebSocket.Server({ noServer: true });

        // path → { videoStream: RtspMpegSource, wsClients: Set<WebSocket> }
        this.streamMap = {};

        // Optional custom disconnect rule
        this.shouldCloseConnection = shouldCloseConnection || (() => false);

        this._startServer();
        this._setupConnectionHandler(callbackGetRtspUrl)
    }

    //-------------------------------------------------------------
    // Start HTTP upgrade listener
    //-------------------------------------------------------------
    _startServer() {
        this.httpServer.listen(this.port, '0.0.0.0', () => {
            console.log(`WebSocket server listening on ws://localhost:${this.port}`);
        });
    }

    //-------------------------------------------------------------
    // Accept client connections and map them to RTSP sources
    //-------------------------------------------------------------
    async _setupConnectionHandler(callbackGetRtspUrl){
         /**
         * HTTP → WebSocket upgrade:
         * Extract the requested "path" (e.g., ws://host:9999/cam01 → "cam01"),
         * translate that path into an RTSP URL using user-provided callback,
         * then forward the socket to the WebSocket server.
         */
        this.httpServer.on('upgrade', async (req, socket, head) => {
            const pathname = new URL(req.url, `http://${req.headers.host}`).pathname.slice(1);
            // Developer-defined rule for mapping paths → RTSP URLs
            const rtspUrl = await callbackGetRtspUrl(pathname);
            console.log('Resolved RTSP URL:', rtspUrl);

            if (!rtspUrl) {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                console.log('socket destoryed');
                return;
            }

            // Forward upgrade request to WebSocket server
            this.wsServer.handleUpgrade(req, socket, head, (wsClient) => {
                wsClient.path = pathname;
                wsClient.rtspUrl = rtspUrl;
                this.wsServer.emit('connection', wsClient, req);
            });
        });
        //-------------------------------------------------------------
        // WebSocket connection handler
        //-------------------------------------------------------------
        this.wsServer.on('connection', (wsClient, req) => {
            wsClient.readyToStream = false;
            const path = wsClient.path;  // Unique key for RTSP source
            const rtspUrl = wsClient.rtspUrl;
            console.log(`client connected to /${path}`);

            // If stream doesn't exist, create it now
            const streamValue = this.streamMap[path];
            if (!streamValue) {
                console.log(`No existing stream for /${path}. Creating new RtspMpegSource.`);

                const stream = new RtspMpegSource({
                    name: path,
                    streamUrl: rtspUrl,
                    ffmpegOptions: this.ffmpegOptions,
                });

                this._setupStreamHandler(stream, path)

                this.streamMap[path] = { videoStream: stream, wsClients: new Set()};

                this._addWsClient(wsClient, path);
            } else {
                console.log(`Attaching client to existing stream /${path}.`);
                this._addWsClient(wsClient, path);
            }
        });

    }

    //-------------------------------------------------------------
    // Attach RtspMpegSource event handlers (metadata, data, kill)
    //-------------------------------------------------------------
    _setupStreamHandler(stream, path){
        // Video metadata (width/height) is now ready
        stream.on('metaDataReady', () => {
            console.log(`[${path}] Metadata ready — sending header to clients`);
                            
            const wsClients = this.streamMap[path].wsClients
            const videoStream = this.streamMap[path].videoStream
            for (const wsClient of wsClients) {
             
                if (wsClient.readyState === 1 && !wsClient.readyToStream) {
                    this._sendHeaderToClient(wsClient, videoStream)
                }
            }
        })   
        // MPEG1 binary frame → broadcast to clients
        stream.on('camdata', (data) => {
            const wsClients = this.streamMap[path].wsClients
            for (const wsClient of wsClients) {
                if (wsClient.readyState === 1 && wsClient.readyToStream) {
                    wsClient.send(data);
                }
            }
        })
        // FFmpeg ended OR was explicitly killed
        stream.on('killStream', () => {
            console.log(`[${path}] killStream received — cleaning up streamMap entry.`);

            const wsClients = this.streamMap[path].wsClients

            // Close all WebSocket clients
            for (const wsClient of wsClients) {
                try { wsClient.close(); } catch (_) {}
            }

            // Remove all event listeners to avoid leaks
            stream.removeAllListeners('camdata');
            stream.removeAllListeners('metaDataReady');
            stream.removeAllListeners('killStream');

            delete this.streamMap[path];
            console.log('Updated streamMap:', this.streamMap);
        });
    }
    //-------------------------------------------------------------
    // Attach WebSocket client to an existing source
    //-------------------------------------------------------------
    _addWsClient(wsClient, path) {
        const { wsClients, videoStream } = this.streamMap[path];

        wsClients.add(wsClient)

        // If metadata already known, immediately send header
        if (videoStream.metaDataReady && wsClient.readyState === 1 && !wsClient.readyToStream) {
            console.log(`[${path}] Metadata already ready — sending header to new client`);
            this._sendHeaderToClient(wsClient, videoStream)
        }
        //---------------------------------------------------------
        // Client → Server message handler
        //---------------------------------------------------------
        wsClient.on('message', (message) => {
            try {
                const parsed = JSON.parse(message);
                // Custom disconnect rule (e.g., {action:"stop"})
                if (this.shouldCloseConnection(parsed, wsClient, path)) {
                    console.log(`[${path}] shouldCloseConnection() returned TRUE → closing client`);
                    wsClient.close();
                    return;
                }

            } catch (e) {
                console.error('message:', message);
            }
        });
        //---------------------------------------------------------
        // Cleanup when WebSocket is closed
        //---------------------------------------------------------    
        wsClient.on('close', () => {
            console.log(`Client disconnected from /${path}`);
            wsClients.delete(wsClient);

            if (wsClients.size === 0) {
               console.log(`No more clients on /${path}, killing FFmpeg`);
               videoStream.killStream();
            }
        });
        
    }
    //-------------------------------------------------------------
    // Send JSMpeg header once metadata is available
    //-------------------------------------------------------------
    _sendHeaderToClient(wsClient, videoStream) {
        const header = videoStream.getHeaderForClient();
        wsClient.send(header, { binary: true }, () => {
            wsClient.readyToStream = true;
        });
    }
}
module.exports = MultiStreamServer;
