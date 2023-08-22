const { gateway } = require("@react-portable/gateway");

export default {
  fetch: (request, env, ctx) => {
    return gateway({
      proxy: env.ORIGIN,
      fragmentsEndpoint: env.FRAGMENTS_ENDPOINT,
    })(request, env, ctx);
  },
};
