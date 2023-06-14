import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { createFragmentId } from "./react-portable";
import { registerReactPortable } from "./register";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { setTimeout } from "node:timers/promises";

const mockFn = vi.fn();

const restHandlers = [
  rest.get(
    "https://basepage.com/_fragments/:code/:component",
    (req, res, ctx) => {
      const { code, component } = req.params;
      mockFn(req.headers);
      return res(
        ctx.status(200),
        ctx.text(
          `<react-portable-fragment>${code} ${component}</react-portable-fragment>`
        )
      );
    }
  ),
  rest.get("https://gw.com/_fragments/:code/:component", (req, res, ctx) => {
    const { code, component } = req.params;
    mockFn(req.headers);
    return res(
      ctx.status(200),
      ctx.text(
        `<react-portable-fragment>pass gw; ${code} ${component}</react-portable-fragment>`
      )
    );
  }),
  rest.get(/.*/, (req, res, ctx) => {
    return res(ctx.status(404), ctx.text("not found"));
  }),
];

const server = setupServer(...restHandlers);

const prepare = async (
  body: string,
  templates: { innerHTML: string; entry: string; gateway?: string }[] = []
) => {
  for (const { innerHTML, gateway, entry } of templates) {
    const template = document.createElement("template");
    template.id = createFragmentId(entry, gateway);
    template.className = "react-portable-gateway-cache";
    template.innerHTML = innerHTML;
    document.head.appendChild(template);
  }

  document.body.innerHTML = body;
  const rp = document.querySelector("react-portable")!;

  const failCheck = async (resolve: (v: unknown) => void): Promise<void> => {
    // @ts-ignore
    if (rp.failed) return resolve();
    await setTimeout(100);
    return failCheck(resolve);
  };

  const piercedCheck = async (resolve: (v: unknown) => void): Promise<void> => {
    // @ts-ignore
    if (rp.pierced) return resolve();
    await setTimeout(100);
    return piercedCheck(resolve);
  };

  await Promise.race([
    new Promise((r) => piercedCheck(r)),
    new Promise((r) => failCheck(r)),
  ]);

  return rp;
};

beforeAll(() => {
  registerReactPortable();
  server.listen({ onUnhandledRequest: "error" });
});
beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ReactPortable", () => {
  test("default", async () => {
    const rpPromise = prepare(
      '<react-portable entry="f1:/component1"></react-portable>'
    );
    expect(
      document.querySelector("react-portable")!.getAttribute("loading")
    ).toBe("");

    const rp = await rpPromise;

    expect(rp.innerHTML).toBe(
      `<react-portable-fragment>f1 component1</react-portable-fragment>`
    );
    expect(
      document.querySelector("react-portable")!.getAttribute("loading")
    ).toBe(null);
    expect(mockFn.mock.lastCall[0].get("X-React-Portable-Gateway")).toBe(null);
  });

  test("use gateway", async () => {
    const rp = await prepare(
      '<react-portable entry="f1:/component1" gateway="https://gw.com"></react-portable>'
    );

    expect(rp.innerHTML).toBe(
      `<react-portable-fragment>pass gw; f1 component1</react-portable-fragment>`
    );
    expect(mockFn.mock.lastCall[0].get("X-React-Portable-Gateway")).toBe(
      "https://gw.com"
    );
  });

  test("piercing is succeed on gateway", async () => {
    const rp = await prepare(
      '<react-portable entry="f1:/component1" pierced="succeed"><react-portable-fragment>f1 component1</react-portable-fragment></react-portable>'
    );

    expect(rp.innerHTML).toBe(
      `<react-portable-fragment>f1 component1</react-portable-fragment>`
    );
    expect(mockFn).not.toBeCalled();
  });

  test("piercing is failed on gateway", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await prepare(
      '<react-portable entry="f1:/component1" pierced="failed"></react-portable>'
    );

    expect(spy).toBeCalledWith(
      Error(
        "Failed to retrieve fragment (entry: f1:/component1, gateway: -) on the gateway."
      )
    );
  });

  test("use gateway cache", async () => {
    const rp = await prepare(
      '<react-portable entry="f1:/component1"></react-portable>',
      [
        {
          innerHTML: `<react-portable-fragment>f1 component1 cached</react-portable-fragment>`,
          entry: "f1:/component1",
        },
      ]
    );

    expect(rp.innerHTML).toBe(
      `<react-portable-fragment>f1 component1 cached</react-portable-fragment>`
    );
    expect(mockFn).not.toBeCalled();
  });

  test("without entry attribute", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await prepare(
      '<react-portable entry="" gateway="https://gw.com"></react-portable>'
    );
    expect(spy).toBeCalledWith(
      Error("The react portable component has been applied without `entry`")
    );
  });

  test("wrong entry format", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // no coron　for separate
    await prepare('<react-portable entry="f1/component1"></react-portable>');
    expect(spy).toBeCalledWith(
      Error(
        "The react portable component has been applied with wrong format `entry`"
      )
    );
  });

  test("bad fragment request", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const promise = prepare(
      '<react-portable entry="f1:/component1" gateway="https://not-exist.gw.com"></react-portable>'
    );
    expect(
      document.querySelector("react-portable")!.getAttribute("loading")
    ).toBe("");

    await promise;

    expect(spy).toBeCalledWith(
      Error(
        "Failed to retrieve fragment (entry: f1:/component1, gateway: https://not-exist.gw.com)"
      )
    );
    expect(
      document.querySelector("react-portable")!.getAttribute("loading")
    ).toBe(null);
  });
});
