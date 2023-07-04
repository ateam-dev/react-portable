import { previewGateway } from "../index";

export type Env = {
  ORIGIN: string;
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return previewGateway({
      proxy: env.ORIGIN,
    })(request, env, ctx);
  },
};
