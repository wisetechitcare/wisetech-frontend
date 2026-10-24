// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Formik } from "formik";
import TextInput from "./TextInput";

afterEach(cleanup);

describe("TextInput kit adapter", () => {
  it("binds the legacy Formik props to the shared field", async () => {
    const user = userEvent.setup();
    render(
      <Formik initialValues={{ name: "" }} onSubmit={() => {}}>
        {({ values }) => (
          <>
            <TextInput formikField="name" label="Name" isRequired maxLength={10} />
            <output data-testid="value">{values.name}</output>
          </>
        )}
      </Formik>,
    );

    const input = screen.getByRole("textbox", { name: "Name" });
    await user.type(input, "Alice");

    expect(screen.getByTestId("value").textContent).toBe("Alice");
    expect(input.getAttribute("maxlength")).toBe("10");
  });
});
