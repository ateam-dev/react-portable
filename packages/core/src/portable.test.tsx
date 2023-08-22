/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { portable } from "./portable";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { rpPreviewRegister } from "@react-portable/client/web-components";
import { MouseEventHandler, ReactNode } from "react";

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

describe("portable", () => {
  beforeEach(() => {
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(
      "dummy-uuid" as ReturnType<typeof crypto.randomUUID>,
    );
    cleanup();
    rpPreviewRegister();
  });

  test("__code", () => {
    const Component = portable(Sample, "foo");
    expect(Component.__code).toBe("foo");
  });
  test("__strategy", () => {
    const Component = portable(Sample, "foo", {
      strategy: { hydrate: "onUse", revalidate: 60 },
    });
    expect(Component.__strategy).toStrictEqual({
      hydrate: "onUse",
      revalidate: 60,
    });
  });
  test("__loader", () => {
    const loader = () => {
      console.log("loader");
      return {};
    };
    const Component = portable(Sample, "foo", {
      loader,
    });
    expect(Component.__loader).toBe(loader);
  });

  describe("Component", () => {
    test("It is same as the original component when initial", () => {
      const Component = portable(Sample, "foo");
      const wrapped = render(<Component />);
      const original = render(<Sample />);

      expect(wrapped.container.innerHTML).toBe(original.container.innerHTML);
    });

    test("Dispatchers are added to rpPreviewDispatchers when rendered and removed when unmounted", () => {
      const Component = portable(Sample, "foo");
      const { unmount } = render(<Component />);
      render(<Component />);

      expect(window.rpPreviewDispatchers?.length).toBe(2);

      unmount();

      expect(window.rpPreviewDispatchers?.length).toBe(1);
    });

    test("It will be wrapped by <rp-preview /> when rpPreviewDispatchers will be called", () => {
      const Component = portable(Sample, "foo");
      const { asFragment } = render(<Component />);

      act(() =>
        window.rpPreviewDispatchers!.forEach(([, dispatch]) => dispatch()),
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test("Elements of type ReactElement will be also rendered in the template when rpPreviewDispatchers will be called", async () => {
      const Component = portable(SampleWithChildren, "foo");
      const { container } = render(
        <Component
          children={<div>children</div>}
          element={<div>element</div>}
        />,
      );

      act(() =>
        window.rpPreviewDispatchers!.forEach(([, dispatch]) => dispatch()),
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe("Component.__forQwik", () => {
    test("`__outlet__` is converted to <rp-outlet /> and rendered", () => {
      const Component = portable(SampleWithChildren, "foo");
      const { asFragment } = render(
        <Component.__forQwik children="__outlet__" element="__outlet__" />,
      );

      expect(asFragment()).toMatchSnapshot();
    });
    test("`__function__` is converted into a function that delegates the original handler", () => {
      const onClickSpy = vi.fn();
      const Component = portable(Sample, "foo");
      const rendered = render(<Component onClick={onClickSpy} />);
      render(
        <Component.__forQwik
          // @ts-ignore
          onClick="__function__#dummy-uuid#rp-preview-event"
          testId="clickable"
        />,
      );

      act(() =>
        window.rpPreviewDispatchers!.forEach(([, dispatch]) => dispatch()),
      );

      fireEvent.click(rendered.getByTestId("clickable"));

      expect(onClickSpy).toBeCalled();
    });
  });
});
