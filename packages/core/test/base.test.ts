import assert from "assert";
import { LoadBalancer } from "../src";
import { WebSocket } from "ws";
(async () => {
  const lb = new LoadBalancer();
  const res = await lb.start({
    scheme: "http",
    host: "0.0.0.0",
    port: 8888,
    servers: [
      {
        name: "Server A",
        scheme: "http",
        host: "127.0.0.1",
        port: 9800,
      },
      {
        name: "Server B",
        scheme: "http",
        host: "127.0.0.1",
        port: 9801,
      },
    ],
  });
  assert(res, "start server");
  // lb.stop();

  /// client
  const ws = new WebSocket("ws://localhost:8888", {
    headers: {
      type: "custom-header-type",
    },
  });
  await new Promise((resolve) => {
    ws.once("open", resolve);
  });
  ws.on("message", (msg) => {});
})().catch(console.error);
