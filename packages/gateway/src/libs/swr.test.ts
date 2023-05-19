import { afterEach, beforeEach, expect, SpyInstance, test, vi } from "vitest";
import { prepareSwr, swr } from "./swr";

const describe = setupMiniflareIsolatedStorage();
const { TEST_KV } = getMiniflareBindings();

const body = "Mocked response!";

const cacheableHeader = {
  "content-type": "text/html; charset=utf-8",
  "content-length": Buffer.byteLength(body, "utf8").toString(),
  "cache-control": "public, s-maxage=60, stale-while-revalidate=3600",
  etag: "current-etag",
} as const;
type KeyOfCacheableHeader = keyof typeof cacheableHeader;

const omitCacheableHeader = (omits: KeyOfCacheableHeader[]) => {
  return Object.fromEntries(
    Object.entries(cacheableHeader).filter(
      ([k]) => !omits.includes(k as KeyOfCacheableHeader)
    )
  );
};

const originUrl = "https://example.com/";

const dummyResponse = ({
  ignoreHeaderKeys = [],
  headers = {},
  status = 200,
}: {
  ignoreHeaderKeys?: KeyOfCacheableHeader[];
  headers?: Record<string, string>;
  status?: number;
} = {}) => {
  if (status === 304) return new Response(null, { status });
  return new Response(body, {
    headers: {
      ...omitCacheableHeader(ignoreHeaderKeys),
      ...headers,
    },
    status,
  });
};

const dummyRequest = ({
  headers = {},
  method = "GET",
}: { headers?: Record<string, string>; method?: "POST" | "GET" } = {}) => {
  return new Request(originUrl, { headers, method });
};

describe("swr", () => {
  let kvSpy: SpyInstance;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    kvSpy = vi.spyOn(TEST_KV, "put");

    prepareSwr(TEST_KV);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  describe("not exist cache in KV", () => {
    test("origin returns cacheable response", async () => {
      const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).toHaveBeenLastCalledWith(
        request.url,
        expect.any(ReadableStream),
        {
          expirationTtl: 3660,
          metadata: {
            etag: "current-etag",
            headers: cacheableHeader,
            staleAt: "2023-01-01T00:01:00.000Z",
          },
        }
      );
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("origin returns cacheable response without etag", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(dummyResponse({ ignoreHeaderKeys: ["etag"] }));
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).toHaveBeenLastCalledWith(
        request.url,
        expect.any(ReadableStream),
        {
          expirationTtl: 3660,
          metadata: {
            etag: null,
            headers: omitCacheableHeader(["etag"]),
            staleAt: "2023-01-01T00:01:00.000Z",
          },
        }
      );
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("request is un-cacheable; included Authorization in request headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
      const request = dummyRequest({
        headers: {
          Authorization: "login-token",
        },
      });
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("request is un-cacheable; included Range in request headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
      const request = dummyRequest({
        headers: {
          Range: "1-100",
        },
      });
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("request is un-cacheable; request method is not GET or HEAD", async () => {
      const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
      const request = dummyRequest({
        method: "POST",
      });
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("origin returns un-cacheable response; content type is not html", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        dummyResponse({
          ignoreHeaderKeys: ["content-type"],
          headers: {
            "Content-Type": "application/javascript",
          },
        })
      );
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("origin returns un-cacheable response; status code is not 200, 404, 301 or 308", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(dummyResponse({ status: 500 }));
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("origin returns un-cacheable response; content is larger than 10MB", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        dummyResponse({
          ignoreHeaderKeys: ["content-length"],
          headers: {
            "Content-Length": String(1024 * 1024 * 10 + 1),
          },
        })
      );
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("origin returns un-cacheable response; included set-cookie in response header", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        dummyResponse({
          headers: {
            "Set-Cookie": "name=foo",
          },
        })
      );
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      // lock ReadableStream
      await response.text();
      await revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
      expect(mockFetch).toBeCalledTimes(1);
    });
    test("origin returns cacheable un-response; cache-control value is to prohibit cache", async () => {
      const mockFetch = vi.fn();
      const request = dummyRequest();
      let res: Awaited<ReturnType<typeof swr>>;

      // private
      mockFetch.mockResolvedValueOnce(
        dummyResponse({
          ignoreHeaderKeys: ["cache-control"],
          headers: {
            "Cache-Control": "private",
          },
        })
      );
      res = await swr(request, mockFetch);

      // lock ReadableStream
      await res.response.text();
      await res.revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();

      // no-cache
      mockFetch.mockResolvedValueOnce(
        dummyResponse({
          ignoreHeaderKeys: ["cache-control"],
          headers: {
            "Cache-Control": "no-cache",
          },
        })
      );
      res = await swr(request, mockFetch);

      // lock ReadableStream
      await res.response.text();
      await res.revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();

      // no-store
      mockFetch.mockResolvedValueOnce(
        dummyResponse({
          ignoreHeaderKeys: ["cache-control"],
          headers: {
            "Cache-Control": "no-store",
          },
        })
      );
      res = await swr(request, mockFetch);

      // lock ReadableStream
      await res.response.text();
      await res.revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();

      // no cache-control
      mockFetch.mockResolvedValueOnce(
        dummyResponse({
          ignoreHeaderKeys: ["cache-control"],
        })
      );
      res = await swr(request, mockFetch);

      // lock ReadableStream
      await res.response.text();
      await res.revalidate(mockFetch);
      expect(kvSpy).not.toBeCalled();
    });
  });

  describe("fresh cache exists in KV", () => {
    beforeEach(async () => {
      await TEST_KV.put(originUrl, body, {
        expirationTtl: 3660,
        metadata: {
          etag: "current-etag",
          headers: cacheableHeader,
          staleAt: "2023-01-01T00:01:00.000Z",
        },
      });
      vi.clearAllMocks();
    });
    test("origin responds with 304 for revalidate", async () => {
      const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
      const mockRevalidateFetch = vi.fn().mockResolvedValue(
        dummyResponse({
          status: 304,
        })
      );
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      await response.text();
      await revalidate(mockRevalidateFetch);

      // fetched with If-None-Match header
      expect(
        mockRevalidateFetch.mock.lastCall[1].headers.get("If-None-Match")
      ).toBe("current-etag");

      // do not need to update KV value
      expect(kvSpy).not.toBeCalled();

      expect(mockFetch).not.toBeCalled();
      expect(mockRevalidateFetch).toBeCalledTimes(1);
    });

    test("origin responds new content for revalidate", async () => {
      const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
      const mockRevalidateFetch = vi.fn().mockResolvedValue(
        dummyResponse({
          ignoreHeaderKeys: ["etag"],
          headers: { Etag: "new-etag" },
        })
      );
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      await response.text();
      await revalidate(mockRevalidateFetch);

      // fetched with If-None-Match header
      expect(
        mockRevalidateFetch.mock.lastCall[1].headers.get("If-None-Match")
      ).toBe("current-etag");

      expect(kvSpy).toHaveBeenLastCalledWith(
        request.url,
        expect.any(ReadableStream),
        {
          expirationTtl: 3660,
          metadata: {
            etag: "new-etag",
            headers: {
              ...cacheableHeader,
              etag: "new-etag",
            },
            staleAt: "2023-01-01T00:01:00.000Z",
          },
        }
      );

      expect(mockFetch).not.toBeCalled();
      expect(mockRevalidateFetch).toBeCalledTimes(1);
    });
  });

  describe("stale cache exists in KV", () => {
    beforeEach(async () => {
      await TEST_KV.put(originUrl, body, {
        expirationTtl: 3660,
        metadata: {
          etag: "current-etag",
          headers: cacheableHeader,
          // already stale
          staleAt: "2022-12-31T23:59:59.000Z",
        },
      });
      vi.clearAllMocks();
    });

    test("not include Etag on header of revalidate request", async () => {
      const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
      const request = dummyRequest();
      const { revalidate, response } = await swr(request, mockFetch);

      await response.text();
      await revalidate(mockFetch);

      // fetched without If-None-Match header
      expect(mockFetch.mock.lastCall[1].headers.get("If-None-Match")).toBe(
        null
      );

      expect(kvSpy).toHaveBeenLastCalledWith(
        request.url,
        expect.any(ReadableStream),
        {
          expirationTtl: 3660,
          metadata: {
            etag: "current-etag",
            headers: cacheableHeader,
            staleAt: "2023-01-01T00:01:00.000Z",
          },
        }
      );

      expect(mockFetch).toBeCalledTimes(1);
    });
  });

  test("not saved metadata on KV", async () => {
    await TEST_KV.put(originUrl, body, {
      expirationTtl: 3660,
    });
    vi.clearAllMocks();

    const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
    const request = dummyRequest();
    const { revalidate, response } = await swr(request, mockFetch);

    await response.text();
    await revalidate(mockFetch);

    // fetched without If-None-Match header
    expect(mockFetch.mock.lastCall[1].headers.get("If-None-Match")).toBe(null);

    expect(kvSpy).toHaveBeenLastCalledWith(
      request.url,
      expect.any(ReadableStream),
      {
        expirationTtl: 3660,
        metadata: {
          etag: "current-etag",
          headers: cacheableHeader,
          staleAt: "2023-01-01T00:01:00.000Z",
        },
      }
    );

    expect(mockFetch).toBeCalledTimes(1);
  });

  test("etag is null on KV metadata", async () => {
    await TEST_KV.put(originUrl, body, {
      expirationTtl: 3660,
      metadata: {
        etag: null,
        headers: omitCacheableHeader(["etag"]),
        staleAt: "2023-01-01T00:01:00.000Z",
      },
    });
    vi.clearAllMocks();

    const mockFetch = vi.fn().mockResolvedValue(dummyResponse());
    const request = dummyRequest();
    const { revalidate, response } = await swr(request, mockFetch);

    await response.text();
    await revalidate(mockFetch);

    // fetched without If-None-Match header
    expect(mockFetch.mock.lastCall[1].headers.get("If-None-Match")).toBe(null);

    expect(kvSpy).toHaveBeenLastCalledWith(
      request.url,
      expect.any(ReadableStream),
      {
        expirationTtl: 3660,
        metadata: {
          etag: "current-etag",
          headers: cacheableHeader,
          staleAt: "2023-01-01T00:01:00.000Z",
        },
      }
    );

    expect(mockFetch).toBeCalledTimes(1);
  });
  test("does not specify s-maxage but specify stale-while-revalidate", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      dummyResponse({
        ignoreHeaderKeys: ["cache-control"],
        headers: {
          "Cache-Control": "public, stale-while-revalidate=3600",
        },
      })
    );
    const request = dummyRequest();
    const { revalidate, response } = await swr(request, mockFetch);

    await response.text();
    await revalidate(mockFetch);

    // Cache at minimum ttl of KV (60s) but make it immediately stale
    expect(kvSpy).toHaveBeenLastCalledWith(
      request.url,
      expect.any(ReadableStream),
      {
        expirationTtl: 60,
        metadata: {
          etag: "current-etag",
          headers: {
            ...omitCacheableHeader(["cache-control"]),
            "cache-control": "public, stale-while-revalidate=3600",
          },
          staleAt: "2023-01-01T00:00:00.000Z",
        },
      }
    );

    expect(mockFetch).toBeCalledTimes(1);
  });
  test("does not specify stale-while-revalidate but specify s-maxage", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      dummyResponse({
        ignoreHeaderKeys: ["cache-control"],
        headers: {
          "Cache-Control": "public, s-maxage=180",
        },
      })
    );
    const request = dummyRequest();
    const { revalidate, response } = await swr(request, mockFetch);

    await response.text();
    await revalidate(mockFetch);

    // Cache for s-maxage,
    expect(kvSpy).toHaveBeenLastCalledWith(
      request.url,
      expect.any(ReadableStream),
      {
        expirationTtl: 180,
        metadata: {
          etag: "current-etag",
          headers: {
            ...omitCacheableHeader(["cache-control"]),
            "cache-control": "public, s-maxage=180",
          },
          staleAt: "2023-01-01T00:03:00.000Z",
        },
      }
    );

    expect(mockFetch).toBeCalledTimes(1);
  });
});
