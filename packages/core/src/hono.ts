import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { qwikMiddleware } from "@hono/qwik-city";

import { Hono } from "hono";

// FIXME
const etag = "some-hash";

const app = new Hono();
app.get("*", async (c, next) => {
  const ifNoneMatch = c.req.header("If-None-Match");
  if (ifNoneMatch === etag)
    return new Response(null, {
      status: 304,
      statusText: "Not Modified",
      headers: {
        ETag: etag,
      },
    });

  await next();
  c.res.headers.set("ETag", etag);
});
app.get("*", qwikMiddleware({ render, qwikCityPlan }));

export default app;
