import Entry from "../entry";
export default Entry;
import "../global.css";
import { Loader, Strategy } from "react-portable-core/types";

export const loader: Loader = (request: Request) => {
  const url = new URL(request.url);
  const n = url.searchParams.get("n");

  return { n: Number(n ?? "0") };
};

export const strategy: Strategy = {
  cache: {
    revalidate: 0,
  },
  activate: {
    eagerness: "hover",
    event: ["focusin"],
  },
};
