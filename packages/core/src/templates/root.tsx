/** @jsxImportSource @builder.io/qwik */
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { component$ } from "@builder.io/qwik";
export default component$(() => (
  <QwikCityProvider>
    <RouterOutlet />
  </QwikCityProvider>
));
