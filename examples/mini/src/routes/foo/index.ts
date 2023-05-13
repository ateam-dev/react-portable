import Entry from "../../entry";
export default Entry;
import "../../global.css";

export const loader = (request: Request) => {
  const url = new URL(request.url);
  const n = url.searchParams.get("n");

  return { n: Number(n ?? "-100") };
};

export const option = {
  eagerness: "hover",
  event: ["focusin"],
} as const;
