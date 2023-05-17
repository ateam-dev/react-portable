import { CUSTOM_HEADER_KEY_HASH } from "./constants";

type MetaData = {
  hash: string;
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

  const promise = fetch(request);

  const revalidate = async () => {
    const response = await promise;

    if (!isCacheable(request, response) || !response.body) return;

    const hash = response.headers.get(CUSTOM_HEADER_KEY_HASH);
    const [staleAt, expirationTtl] = getCacheTimes(response);
    if (isStale(metadata?.staleAt) || metadata?.hash !== hash)
      await kv.put(request.url, response.body, {
        metadata: {
          hash,
          staleAt: staleAt.toISOString(),
          headers: Object.fromEntries(response.headers.entries()),
        },
        expirationTtl,
      });
  };

  const response =
    cache && metadata?.headers
      ? new Response(cache, {
          headers: {
            ...metadata.headers,
            "x-react-portable-cache": `staleAt: ${metadata.staleAt}`,
          },
        })
      : await promise;

  return { response: response.clone(), revalidate };
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
