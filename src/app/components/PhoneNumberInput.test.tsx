// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PhoneNumberInput from "./PhoneNumberInput";

afterEach(cleanup);

describe("PhoneNumberInput", () => {
  it("renders the phone control without a CJS interop crash", () => {
    expect(() => render(<PhoneNumberInput label="Phone" />)).not.toThrow();
  });
});
