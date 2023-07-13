import { previewGateway } from "@react-portable/gateway";

export type Env = {
  ORIGIN: string;
  COMPONENT_DELIVERING_SYSTEMS: string;
  ALLOW_ORIGINS: string;
  STORE: KVNamespace;
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return previewGateway({
      proxy: env.ORIGIN,
    })(request, env, ctx);
  },
};
