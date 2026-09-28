// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Formik } from "formik";
import { afterEach, describe, expect, it, vi } from "vitest";
import Documents from "./Documents";

// jsdom has no object-URL support; ObFileUpload makes one for the View link.
URL.createObjectURL = vi.fn(() => "blob:preview");
URL.revokeObjectURL = vi.fn();

// No `userId`: a create-mode onboarding, where the employee does not exist yet.
const initialValues = {
  documentFields: [{ id: "doc-1", fieldName: "Aadhar Card", hasIdentityNumber: true }],
  documentInfo: [{
    id: "row-1", documentId: "doc-1", identityNumber: "",
    path: "https://files/aadhar.pdf", fileName: "aadhar.pdf",
  }],
};

// No global auto-cleanup in this config — without it the previous test's tree is
// still mounted and `querySelector` finds ITS file input.
afterEach(cleanup);

describe("Documents", () => {
  it("removing an attachment clears the saved row and drops the pending upload", () => {
    const removeFile = vi.fn();
    let latest: any;

    render(
      <Formik initialValues={initialValues} onSubmit={() => {}}>
        {(formikProps) => {
          latest = formikProps.values;
          return <Documents formikProps={formikProps} index={0} setFile={vi.fn()} removeFile={removeFile} />;
        }}
      </Formik>
    );

    expect(screen.getByText("Attached")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Remove file"));

    expect(latest.documentInfo[0]).toMatchObject({ id: "row-1", path: "", fileName: "" });
    expect(removeFile).toHaveBeenCalledWith("doc-1");
    expect(screen.getByText("Not attached")).toBeTruthy();
  });

  it("accepts a file before the employee exists and queues it for upload", async () => {
    const setFile = vi.fn();
    let latest: any;

    render(
      <Formik
        initialValues={{ ...initialValues, documentInfo: [{ documentId: "doc-1", identityNumber: "", path: "", fileName: "" }] }}
        onSubmit={() => {}}
      >
        {(formikProps) => {
          latest = formikProps.values;
          return <Documents formikProps={formikProps} index={0} setFile={setFile} removeFile={vi.fn()} />;
        }}
      </Formik>
    );

    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    expect(input.disabled).toBe(false);

    const file = new File(["x"], "aadhar.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);

    expect(setFile).toHaveBeenCalledWith("doc-1", file);
    expect(latest.documentInfo[0].fileName).toBe("aadhar.pdf");
    expect(screen.getByText("Attached")).toBeTruthy();
  });
});
