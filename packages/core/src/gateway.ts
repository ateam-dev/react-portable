import { gateway } from "@react-portable/gateway";

type Env = {
  GATEWAY: DurableObjectNamespace;
  ORIGIN: string;
  FRAGMENTS_ENDPOINT: string;
};

export default {
  fetch: async (request: Request, env: Env) => {
    const doId = env.GATEWAY.idFromName("");
    return env.GATEWAY.get(doId).fetch(request);
  },
};

export class HotReloadableGateway {
  private ws: WebSocket | undefined;
  private gateway: ReturnType<typeof gateway>;

  constructor(_: unknown, env: Env) {
    this.gateway = gateway({
      originEndpoint: env.ORIGIN,
      fragmentsEndpoint: env.FRAGMENTS_ENDPOINT,
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (
      url.pathname === "/_ws" &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      const [client, server] = Object.values(new WebSocketPair());
      this.ws = server;

      // @ts-ignore
      server.accept();

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/_reload") {
      this.ws?.send("reload");

      return new Response(null);
    }

    return this.gateway(request);
  }
}
