import { beforeEach, describe, expect, test, vi } from "vitest";
import { getFragmentsForPiercing, prepareFragmentConfigs } from "./fragments";
import { createFragmentId } from "@react-portable/client";

const fragmentConfigs = {
  f1: { origin: "https://f1.com", assetPath: "" },
  f2: { origin: "https://f2.com", assetPath: "https://assets.f2.com/statics" },
};

const fragments = {
  f1: {
    component1: `<react-portable-fragment q:base="/build/">f1:component1</react-portable-fragment>`,
    component2: `<react-portable-fragment q:base="/build/">f1:component2</react-portable-fragment>`,
  },
  f2: {
    component1: `<react-portable-fragment q:base="/build/">f2:component1</react-portable-fragment>`,
    component2: `<react-portable-fragment q:base="/build/">f2:component2</react-portable-fragment>`,
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

  return new Response(null, { status: 404 });
});

describe("fragments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareFragmentConfigs(JSON.stringify(fragmentConfigs));
  });
  describe("getFragmentsForPiercing", () => {
    test("normal id (not included gateway and not has assetPath on fragment remote)", async () => {
      const id1 = createFragmentId("f1:/component1");
      const id2 = createFragmentId("f1:/component2");

      const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

      expect(fragments.get(id1)).toBe(
        `<react-portable-fragment q:base="/_fragments/f1/build/">f1:component1</react-portable-fragment>`
      );
      expect(fragments.get(id2)).toBe(
        `<react-portable-fragment q:base="/_fragments/f1/build/">f1:component2</react-portable-fragment>`
      );

      expect(fetchMock.mock.calls[0][0].url).toBe("https://f1.com/component1");
      expect(fetchMock.mock.calls[1][0].url).toBe("https://f1.com/component2");
    });
  });

  test("with assetPath", async () => {
    const id1 = createFragmentId("f2:/component1");
    const id2 = createFragmentId("f2:/component2");

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.get(id1)).toBe(
      `<react-portable-fragment q:base="https://assets.f2.com/statics/build/">f2:component1</react-portable-fragment>`
    );
    expect(fragments.get(id2)).toBe(
      `<react-portable-fragment q:base="https://assets.f2.com/statics/build/">f2:component2</react-portable-fragment>`
    );
    expect(fetchMock.mock.calls[0][0].url).toBe("https://f2.com/component1");
    expect(fetchMock.mock.calls[1][0].url).toBe("https://f2.com/component2");
  });

  test("gateway is ignored (gateway is data to be used by clients)", async () => {
    const id1 = createFragmentId("f1:/component1", "https://gw1.com");
    const id2 = createFragmentId("f2:/component1", "https://gw2.com");

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.get(id1)).toBe(
      `<react-portable-fragment q:base="/_fragments/f1/build/">f1:component1</react-portable-fragment>`
    );
    expect(fragments.get(id2)).toBe(
      `<react-portable-fragment q:base="https://assets.f2.com/statics/build/">f2:component1</react-portable-fragment>`
    );
    expect(fetchMock.mock.calls[0][0].url).toBe("https://f1.com/component1");
    expect(fetchMock.mock.calls[1][0].url).toBe("https://f2.com/component1");
  });

  test("request for not existing fragment code", async () => {
    const id1 = createFragmentId("not-exist-code1:/component1");
    const id2 = createFragmentId(
      "not-exist-code2:/component2",
      "https://gw.com"
    );

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.size).toBe(0);
    expect(fetchMock).not.toBeCalled();
  });

  test("404 request", async () => {
    const id1 = createFragmentId("f1:/not-exist-component");
    const id2 = createFragmentId("f2:/not-exist-component");

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.size).toBe(0);
    expect(fetchMock.mock.calls[0][0].url).toBe(
      "https://f1.com/not-exist-component"
    );
    expect(fetchMock.mock.calls[1][0].url).toBe(
      "https://f2.com/not-exist-component"
    );
  });
  test("invalid id format", async () => {
    const id1 = createFragmentId("f1not-exist-component");
    const id2 = createFragmentId("f2not-exist-component");

    const fragments = await getFragmentsForPiercing([id1, id2], fetchMock);

    expect(fragments.size).toBe(0);
    expect(fetchMock).not.toBeCalled();
  });
});
