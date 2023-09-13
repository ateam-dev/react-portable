import { gateway } from "../index";

export type Env = {
  ORIGIN: string;
  FRAGMENTS_ENDPOINT: string;
};

export default {
  fetch: (request: Request, env: Env) => {
    return gateway({
      originEndpoint: env.ORIGIN,
      fragmentsEndpoint: env.FRAGMENTS_ENDPOINT,
    })(request);
  },
};
