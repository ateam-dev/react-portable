import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { qwikMiddleware } from "@hono/qwik-city";

import { Hono } from "hono";

const app = new Hono();
app.get("*", qwikMiddleware({ render, qwikCityPlan }));

export default app;
