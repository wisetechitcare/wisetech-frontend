// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { FloatingLabelFrame, FloatingLabels } from "./FloatingLabel";
import { WtField } from "./WtField";

afterEach(cleanup);

describe("FloatingLabelFrame", () => {
  it("rests while empty, lifts on focus, drops on blur, stays up when filled", () => {
    const { container, rerender } = render(
      <FloatingLabelFrame label="Country" filled={false}><input /></FloatingLabelFrame>,
    );
    const frame = container.firstElementChild as HTMLElement;
    const input = container.querySelector("input")!;
    expect(frame.dataset.floated).toBe("false");
    fireEvent.focus(input);
    expect(frame.dataset.floated).toBe("true");
    fireEvent.blur(input);
    expect(frame.dataset.floated).toBe("false");
    rerender(<FloatingLabelFrame label="Country" filled><input /></FloatingLabelFrame>);
    expect(frame.dataset.floated).toBe("true");
  });
});

describe("WtField under <FloatingLabels>", () => {
  const label = (c: HTMLElement) => c.querySelector("label")!;

  it("lets an empty text field's label rest inside the box", () => {
    const { container } = render(
      <FloatingLabels><WtField label="Email" value="" onChange={() => {}} /></FloatingLabels>,
    );
    expect(label(container).dataset.shrink).toBe("false");
  });

  it("keeps the always-notched label everywhere else", () => {
    const { container } = render(<WtField label="Email" value="" onChange={() => {}} />);
    expect(label(container).dataset.shrink).toBe("true");
  });
});
