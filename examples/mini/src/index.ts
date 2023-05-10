import Entry from "./entry";

import "./global.css";

export default Entry;

export const loader = (request: Request) => {
  const url = new URL(request.url);
  const n = url.searchParams.get("n");

  return { n: Number(n ?? "0") };
};

export const option = {
  eagerness: "hover",
  event: ["focusin"],
};
