import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  FragmentConfigs,
  getFragmentsForPiercing,
  prepareFragmentConfigs,
} from "./fragments";
import { ReactPortable } from "@react-portable/client/web-components";

const fragmentConfigs: FragmentConfigs = {
  f1: { endpoint: "https://f1.com", assetPath: "" },
  f2: {
    endpoint: "https://f2.com",
    assetPath: "https://assets.f2.com/statics",
  },
};

const fragments = {
  f1: {
    component1: `<rp-fragment q:base="/build/">f1:component1</rp-fragment>`,
    component2: `<rp-fragment q:base="/build/">f1:component2</rp-fragment>`,
  },
  f2: {
    component1: `<rp-fragment q:base="/build/">f2:component1</rp-fragment>`,
    component2: `<rp-fragment q:base="/build/">f2:component2</rp-fragment>`,
  },
};

const fetchMock = vi.fn().mockImplementation(async (request: Request) => {
  if (request.url === "https://f1.com/component1")
    return new Response(fragments.f1.component1);
  if (request.url === "https://f1.com/component2")
    return new Response(fragments.f1.component2);
  if (request.url === "https://f2.com/component1")
    return new Response(fragments.f2.component1);
  if (request.url === "https://f2.com/component2")
    return new Response(fragments.f2.component2);

  return new Response(null, { status: 404, statusText: "not found" });
});

describe("fragments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareFragmentConfigs(fragmentConfigs);
  });
  describe("getFragmentsForPiercing", () => {
    test("normal id (not included gateway and not has assetPath on fragment remote)", async () => {
      const id1 = ReactPortable.createFragmentId("f1:/component1");
      const id2 = ReactPortable.createFragmentId("f1:/component2");

      const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

      expect(fragments.get(id1)!.body).toEqual(
        `<rp-fragment q:base="/_fragments/f1/build/">f1:component1</rp-fragment>`,
      );
      expect(fragments.get(id2)!.body).toBe(
        `<rp-fragment q:base="/_fragments/f1/build/">f1:component2</rp-fragment>`,
      );

      expect(fetchMock.mock.calls[0][0].url).toBe("https://f1.com/component1");
      expect(fetchMock.mock.calls[1][0].url).toBe("https://f1.com/component2");
    });
  });

  test("with assetPath", async () => {
    const id1 = ReactPortable.createFragmentId("f2:/component1");
    const id2 = ReactPortable.createFragmentId("f2:/component2");

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.get(id1)!.body).toBe(
      `<rp-fragment q:base="https://assets.f2.com/statics/build/">f2:component1</rp-fragment>`,
    );
    expect(fragments.get(id2)!.body).toBe(
      `<rp-fragment q:base="https://assets.f2.com/statics/build/">f2:component2</rp-fragment>`,
    );
    expect(fetchMock.mock.calls[0][0].url).toBe("https://f2.com/component1");
    expect(fetchMock.mock.calls[1][0].url).toBe("https://f2.com/component2");
  });

  test("gateway is ignored (gateway is data to be used by clients)", async () => {
    const id1 = ReactPortable.createFragmentId(
      "f1:/component1",
      "https://gw1.com",
    );
    const id2 = ReactPortable.createFragmentId(
      "f2:/component1",
      "https://gw2.com",
    );

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.get(id1)!.body).toBe(
      `<rp-fragment q:base="/_fragments/f1/build/">f1:component1</rp-fragment>`,
    );
    expect(fragments.get(id2)!.body).toBe(
      `<rp-fragment q:base="https://assets.f2.com/statics/build/">f2:component1</rp-fragment>`,
    );
    expect(fetchMock.mock.calls[0][0].url).toBe("https://f1.com/component1");
    expect(fetchMock.mock.calls[1][0].url).toBe("https://f2.com/component1");
  });

  test("request for not existing fragment code", async () => {
    const id1 = ReactPortable.createFragmentId("not-exist-code1:/component1");
    const id2 = ReactPortable.createFragmentId(
      "not-exist-code2:/component2",
      "https://gw.com",
    );

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.size).toBe(0);
    expect(fetchMock).not.toBeCalled();
  });

  test("404 request", async () => {
    const id1 = ReactPortable.createFragmentId("f1:/not-exist-component");
    const id2 = ReactPortable.createFragmentId("f2:/not-exist-component");

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.get(id1)).toEqual({
      ok: false,
      body: null,
      status: 404,
      statusText: "not found",
    });
    expect(fragments.get(id2)).toEqual({
      ok: false,
      body: null,
      status: 404,
      statusText: "not found",
    });

    expect(fetchMock.mock.calls[0][0].url).toBe(
      "https://f1.com/not-exist-component",
    );
    expect(fetchMock.mock.calls[1][0].url).toBe(
      "https://f2.com/not-exist-component",
    );
  });
  test("invalid id format", async () => {
    const id1 = ReactPortable.createFragmentId("f1not-exist-component");
    const id2 = ReactPortable.createFragmentId("f2not-exist-component");

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.size).toBe(0);
    expect(fetchMock).not.toBeCalled();
  });
});
