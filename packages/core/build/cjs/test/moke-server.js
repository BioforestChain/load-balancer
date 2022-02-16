"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http = (0, tslib_1.__importStar)(require("node:http"));
const util = (0, tslib_1.__importStar)(require("node:util"));
const node_worker_threads_1 = require("node:worker_threads");
const ws_1 = require("ws");
const startServer = (port) => {
    const server = http.createServer((req, res) => {
        console.log("http response in ", node_worker_threads_1.threadId);
        res.end(util.format("%s / %d / %o", new Date(), node_worker_threads_1.threadId, server.address()));
    });
    const wss = new ws_1.WebSocketServer({ noServer: true });
    server.on("upgrade", (request, socket, head) => {
        console.log("upgrade in ", node_worker_threads_1.threadId);
        wss.handleUpgrade(request, socket, head, (ws) => {
            console.log("upgraded in ", node_worker_threads_1.threadId);
            wss.emit("connection", ws, request);
        });
    });
    wss.on("connection", (ws) => {
        console.log("websocket connected in ", node_worker_threads_1.threadId);
        ws.on("message", (msg) => {
            console.log("websocket got message ", msg);
            ws.send(util.format("%s / %d / %s", new Date(), node_worker_threads_1.threadId, msg));
        });
    });
    server.listen(port, "127.0.0.1", () => {
        console.log("server started:", server.address());
    });
};
if (node_worker_threads_1.isMainThread) {
    startServer(9800);
    for (let i = 1; i <= 3; i++)
        new node_worker_threads_1.Worker(__filename, {
            workerData: { port: 9800 + i },
        });
}
else {
    startServer(node_worker_threads_1.workerData.port);
}
