import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { qwikMiddleware } from "@hono/qwik-city";
import { logger } from "hono/logger";

import { Hono } from "hono";

const app = new Hono();
app.get("*", logger());

app.get("/_fragments/:any/*", (c, next) => {
  if (c.req.headers.get("accept")?.includes("text/html")) {
    const url = new URL(c.req.raw.url);
    return app.request(
      url.pathname.replace(`/_fragments/${c.req.param().any}`, "") + url.search,
      c.req.raw
    );
  }

  return next();
});

app.get("*", qwikMiddleware({ render, qwikCityPlan }));

export default app;
