const { previewGateway } = require("@react-portable/gateway");

export default {
  fetch: (request, env, ctx) => {
    return previewGateway({
      proxy: env.ORIGIN,
      componentServer: env.REMOTE,
    })(request, env, ctx);
  },
};
