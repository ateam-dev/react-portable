import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  test,
  expect,
  vi,
} from "vitest";
import { RpPreview } from "./element";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { register } from "./register";

const restSpy = vi.fn();
const restHandlers = [rest.post(`/_fragments/:code`, restSpy)];
restSpy.mockImplementation((req, res, ctx) => {
  const { code } = req.params;

  if (code === "404") return res(ctx.status(404));

  if (code === "with-children")
    return res(
      ctx.status(200),
      ctx.text(
        `<rp-fragment>${code} ${req.body} <rp-slot _key="children"></rp-slot></rp-fragment>`,
      ),
    );

  return res(
    ctx.status(200),
    ctx.text(`<rp-fragment>${code} ${req.body}</rp-fragment>`),
  );
});

const server = setupServer(...restHandlers);

beforeAll(() => {
  window.__previewifyDebug = true;
  register();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("rp-preview", () => {
  test("preview and rerender", async () => {
    document.body.innerHTML = `<rp-preview code="code1"><rp-preview-area>original content</rp-preview-area></rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    // preview
    await element.preview({ foo: "bar" });
    expect(element.innerHTML).toBe(
      '<rp-preview-area><rp-fragment>code1 {"foo":"bar"}</rp-fragment></rp-preview-area>',
    );
    expect(restSpy).toBeCalledTimes(1);

    // rerender
    await element.rerender({ foo: "baz" });
    expect(element.innerHTML).toBe(
      '<rp-preview-area><rp-fragment>code1 {"foo":"baz"}</rp-fragment></rp-preview-area>',
    );
    expect(restSpy).toBeCalledTimes(2);

    // If props do not change, requests are suppressed
    await element.rerender({ foo: "baz" });
    expect(restSpy).toBeCalledTimes(2);

    // If preview is called, the request is forced regardless of props
    await element.preview();
    expect(restSpy).toBeCalledTimes(3);

    // If true is passed to the rerender argument, it is forced to request
    await element.rerender(undefined, true);
    expect(restSpy).toBeCalledTimes(4);
  });

  test("preview with functional props", async () => {
    document.body.innerHTML = `<rp-preview code="code"><rp-preview-area>original content</rp-preview-area></rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    const onClickMock = vi.fn();

    // preview
    await element.preview({ foo: "bar", onClick: onClickMock });
    expect(element.innerHTML).toBe(
      '<rp-preview-area><rp-fragment>code {"foo":"bar","onClick":"__function__#dummy-uuid#rp-preview-event"}</rp-fragment></rp-preview-area>',
    );

    // dispatch event from previewing component
    element.dispatchEvent(
      new CustomEvent("rp-preview-event", {
        detail: {
          key: "onClick",
          args: ["foo", "bar"],
        },
      }),
    );

    expect(onClickMock).toHaveBeenLastCalledWith("foo", "bar");
    expect(onClickMock).toBeCalledTimes(1);

    // rerender
    await element.rerender({ foo: "baz", onClick: onClickMock });
    expect(element.innerHTML).toBe(
      '<rp-preview-area><rp-fragment>code {"foo":"baz","onClick":"__function__#dummy-uuid#rp-preview-event"}</rp-fragment></rp-preview-area>',
    );

    // dispatch event from previewing component
    element.dispatchEvent(
      new CustomEvent("rp-preview-event", {
        detail: {
          key: "onClick",
          args: ["foo", "baz"],
        },
      }),
    );

    expect(onClickMock).toHaveBeenLastCalledWith("foo", "baz");
    expect(onClickMock).toBeCalledTimes(2);
  });

  test("preview with rp-outlet", async () => {
    document.body.innerHTML = `<rp-preview code="with-children"><rp-preview-area>original content</rp-preview-area><rp-outlet _key="children">original children</rp-outlet></rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    // preview
    await element.preview({ foo: "bar", children: { type: "", props: {} } });
    expect(element.innerHTML).toBe(
      '<rp-preview-area><rp-fragment>with-children {"foo":"bar","children":"__outlet__"} <rp-slot _key="children"><rp-outlet _key="children">original children</rp-outlet></rp-slot></rp-fragment></rp-preview-area>',
    );

    // rerender
    await element.rerender({ foo: "baz", children: { type: "", props: {} } });
    expect(element.innerHTML).toBe(
      '<rp-preview-area><rp-fragment>with-children {"foo":"baz","children":"__outlet__"} <rp-slot _key="children"><rp-outlet _key="children">original children</rp-outlet></rp-slot></rp-fragment></rp-preview-area>',
    );
  });

  test("the code is not set", async () => {
    const log = vi.spyOn(console, "error").mockImplementationOnce(() => {});

    document.body.innerHTML = `<rp-preview><rp-preview-area>original content</rp-preview-area></rp-preview>`;

    expect(log).toBeCalledWith("rp-preview: The code is not set.");
  });

  test("failed on fetching a fragment", async () => {
    document.body.innerHTML = `<rp-preview code="404"><rp-preview-area>original content</rp-preview-area></rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    await expect(element.preview({ foo: "bar" })).rejects.toThrowError(
      "rp-preview: Failed to retrieve fragment",
    );
  });

  test("<rp-preview-area /> is not set", async () => {
    const log = vi.spyOn(console, "error").mockImplementationOnce(() => {});

    document.body.innerHTML = `<rp-preview>original content</rp-preview>`;

    expect(log).toBeCalledWith("rp-preview: <rp-preview-area /> is not set.");
  });
});
