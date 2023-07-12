import { beforeAll, afterAll, afterEach, describe, test, expect } from "vitest";
import { ReactPortablePreview } from "./element";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { register } from "./register";

const restHandlers = [
  rest.post(`/_fragments/:remote/:code`, (req, res, ctx) => {
    const { remote, code } = req.params;

    if (code === "404") return res(ctx.status(404));

    return res(
      ctx.status(200),
      ctx.text(
        `<react-portable-fragment>${remote} ${code} ${req.body}</react-portable-fragment>`
      )
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
      `react-portable-preview`
    )!;

    element.props = { foo: "bar" };
    // preview
    await element.preview("https://example.com");
    expect(element.innerHTML).toBe(
      '<react-portable-fragment>https://example.com code1 {"foo":"bar"}</react-portable-fragment>'
    );

    element.props = { foo: "baz" };
    // rerender
    await element.rerender();
    expect(element.innerHTML).toBe(
      '<react-portable-fragment>https://example.com code1 {"foo":"baz"}</react-portable-fragment>'
    );
  });

  test("the code is not set", async () => {
    document.body.innerHTML = `<react-portable-preview>original content</react-portable-preview>`;

    const element = document.querySelector<ReactPortablePreview>(
      `react-portable-preview`
    )!;

    element.props = { foo: "bar" };
    expect(element.preview("https://example.com")).rejects.toThrowError(
      "react-portable-preview: The code is not set."
    );
  });

  test("failed on fetching a fragment", async () => {
    document.body.innerHTML = `<react-portable-preview code="404">original content</react-portable-preview>`;

    const element = document.querySelector<ReactPortablePreview>(
      `react-portable-preview`
    )!;

    element.props = { foo: "bar" };
    await expect(element.preview("https://example.com")).rejects.toThrowError(
      "react-portable-preview: Failed to retrieve fragment"
    );
  });
});
