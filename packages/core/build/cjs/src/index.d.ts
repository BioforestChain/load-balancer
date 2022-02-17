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
export interface LoadBalancerConf extends ServerUrl {
    servers: Array<ServerUrl & {
        name: string;
    }>;
    /**自定义静态路由分发策略 */
    routes?: Array<Route>;
}
export interface ServerUrl {
    host: string;
    port: number;
    scheme: "http" | "https";
}
export declare type Route = Route.HeaderRoute | Route.MethodRoute | Route.PathRoute | Route.AndRoute;
export declare namespace Route {
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
    type RouteBase = PathRouteBase | MethodRouteBase | HeaderRouteBase | AndRouteBase;
    interface AndRouteBase extends Base<":and"> {
        left: RouteBase;
        right: RouteBase;
    }
    interface To {
        to: string[];
    }
    /**根据request.url 里进行匹配 */
    export interface PathRoute extends PathRouteBase, To {
    }
    /**根据request.method 里的字段进行匹配 */
    export interface MethodRoute extends MethodRouteBase, To {
    }
    /**根据request.headers 里的字段进行匹配 */
    export interface HeaderRoute extends HeaderRouteBase, To {
    }
    /**用于联动多个条件 */
    export interface AndRoute extends AndRouteBase, To {
    }
    export {};
}
