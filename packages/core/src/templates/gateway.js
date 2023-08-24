const { gateway } = require("@react-portable/gateway");

export default {
  fetch: (request, env, ctx) => {
    if (request.headers.get("Upgrade") === "websocket") {
      const url = new URL(request.url);
      const origin = new URL(env.WS_ENDPOINT);
      url.host = origin.host;
      url.port = origin.port;
      url.protocol = origin.protocol;

      return fetch(new Request(url, request));
    }
    return gateway({
      proxy: env.ORIGIN,
      fragmentsEndpoint: env.FRAGMENTS_ENDPOINT,
    })(request, env, ctx);
  },
};
