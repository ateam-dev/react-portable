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
        `<rp-fragment>${code} ${req.body} <rp-slot></rp-slot></rp-fragment>`,
      ),
    );

  return res(
    ctx.status(200),
    ctx.text(`<rp-fragment>${code} ${req.body}</rp-fragment>`),
  );
});

const server = setupServer(...restHandlers);

beforeAll(() => {
  register();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("rp-preview", () => {
  test("preview and rerender", async () => {
    document.body.innerHTML = `<rp-preview code="code1">original content</rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    element.props = { foo: "bar" };
    // preview
    await element.preview();
    expect(element.innerHTML).toBe(
      '<rp-fragment>code1 {"foo":"bar"}</rp-fragment>',
    );
    expect(restSpy).toBeCalledTimes(1);

    element.props = { foo: "baz" };
    // rerender
    await element.rerender();
    expect(element.innerHTML).toBe(
      '<rp-fragment>code1 {"foo":"baz"}</rp-fragment>',
    );
    expect(restSpy).toBeCalledTimes(2);

    // If props do not change, requests are suppressed
    await element.rerender();
    expect(restSpy).toBeCalledTimes(2);

    // If preview is called, the request is forced regardless of props
    await element.preview();
    expect(restSpy).toBeCalledTimes(3);

    // If true is passed to the rerender argument, it is forced to request
    await element.rerender(true);
    expect(restSpy).toBeCalledTimes(4);
  });

  test("preview with functional props", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(
      "dummy-uuid" as ReturnType<typeof crypto.randomUUID>,
    );

    document.body.innerHTML = `<rp-preview code="code">original content</rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    const onClickMock = vi.fn();

    element.props = { foo: "bar", onClick: onClickMock };
    // preview
    await element.preview();
    expect(element.innerHTML).toBe(
      '<rp-fragment>code {"foo":"bar","onClick":"__function__:dummy-uuid:onClick"}</rp-fragment>',
    );

    // dispatch event from previewing component
    window.dispatchEvent(
      new CustomEvent("rp-preview-message", {
        detail: {
          uuid: "dummy-uuid",
          path: "onClick",
          args: ["foo", "bar"],
        },
      }),
    );

    expect(onClickMock).toHaveBeenLastCalledWith("foo", "bar");
    expect(onClickMock).toBeCalledTimes(1);

    element.props = { foo: "baz", onClick: onClickMock };
    // rerender
    await element.rerender();
    expect(element.innerHTML).toBe(
      '<rp-fragment>code {"foo":"baz","onClick":"__function__:dummy-uuid:onClick"}</rp-fragment>',
    );

    // dispatch event from previewing component
    window.dispatchEvent(
      new CustomEvent("rp-preview-message", {
        detail: {
          uuid: "dummy-uuid",
          path: "onClick",
          args: ["foo", "baz"],
        },
      }),
    );

    expect(onClickMock).toHaveBeenLastCalledWith("foo", "baz");
    expect(onClickMock).toBeCalledTimes(2);
  });

  test("preview with children", async () => {
    document.body.innerHTML = `<rp-preview code="with-children">original content<rp-outlet>original children</rp-outlet></rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    element.props = { foo: "bar" };
    // preview
    await element.preview();
    expect(element.innerHTML).toBe(
      '<rp-fragment>with-children {"foo":"bar"} <rp-slot><rp-outlet>original children</rp-outlet></rp-slot></rp-fragment>',
    );

    element.props = { foo: "baz" };
    // rerender
    await element.rerender();
    expect(element.innerHTML).toBe(
      '<rp-fragment>with-children {"foo":"baz"} <rp-slot><rp-outlet>original children</rp-outlet></rp-slot></rp-fragment>',
    );
  });

  test("the code is not set", async () => {
    const log = vi.spyOn(console, "error").mockImplementationOnce(() => {});

    document.body.innerHTML = `<rp-preview>original content</rp-preview>`;

    expect(log).toBeCalledWith("rp-preview: The code is not set.");
  });

  test("failed on fetching a fragment", async () => {
    document.body.innerHTML = `<rp-preview code="404">original content</rp-preview>`;

    const element = document.querySelector<RpPreview>(`rp-preview`)!;

    element.props = { foo: "bar" };
    await expect(element.preview()).rejects.toThrowError(
      "rp-preview: Failed to retrieve fragment",
    );
  });
});
