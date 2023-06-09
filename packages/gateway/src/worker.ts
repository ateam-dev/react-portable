import { gateway } from "./index";

export type Env = {
  ORIGIN: string;
  FRAGMENT_CONFIGS: string;
  ALLOW_ORIGINS: string;
  CACHE: KVNamespace;
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return gateway({
      proxy: env.ORIGIN,
      cds: JSON.parse(env.FRAGMENT_CONFIGS),
      cors: { origin: env.ALLOW_ORIGINS },
      kv: env.CACHE,
    })(request, env, ctx);
  },
};
