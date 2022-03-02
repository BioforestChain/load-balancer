import assert from "assert";
import { LoadBalancer } from "../src";
(async () => {
  const lb = new LoadBalancer(undefined, console.info);
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
      {
        name: "Server C",
        scheme: "http",
        host: "127.0.0.1",
        port: 9802,
      },
    ],
    routes: [
      {
        mode: ":header",
        key: "type",
        value: "custom-header-type",
        to: ["Server A"],
      },
      {
        mode: ":header",
        key: "type",
        value: "custom-header-type",
        negation: true,
        to: ["Server B", "Server C"],
      },
    ],
  });
  assert(res, "start server");
  // lb.stop();
})().catch(console.error);
