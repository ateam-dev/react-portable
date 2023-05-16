import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { registerReactPortable } from "react-portable-client";

registerReactPortable();

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
