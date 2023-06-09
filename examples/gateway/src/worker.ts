import { gateway } from "@react-portable/gateway";

export type Env = {
  ORIGIN: string;
  COMPONENT_DELIVERING_SYSTEMS: string;
  ALLOW_ORIGINS: string;
  STORE: KVNamespace;
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return gateway({
      proxy: env.ORIGIN,
      cds: JSON.parse(env.COMPONENT_DELIVERING_SYSTEMS),
      cors: { origin: env.ALLOW_ORIGINS.split(",") },
      kv: env.STORE,
    })(request, env, ctx);
  },
};
