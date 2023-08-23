/** @jsxImportSource @builder.io/qwik */
import { qwikify$ } from "@builder.io/qwik-react";
import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { PreviewifyComponent } from "../previewify";
// @ts-ignore
import * as Entries from "__entryPath__";

const Entry = Object.values(Entries).find((module) => {
  if (typeof module === "function" && "__code" in module)
    return module.__code === "__code__";
}) as PreviewifyComponent;

const QComponent__sanitized__ = qwikify$(Entry.__forQwik, {
  eagerness: "idle",
});

const getProps = routeLoader$(async ({ request, error }) => {
  if (request.method === "POST") return await request.json();

  return {};
});

export default component$(() => {
  return <QComponent__sanitized__ {...getProps().value} />;
});
