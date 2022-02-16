"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nginxExec = void 0;
const tslib_1 = require("tslib");
const node_child_process_1 = require("node:child_process");
const path = (0, tslib_1.__importStar)(require("node:path"));
const os = (0, tslib_1.__importStar)(require("node:os"));
const nginxExec = (argv) => {
    if (os.platform() === "linux") {
    }
    const nginxPath = path.resolve("@bfchain/nginx-binary-linux-64/binary/nginx.exe");
    return (0, node_child_process_1.spawn)(nginxPath, argv);
};
exports.nginxExec = nginxExec;
