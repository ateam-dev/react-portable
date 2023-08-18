import { previewGateway } from "../index";

export type Env = {
  ORIGIN: string;
  FRAGMENTS_ENDPOINT: string;
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return previewGateway({
      proxy: env.ORIGIN,
      fragmentsEndpoint: env.FRAGMENTS_ENDPOINT,
    })(request, env, ctx);
  },
};
