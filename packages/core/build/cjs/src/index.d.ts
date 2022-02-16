export declare class LoadBalancer {
    private _binaryPath;
    constructor();
    private _process?;
    private _cacheOutput;
    private joinChunk;
    private _emitMessage;
    private _onMessage;
    private _event;
    private _sendRequest;
    private _waitCmdReponse;
    start(conf: LoadBalancerConf): Promise<boolean>;
    restart(conf: LoadBalancerConf): Promise<boolean>;
    testConfig(): void;
    stop(): Promise<boolean>;
}
interface LoadBalancerConf extends ServerUrl {
    servers: Array<ServerUrl & {
        name: string;
    }>;
}
interface ServerUrl {
    host: string;
    port: number;
    scheme: "http" | "https";
}
export {};
