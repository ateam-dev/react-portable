import { component$ } from "@builder.io/qwik";
import { qwikify$ } from "@builder.io/qwik-react";
import { routeLoader$ } from "@builder.io/qwik-city";
// @ts-ignore
import * as virtual from "react-portal:virtual";

const Component = qwikify$(virtual.default, virtual.option);

const getProps = routeLoader$<any>(
  virtual.loader ??
    (() => {
      return {};
    })
);

export default component$(() => {
  return <Component {...getProps().value} />;
});
