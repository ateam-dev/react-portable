import { component$ } from "@builder.io/qwik";

import { qwikify$ } from "@builder.io/qwik-react";
import ReactComponent from "~/integrations/react/Sample";

const Component = qwikify$(ReactComponent, { eagerness: "hover" });

const Page = component$(() => {
  return <Component />;
});

export default Page;
