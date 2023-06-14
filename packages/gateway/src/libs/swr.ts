import {
  CUSTOM_HEADER_KEY_CACHE_STATUS,
  cacheStatus,
  CUSTOM_HEADER_KEY_STALE_AT,
} from "./constants";

type MetaData = {
  etag: string | null;
  staleAt: string;
  headers: Record<string, string>;
  status: number;
  statusText: string;
};

type Revalidate = (f: typeof fetch) => Promise<void>;

let kv: KVNamespace;
export const prepareSwr = (_kv: KVNamespace) => {
  kv = _kv;
};

const getKvKey = (url: string) => {
  return `SWR:${url}`;
};

export const swr = async (
  request: Request,
  _fetch: typeof fetch
): Promise<{ response: Response; revalidate: Revalidate }> => {
  const { metadata, value: cache } = await kv.getWithMetadata<MetaData>(
    getKvKey(request.url),
    "arrayBuffer"
  );

  if (cache) {
    const response = new Response(cache, {
      ...(metadata?.status ? { status: metadata.status } : {}),
      ...(metadata?.statusText ? { statusText: metadata.statusText } : {}),
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

  const response = await _fetch(request);
  const store = createStore(request, response);

  return { response, revalidate: store };
};

const createRevalidate = (
  request: Request,
  cache: Response,
  etag?: string | null
): Revalidate => {
  const isCacheFresh =
    cache.headers.get(CUSTOM_HEADER_KEY_CACHE_STATUS) === cacheStatus.fresh;

  return async (_fetch: typeof fetch) => {
    // Even if the cache is fresh, check for origin modifications
    const headers = new Headers(request.headers);
    if (isCacheFresh && etag) headers.set("If-None-Match", etag);
    const response = await _fetch(request, { headers });

    if (response.status === 304) return;

    return createStore(request, response)();
  };
};

const createStore = (request: Request, response: Response) => {
  if (!isCacheable(request, response) || !response.body) return async () => {};

  const { staleAt, expirationTtl } = getCacheTimes(response);
  const metadata: MetaData = {
    etag: response.headers.get("Etag"),
    staleAt: staleAt.toISOString(),
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
    statusText: response.statusText,
  };
  const cloned = response.clone();

  return async () =>
    kv.put(getKvKey(request.url), cloned.body as ReadableStream, {
      metadata,
      // KV expirationTtl must be above 60s
      expirationTtl: Math.max(60, expirationTtl),
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
  if (response.headers.has("Set-Cookie")) return false;
  const cacheControl = response.headers.get("Cache-Control");
  if (!cacheControl) return false;
  return !(
    cacheControl.includes("private") ||
    cacheControl.includes("no-cache") ||
    cacheControl.includes("no-store")
  );
};

const isStale = (expireAt: string) => {
  return new Date(expireAt) < new Date();
};

const getDirectiveValue = (directives: string[], name: string): number => {
  const directive = directives.find((d) => d.startsWith(`${name}=`));
  return directive ? parseInt(directive.split("=")[1]!) : 0;
};

const getCacheTimes = (
  response: Response
): { staleAt: Date; expirationTtl: number } => {
  // Cache-Control is definitely present since it passes isCacheable
  const cacheControl = response.headers.get("Cache-Control")!;

  const directives = cacheControl
    .split(",")
    .map((directive) => directive.trim());

  const sMaxAge = Math.max(getDirectiveValue(directives, "s-maxage"), 0);
  const staleWhileRevalidate = getDirectiveValue(
    directives,
    "stale-while-revalidate"
  );

  const now = new Date();
  const staleAt = new Date(now.getTime() + sMaxAge * 1000);
  const expirationTtl = sMaxAge > 0 ? sMaxAge + staleWhileRevalidate : 0;

  return { staleAt, expirationTtl };
};
