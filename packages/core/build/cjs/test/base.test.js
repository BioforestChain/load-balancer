"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const assert_1 = (0, tslib_1.__importDefault)(require("assert"));
const src_1 = require("../src");
(async () => {
    const lb = new src_1.LoadBalancer();
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
    (0, assert_1.default)(res, "start server");
    lb.stop();
})().catch(console.error);
