import * as http from "node:http";
import * as util from "node:util";
import {
  isMainThread,
  threadId,
  Worker,
  workerData,
} from "node:worker_threads";
import { WebSocketServer } from "ws";

const startServer = (port: number) => {
  const server = http.createServer((req, res) => {
    console.log("http response in ", threadId);
    res.end(
      util.format("%s / %d / %o", new Date(), threadId, server.address())
    );
  });
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    console.log("upgrade in ", threadId);
    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log("upgraded in ", threadId);
      wss.emit("connection", ws, request);
    });
  });
  wss.on("connection", (ws) => {
    console.log("websocket connected in ", threadId);
    ws.on("message", (msg) => {
      console.log("websocket got message ", msg);
      ws.send(util.format("%s / %d / %s", new Date(), threadId, msg));
    });
  });
  server.listen(0, "127.0.0.1", () => {
    console.log("server started:", server.address());
  });
};

if (isMainThread) {
  startServer(9800);
  for (let i = 1; i <= 3; i++)
    new Worker(__filename, {
      workerData: { port: 9800 + i },
    });
} else {
  startServer(workerData.port);
}
