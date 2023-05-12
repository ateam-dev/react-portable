import app from "./hono";
import { serveStatic } from "hono/cloudflare-workers";

app.get("*", serveStatic({ root: "./" }));

export default app;
