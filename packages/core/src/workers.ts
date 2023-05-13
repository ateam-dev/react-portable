import app from "./hono";
import { serveStatic } from "hono/cloudflare-workers";

app.get("/_fragments/:any/build/:asset", (c, next) => {
  return serveStatic({ root: "./", path: "/build/" + c.req.param().asset })(
    c,
    next
  );
});

app.get("*", serveStatic({ root: "./" }));

export default app;
