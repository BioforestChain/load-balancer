"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadBalancer = void 0;
const tslib_1 = require("tslib");
const os = (0, tslib_1.__importStar)(require("node:os"));
const node_child_process_1 = require("node:child_process");
const node_events_1 = require("node:events");
class LoadBalancer {
    constructor() {
        this._binaryPath = "";
        this._cacheOutput = "";
        this._event = new node_events_1.EventEmitter();
        // const req = createRequire(import.meta.url)
        const platform = os.platform();
        switch (platform) {
            case "win32":
                this._binaryPath = require.resolve("@bfchain/load-balancer-binary-windows-64/binary");
                break;
            case "linux":
                this._binaryPath = require.resolve("@bfchain/load-balancer-binary-linux-64/binary");
                break;
            case "darwin":
                this._binaryPath = require.resolve("@bfchain/load-balancer-binary-darwin-64/binary");
                break;
        }
        if (this._binaryPath === "") {
            throw new Error(`load-balancer no support platform:${platform}`);
        }
    }
    joinChunk(chunk) {
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
            }
            catch {
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
    _emitMessage(msg) {
        this._event.emit("message", msg);
    }
    _onMessage(onMsg, onExit) {
        this._event.on("message", onMsg);
        onExit && this._event.once("exit", onExit);
        return () => {
            this._event.off("message", onMsg);
            onExit && this._event.off("exit", onExit);
        };
    }
    _sendRequest(process, data) {
        process.stdin.write(JSON.stringify(data) + "\n");
    }
    _waitCmdReponse(cmd) {
        return new Promise((resolve, reject) => {
            const off = this._onMessage((msg) => {
                if (msg.return === cmd) {
                    if (msg.success) {
                        off();
                        resolve();
                    }
                    else {
                        off();
                        reject(msg.error);
                    }
                }
            }, () => {
                off();
                reject("process exited.");
            });
        });
    }
    async start(conf) {
        if (this._process) {
            return false;
        }
        const process = (this._process = (0, node_child_process_1.spawn)(this._binaryPath, {
            stdio: ["pipe", "pipe", "pipe"],
        }));
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
    async restart(conf) {
        const process = this._process;
        if (process === undefined) {
            return false;
        }
        this._sendRequest(process, { cmd: "restart", conf });
        await this._waitCmdReponse("restart");
        return true;
    }
    testConfig() { }
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
exports.LoadBalancer = LoadBalancer;
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
