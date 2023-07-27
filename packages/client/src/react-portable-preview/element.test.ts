import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  test,
  expect,
  vi,
} from "vitest";
import { ReactPortablePreview } from "./element";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { register } from "./register";

const restHandlers = [
  rest.post(`/_fragments/:remote/:code`, (req, res, ctx) => {
    const { remote, code } = req.params;

    if (code === "404") return res(ctx.status(404));

    if (code === "with-children")
      return res(
        ctx.status(200),
        ctx.text(
          `<react-portable-fragment>${remote} ${code} ${req.body} <rp-slot></rp-slot></react-portable-fragment>`,
        ),
      );

    return res(
      ctx.status(200),
      ctx.text(
        `<react-portable-fragment>${remote} ${code} ${req.body}</react-portable-fragment>`,
      ),
    );
  }),
];

const server = setupServer(...restHandlers);

beforeAll(() => {
  register();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("react-portable-preview", () => {
  test("preview and rerender", async () => {
    document.body.innerHTML = `<react-portable-preview code="code1">original content</react-portable-preview>`;

    const element = document.querySelector<ReactPortablePreview>(
      `react-portable-preview`,
    )!;

    element.props = { foo: "bar" };
    // preview
    await element.preview("https://example.com");
    expect(element.innerHTML).toBe(
      '<react-portable-fragment>https://example.com code1 {"foo":"bar"}</react-portable-fragment>',
    );

    element.props = { foo: "baz" };
    // rerender
    await element.rerender();
    expect(element.innerHTML).toBe(
      '<react-portable-fragment>https://example.com code1 {"foo":"baz"}</react-portable-fragment>',
    );
  });

  test("preview with functional props", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(
      "dummy-uuid" as ReturnType<typeof crypto.randomUUID>,
    );

    document.body.innerHTML = `<react-portable-preview code="code">original content</react-portable-preview>`;

    const element = document.querySelector<ReactPortablePreview>(
      `react-portable-preview`,
    )!;

    const onClickMock = vi.fn();

    element.props = { foo: "bar", onClick: onClickMock };
    // preview
    await element.preview("https://example.com");
    expect(element.innerHTML).toBe(
      '<react-portable-fragment>https://example.com code {"foo":"bar","onClick":"__function__:dummy-uuid:onClick"}</react-portable-fragment>',
    );

    // dispatch event from previewing component
    window.dispatchEvent(
      new CustomEvent("react-portable-preview-message", {
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
      '<react-portable-fragment>https://example.com code {"foo":"baz","onClick":"__function__:dummy-uuid:onClick"}</react-portable-fragment>',
    );

    // dispatch event from previewing component
    window.dispatchEvent(
      new CustomEvent("react-portable-preview-message", {
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
    document.body.innerHTML = `<react-portable-preview code="with-children">original content<rp-outlet>original children</rp-outlet></react-portable-preview>`;

    const element = document.querySelector<ReactPortablePreview>(
      `react-portable-preview`,
    )!;

    element.props = { foo: "bar" };
    // preview
    await element.preview("https://example.com");
    expect(element.innerHTML).toBe(
      '<react-portable-fragment>https://example.com with-children {"foo":"bar"} <rp-slot><rp-outlet>original children</rp-outlet></rp-slot></react-portable-fragment>',
    );

    element.props = { foo: "baz" };
    // rerender
    await element.rerender();
    expect(element.innerHTML).toBe(
      '<react-portable-fragment>https://example.com with-children {"foo":"baz"} <rp-slot><rp-outlet>original children</rp-outlet></rp-slot></react-portable-fragment>',
    );
  });

  test("the code is not set", async () => {
    const log = vi.spyOn(console, "error").mockImplementationOnce(() => {});

    document.body.innerHTML = `<react-portable-preview>original content</react-portable-preview>`;

    expect(log).toBeCalledWith("react-portable-preview: The code is not set.");
  });

  test("failed on fetching a fragment", async () => {
    document.body.innerHTML = `<react-portable-preview code="404">original content</react-portable-preview>`;

    const element = document.querySelector<ReactPortablePreview>(
      `react-portable-preview`,
    )!;

    element.props = { foo: "bar" };
    await expect(element.preview("https://example.com")).rejects.toThrowError(
      "react-portable-preview: Failed to retrieve fragment",
    );
  });
});
