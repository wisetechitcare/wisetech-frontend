// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Formik } from "formik";
import MonthYearInput from "./MonthYearInput";

afterEach(cleanup);

describe("MonthYearInput kit adapter", () => {
  it("renders a month/year WtDateField with the legacy Formik contract", () => {
    render(
      <Formik initialValues={{ start: "2026-01-01" }} onSubmit={() => {}}>
        <MonthYearInput
          formikField="start"
          inputLabel="Start month"
          placeHolder="Select month"
          isRequired
        />
      </Formik>,
    );

    expect(screen.getByRole("textbox", { name: "Start month" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Select month")).toBeTruthy();
  });
});
