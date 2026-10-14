import { describe, expect, it } from "vitest";
import {
  applicantToFormikValues,
  candidateIdentityOk,
  emptyCandidateFormValues,
  formikToApplicantPayload,
} from "../candidateProfile";

describe("candidateProfile mappers", () => {
  it("requires only first name for the wizard identity gate", () => {
    const base = emptyCandidateFormValues();
    expect(candidateIdentityOk(base)).toBe(false);
    expect(candidateIdentityOk({ ...base, firstName: "Ada" })).toBe(true);
  });

  it("seeds one blank education / family / work row for the UI and strips them on save", () => {
    const blank = emptyCandidateFormValues();
    expect(blank.educationalInfo).toHaveLength(1);
    expect(blank.familyInfo).toHaveLength(1);
    expect(blank.workExpInfo).toHaveLength(1);

    const payload = formikToApplicantPayload({
      ...blank,
      firstName: "Ada",
      personalEmailId: "ada@ex.com",
    });
    expect(payload.preHireProfile.educationalInfo).toEqual([]);
    expect(payload.preHireProfile.familyInfo).toEqual([]);
    expect(payload.preHireProfile.workExpInfo).toEqual([]);
  });

  it("round-trips present + permanent address and documents through Formik", () => {
    const values = emptyCandidateFormValues();
    values.firstName = "Ada";
    values.personalEmailId = "ada@ex.com";
    values.addressInfo = {
      permanentAddressLine1: "1 Park Ave",
      permanentCity: "Chennai",
      presentAddressLine1: "2 Lake Rd",
      presentCity: "Chennai",
    };
    values.documentInfo = [
      { documentId: "aadhaar", path: "recruitment/docs/a.pdf", fileName: "a.pdf", identityNumber: "XXXX" },
    ];

    const payload = formikToApplicantPayload(values);
    expect(payload.preHireProfile.schemaVersion).toBe(1);
    expect(payload.preHireProfile.addressInfo).toEqual(values.addressInfo);
    expect(payload.preHireProfile.documents).toEqual([
      { documentId: "aadhaar", path: "recruitment/docs/a.pdf", fileName: "a.pdf", identityNumber: "XXXX" },
    ]);

    const back = applicantToFormikValues(
      {
        firstName: payload.firstName,
        email: payload.email,
        photoS3Url: "https://cdn.example/photo.jpg",
        preHireProfile: payload.preHireProfile,
      },
      { documentFields: [{ id: "aadhaar" }] },
    );

    expect(back.firstName).toBe("Ada");
    expect(back.avatar).toBe("https://cdn.example/photo.jpg");
    expect(back.addressInfo).toEqual(values.addressInfo);
    expect(back.documentInfo[0]?.documentId).toBe("aadhaar");
    expect(back.documentInfo[0]?.fileName).toBe("a.pdf");
  });
});
