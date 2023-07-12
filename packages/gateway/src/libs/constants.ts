import { ReactPortable } from "@react-portable/client/web-components";
export const CLASS_NAME_FOR_GATEWAY_CACHE =
  ReactPortable.CLASS_NAME_FOR_GATEWAY_CACHE;
export const CUSTOM_HEADER_KEY_GATEWAY =
  ReactPortable.CUSTOM_HEADER_KEY_GATEWAY;
export const CUSTOM_HEADER_KEY_CACHE_STATUS = "X-React-Portable-Cache-Status";
export const CUSTOM_HEADER_KEY_STALE_AT = "X-React-Portable-Stale-At";
export const cacheStatus = {
  stale: "Stale",
  fresh: "Fresh",
} as const;
