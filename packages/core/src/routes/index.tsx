import { qwikify$ } from "@builder.io/qwik-react";
import { component$ } from "@builder.io/qwik";
import { RequestHandler, routeLoader$ } from "@builder.io/qwik-city";
// @ts-ignore
import * as Entry from "react-portable:virtual";
const QR = qwikify$(Entry.default, Entry.option);
const getProps = routeLoader$(({ request }) => {
  return Entry.loader?.(request) ?? {};
});
export default component$(() => {
  const props = getProps().value;
  return <QR {...props} />;
});
// TODO: react-portable:virtual からキャッシュのコントロールを渡せるようにする(cache: 'no-store'/revalidate: 3600)
export const onGet: RequestHandler = async (requestEvent) => {
  // requestEvent.headers.set(
  //   "Cache-Control",
  //   "public, s-maxage=604800, stale-while-revalidate="
  // );
};
