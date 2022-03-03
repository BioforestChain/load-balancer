import { WebSocket } from "ws";
!(async () => {
  /// client
  const fetch = (type: string) => {
    const ws = new WebSocket("ws://localhost:8888", {
      //   headers: {
      //     type,
      //   },
    });
    return new Promise<string>((resolve) => {
      ws.on("open", () => {
        ws.send("qaq");
      });
      ws.on("message", (msg) => {
        resolve(String(msg).split("/")[1].trim());
      });
    });
  };
  const accMap = {} as any;
  for (let i = 0; i < 1000; i++) {
    const toId = await fetch("custom-header-type");
    accMap[toId] = (accMap[toId] | 0) + 1;
  }
  console.log("accMap:", accMap);
  console.log("end");
})();
