import { previewGateway } from "../index";

export type Env = {
  ORIGIN: string;
  COMPONENT_SERVER?: string;
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    return previewGateway({
      proxy: env.ORIGIN,
      componentServer: env.COMPONENT_SERVER,
    })(request, env, ctx);
  },
};
