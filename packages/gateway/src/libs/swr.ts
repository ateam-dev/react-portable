import {
  CUSTOM_HEADER_KEY_CACHE_STATUS,
  cacheStatus,
  CUSTOM_HEADER_KEY_STALE_AT,
} from "./constants";

type MetaData = {
  etag: string | null;
  staleAt: string;
  headers: Record<string, string>;
};

let kv: KVNamespace;
export const prepareSwr = (_kv: KVNamespace) => {
  kv = _kv;
};

export const swr = async (request: Request) => {
  const { metadata, value: cache } = await kv.getWithMetadata<MetaData>(
    request.url,
    "arrayBuffer"
  );

  if (cache) {
    const response = new Response(cache, {
      headers: {
        ...(metadata?.headers ?? {}),
        ...(metadata?.staleAt
          ? {
              [CUSTOM_HEADER_KEY_CACHE_STATUS]: isStale(metadata.staleAt)
                ? cacheStatus.stale
                : cacheStatus.fresh,
              [CUSTOM_HEADER_KEY_STALE_AT]: metadata.staleAt,
            }
          : {}),
      },
    });
    const revalidate = createRevalidate(request, response, metadata?.etag);

    return { response, revalidate };
  }

  const response = await fetch(request);
  const store = createStore(request, response);

  return { response, revalidate: store };
};

const createRevalidate =
  (request: Request, cache: Response, etag?: string | null) => async () => {
    const isCacheFresh =
      cache.headers.get(CUSTOM_HEADER_KEY_CACHE_STATUS) === cacheStatus.fresh;

    // Even if the cache is fresh, check for origin modifications
    const response = await fetch(request, {
      headers: {
        ...request.headers,
        ...(isCacheFresh && etag ? { "If-None-Match": etag } : {}),
      },
    });

    if (response.status === 304) return;

    return createStore(request, response)();
  };

const createStore = (request: Request, response: Response) => async () => {
  if (!isCacheable(request, response) || !response.body) return;

  const [staleAt, expirationTtl] = getCacheTimes(response);
  const metadata: MetaData = {
    etag: response.headers.get("Etag"),
    staleAt: staleAt.toISOString(),
    headers: Object.fromEntries(response.headers.entries()),
  };
  await kv.put(request.url, response.clone().body as ReadableStream, {
    metadata,
    expirationTtl,
  });
};

const isCacheable = (request: Request, response: Response) => {
  const contentType = response.headers.get("Content-Type");
  if (!contentType || !contentType.includes("text/html")) return false;

  // https://vercel.com/docs/concepts/edge-network/caching#cacheable-response-criteria
  if (!["GET", "HEAD"].includes(request.method)) return false;
  if (request.headers.has("Range")) return false;
  if (request.headers.has("Authorization")) return false;
  if (![200, 404, 301, 308].includes(response.status)) return false;
  const contentLength = Number(response.headers.get("Content-Length"));
  if (Number.isNaN(contentLength) || contentLength / 1024 ** 2 > 10)
    return false;
  if (response.headers.has("set-cookie")) return false;
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !(
    cacheControl.includes("private") ||
    cacheControl.includes("no-cache") ||
    cacheControl.includes("no-store")
  );
};

const isStale = (expireAt?: string) => {
  if (!expireAt) return true;
  return new Date(expireAt) < new Date();
};

const getDirectiveValue = (
  directives: string[],
  name: string
): number | null => {
  const directive = directives.find((d) => d.startsWith(`${name}=`));
  return directive ? parseInt(directive.split("=")[1]!) : null;
};

const getCacheTimes = (response: Response): [Date, number] => {
  const cacheControl = response.headers.get("Cache-Control");

  if (!cacheControl) return [new Date(0), 0];

  const directives = cacheControl
    .split(",")
    .map((directive) => directive.trim());

  const sMaxAge = getDirectiveValue(directives, "s-maxage") ?? 0;
  const staleWhileRevalidate =
    getDirectiveValue(directives, "stale-while-revalidate") ?? 0;

  const now = new Date();
  const staleAt = new Date(now.getTime() + sMaxAge * 1000);
  const forbiddenTTL = sMaxAge + staleWhileRevalidate;

  return [staleAt, forbiddenTTL];
};
