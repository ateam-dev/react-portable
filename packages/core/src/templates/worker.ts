import { serveStatic } from "hono/cloudflare-workers";
import qwikCityPlan from "@qwik-city-plan";
import { qwikMiddleware } from "@hono/qwik-city";
import { Hono } from "hono";
import render from "./entry.ssr";

const app = new Hono();
app.all("*", qwikMiddleware({ render, qwikCityPlan }));
app.get("*", serveStatic({ root: "./" }));

export default app;
