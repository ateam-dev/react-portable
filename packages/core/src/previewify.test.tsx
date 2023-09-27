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
import { previewify } from "./previewify";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { register } from "@react-portable/client/web-components";
import { MouseEventHandler, ReactNode } from "react";
import { rest } from "msw";
import { setupServer } from "msw/node";

const Sample = ({
  onClick,
  testId,
}: {
  onClick?: MouseEventHandler<HTMLDivElement>;
  testId?: string;
}) => (
  <div onClick={onClick} data-testid={testId}>
    sample
  </div>
);

const SampleWithChildren = ({
  children,
  element,
}: {
  children: ReactNode;
  element?: ReactNode;
}) => (
  <div>
    sample with children:{children} {element}
  </div>
);

const server = setupServer(
  rest.post(`https://basepage.com/_fragments/:code`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.text(``));
  }),
);

const openPreview = () => {
  act(() =>
    window.previewifyDispatchers.forEach((dispatcher) => dispatcher("open")),
  );
  vi.advanceTimersByTime(500);
};

const closePreview = () => {
  act(() =>
    window.previewifyDispatchers.forEach((dispatcher) => dispatcher("close")),
  );
};

beforeAll(() => {
  window.__previewifyDebug = true;
  vi.useFakeTimers();
  server.listen({ onUnhandledRequest: "error" });
});
beforeEach(() => {
  cleanup();
  register();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe("previewify", () => {
  test("__code", () => {
    const Component = previewify(Sample, "foo");
    expect(Component.__code).toBe("foo");
  });

  describe("Component", () => {
    test("It is same as the original component when initial", () => {
      const Component = previewify(Sample, "foo");
      const wrapped = render(<Component />);
      const original = render(<Sample />);

      expect(wrapped.container.innerHTML).toBe(original.container.innerHTML);
    });

    test("Dispatchers are added to previewifyDispatchers when rendered and removed when unmounted", () => {
      const Component = previewify(Sample, "foo");
      const { unmount } = render(<Component />);
      render(<Component />);

      expect(window.previewifyDispatchers.size).toBe(2);

      unmount();

      expect(window.previewifyDispatchers.size).toBe(1);
    });

    test("It will be wrapped by <rp-preview /> when previewifyDispatchers will be called", () => {
      const Component = previewify(Sample, "foo");
      const { asFragment } = render(<Component />);

      openPreview();

      expect(asFragment()).toMatchSnapshot();

      // Close the preview to see the original component
      closePreview();
      expect(asFragment()).toMatchSnapshot();
    });

    test("Elements of type ReactElement will be also rendered in the template when previewifyDispatchers will be called", () => {
      const Component = previewify(SampleWithChildren, "foo");
      const { container } = render(
        <Component
          children={<div>children</div>}
          element={<div>element</div>}
        />,
      );

      openPreview();

      expect(container).toMatchSnapshot();
    });
  });

  describe("Component.__forQwik", () => {
    test("`__outlet__` is converted to <rp-slot /> and rendered", () => {
      const Component = previewify(SampleWithChildren, "foo");
      const { asFragment } = render(
        <Component.__forQwik children="__outlet__" element="__outlet__" />,
      );

      expect(asFragment()).toMatchSnapshot();
    });
    test("`__function__` is converted into a function that delegates the original handler", () => {
      const onClickSpy = vi.fn();
      const Component = previewify(Sample, "foo");
      const rendered = render(<Component onClick={onClickSpy} />);
      render(
        <Component.__forQwik
          // @ts-ignore
          onClick="__function__#dummy-uuid#rp-preview-event"
          testId="clickable"
        />,
      );

      openPreview();

      fireEvent.click(rendered.getByTestId("clickable"));

      expect(onClickSpy).toBeCalled();
    });
    test("Allow overriding props for previews", () => {
      const ComponentSample = previewify(Sample, "foo", {
        props: { testId: "overwritten-test-it" },
      });
      let rendered = render(<ComponentSample.__forQwik testId="test-id" />);

      expect(rendered.asFragment()).toMatchSnapshot();

      rendered.unmount();

      const ComponentSampleWithChildren = previewify(
        SampleWithChildren,
        "foo",
        {
          props: {
            children: <div>overwritten children</div>,
            element: <div>overwritten element</div>,
          },
        },
      );
      rendered = render(
        <ComponentSampleWithChildren.__forQwik
          children="__outlet__"
          element="__outlet__"
        />,
      );

      expect(rendered.asFragment()).toMatchSnapshot();
    });
  });
});
