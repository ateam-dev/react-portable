import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { qwikMiddleware } from "@hono/qwik-city";
import { Hono } from "hono";

const sha1 = async (message: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-1", data);

  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const app = new Hono();
app.get("*", async (c, next) => {
  let etag: string = "";
  if (c.env?.__STATIC_CONTENT_MANIFEST) {
    etag = await sha1(btoa(JSON.stringify(c.env.__STATIC_CONTENT_MANIFEST)));
    const ifNoneMatch = c.req.header("If-None-Match");
    if (ifNoneMatch === etag)
      return new Response(null, {
        status: 304,
        statusText: "Not Modified",
        headers: {
          ETag: etag,
        },
      });
  }

  await next();
  etag && c.res.headers.set("ETag", etag);
});
app.get("*", qwikMiddleware({ render, qwikCityPlan }));

export default app;
