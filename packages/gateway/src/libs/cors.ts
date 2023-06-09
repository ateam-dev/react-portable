import { CUSTOM_HEADER_KEY_GATEWAY } from "./constants";

export type CorsSetting = { origin: string[] | string };

export const corsHeader = (
  origin: string | null,
  setting: CorsSetting,
  baseHeaders?: Headers
) => {
  const headers = baseHeaders ?? new Headers();
  if (typeof setting?.origin === "string") {
    headers.set("Access-Control-Allow-Origin", setting.origin);
  } else if (origin && setting?.origin.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    `Content-Type, Accept, ${CUSTOM_HEADER_KEY_GATEWAY}`
  );
  return headers;
};
