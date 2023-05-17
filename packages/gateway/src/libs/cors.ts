import { CUSTOM_HEADER_KEY_GATEWAY } from "./constants";

export const corsHeader = (
  origin: string | null,
  allowOrigins: string,
  baseHeaders?: Headers
) => {
  const headers = baseHeaders ?? new Headers();
  if (allowOrigins === "*") {
    headers.set("Access-Control-Allow-Origin", allowOrigins);
  } else if (origin && allowOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    `Content-Type, Accept, ${CUSTOM_HEADER_KEY_GATEWAY}`
  );
  return headers;
};
