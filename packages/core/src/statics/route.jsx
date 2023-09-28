import { qwikify$ } from "@builder.io/qwik-react";
import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import * as Entries from "__entryPath__";

const Entry = Object.values(Entries).find((module) => {
  if (
    ["function", "object"].includes(typeof module) &&
    module !== null &&
    "__code" in module
  )
    return module.__code === "__code__";
});

const QComponent = qwikify$(Entry.__forQwik, {
  eagerness: "idle",
});

const getProps = routeLoader$(async ({ request }) => {
  if (request.method === "POST") return await request.json();

  return {};
});

export default component$(() => {
  return <QComponent {...getProps().value} />;
});
