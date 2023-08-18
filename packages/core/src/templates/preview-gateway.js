const { previewGateway } = require("@react-portable/gateway");

export default {
  fetch: (request, env, ctx) => {
    return previewGateway({
      proxy: env.ORIGIN,
      fragmentsEndpoint: env.FRAGMENTS_ENDPOINT,
    })(request, env, ctx);
  },
};
