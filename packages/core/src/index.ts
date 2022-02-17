import * as os from "node:os";
import {
  ChildProcessByStdio,
  spawn,
  SpawnOptionsWithStdioTuple,
} from "node:child_process";
// import {createRequire} from 'node:module'
import { Writable, Readable } from "node:stream";
import { EventEmitter } from "node:events";

export class LoadBalancer {
  private _binaryPath = "";
  constructor() {
    // const req = createRequire(import.meta.url)
    const platform = os.platform();
    switch (platform) {
      case "win32":
        this._binaryPath = require.resolve(
          "@bfchain/load-balancer-binary-windows-64/binary"
        );
        break;
      case "linux":
        this._binaryPath = require.resolve(
          "@bfchain/load-balancer-binary-linux-64/binary"
        );
        break;
      case "darwin":
        this._binaryPath = require.resolve(
          "@bfchain/load-balancer-binary-darwin-64/binary"
        );
        break;
    }
    if (this._binaryPath === "") {
      throw new Error(`load-balancer no support platform:${platform}`);
    }
  }
  private _process?: ChildProcessByStdio<Writable, Readable, Readable>;

  private _cacheOutput = "";
  private joinChunk(chunk: Buffer) {
    this._cacheOutput += chunk;

    let startIndex = 0;
    while (true) {
      const msgSplitIndex = this._cacheOutput.indexOf("\n", startIndex);
      if (msgSplitIndex === -1) {
        break;
      }
      const msgJson = this._cacheOutput.slice(0, msgSplitIndex);
      try {
        const msg = JSON.parse(msgJson);
        this._cacheOutput = this._cacheOutput.slice(msgSplitIndex + 1);
        queueMicrotask(() => {
          this._emitMessage(msg);
        });
        break;
      } catch {
        /**
         * @TODO 使用JSON stream的方式来解析，如果能解析才能继续缓存 cacheOutput
         * startIndex = msgSplitIndex + 1
         *
         * 否则目前就直接丢弃
         */
        this._cacheOutput = this._cacheOutput.slice(msgSplitIndex + 1);
      }
      // console.log("this._cacheOutput", this._cacheOutput);
    }
  }
  private _emitMessage(msg: unknown) {
    this._event.emit("message", msg);
  }
  private _onMessage(onMsg: (msg: any) => unknown, onExit?: () => unknown) {
    this._event.on("message", onMsg);
    onExit && this._event.once("exit", onExit);
    return () => {
      this._event.off("message", onMsg);
      onExit && this._event.off("exit", onExit);
    };
  }
  private _event = new EventEmitter();
  private _sendRequest(
    process: ChildProcessByStdio<Writable, Readable, Readable>,
    data: any
  ) {
    process.stdin.write(JSON.stringify(data) + "\n");
  }
  private _waitCmdReponse(cmd: string) {
    return new Promise<void>((resolve, reject) => {
      const off = this._onMessage(
        (msg) => {
          if (msg.return === cmd) {
            if (msg.success) {
              off();
              resolve();
            } else {
              off();
              reject(msg.error);
            }
          }
        },
        () => {
          off();
          reject("process exited.");
        }
      );
    });
  }

  async start(conf: LoadBalancerConf) {
    if (this._process) {
      return false;
    }
    const process = (this._process = spawn(this._binaryPath, {
      stdio: ["pipe", "pipe", "pipe"],
    } as SpawnOptionsWithStdioTuple<"pipe", "pipe", "pipe">));
    this._sendRequest(process, { cmd: "start", conf });
    process.stderr.on("data", (chunk) => {
      console.log("chunk", chunk.toString());
      this.joinChunk(chunk);
    });
    process.on("exit", () => {
      this._event.emit("exit");
    });
    await this._waitCmdReponse("start");

    return true;
  }

  async restart(conf: LoadBalancerConf) {
    const process = this._process!;
    if (process === undefined) {
      return false;
    }
    this._sendRequest(process, { cmd: "restart", conf });
    await this._waitCmdReponse("restart");
    return true;
  }
  testConfig() {}
  async stop() {
    console.log("kill...");
    if (this._process === undefined) {
      return false;
    }
    this._sendRequest(this._process, { cmd: "stop" });
    await this._waitCmdReponse("stop");
    this._cacheOutput = "";
    this._process = undefined;
    return true;
  }
}
export interface LoadBalancerConf extends ServerUrl {
  servers: Array<
    ServerUrl & {
      name: string;
    }
  >;
  /**自定义静态路由分发策略 */
  routes?: Array<Route>;
}

export interface ServerUrl {
  host: string;
  port: number;
  scheme: "http" | "https";
}
export type Route =
  | Route.HeaderRoute
  | Route.MethodRoute
  | Route.PathRoute
  | Route.AndRoute;
export namespace Route {
  interface Base<MODE extends string> {
    mode: MODE;
    negation?: boolean;
  }
  interface PathRouteBase extends Base<":path"> {
    value: string;
  }
  interface MethodRouteBase extends Base<":method"> {
    value: "GET" | "POST" | "PUT" | "DELETE";
  }
  interface HeaderRouteBase extends Base<":header"> {
    value: string;
    key: string;
  }

  type RouteBase =
    | PathRouteBase
    | MethodRouteBase
    | HeaderRouteBase
    | AndRouteBase;

  interface AndRouteBase extends Base<":and"> {
    left: RouteBase;
    right: RouteBase;
  }

  interface To {
    to: string[];
  }

  /**根据request.url 里进行匹配 */
  export interface PathRoute extends PathRouteBase, To {}
  /**根据request.method 里的字段进行匹配 */
  export interface MethodRoute extends MethodRouteBase, To {}
  /**根据request.headers 里的字段进行匹配 */
  export interface HeaderRoute extends HeaderRouteBase, To {}
  /**用于联动多个条件 */
  export interface AndRoute extends AndRouteBase, To {}
}
// const routesConf: Route = {
//   mode: ":and",
//   left: {
//     mode: ":method",
//     value: "DELETE",
//   },
//   right: {
//     mode: ":header",
//     key: "zz",
//     value: "ZZ",
//   },
//   to: ["x"],
// };
