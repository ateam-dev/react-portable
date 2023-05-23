export {
  CLASS_NAME_FOR_GATEWAY_CACHE,
  CUSTOM_HEADER_KEY_GATEWAY,
} from "@react-portable/client";
export const CUSTOM_HEADER_KEY_CACHE_STATUS = "X-React-Portable-Cache-Status";
export const CUSTOM_HEADER_KEY_STALE_AT = "X-React-Portable-Stale-At";
export const cacheStatus = {
  stale: "Stale",
  fresh: "Fresh",
} as const;
