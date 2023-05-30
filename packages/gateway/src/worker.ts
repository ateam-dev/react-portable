import { gateway } from "./index";

export type Env = {
  ORIGIN: string;
  FRAGMENT_CONFIGS: string;
  ALLOW_ORIGINS: string;
  FRAGMENTS_LIST: KVNamespace;
  CACHE: KVNamespace;
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return gateway({
      origin: env.ORIGIN,
      fragmentConfigs: JSON.parse(env.FRAGMENT_CONFIGS),
      allowOrigins: env.ALLOW_ORIGINS,
      fragmentListKVNameSpace: env.FRAGMENTS_LIST,
      fragmentCacheKVNameSpace: env.CACHE,
    })(request, env, ctx);
  },
};
