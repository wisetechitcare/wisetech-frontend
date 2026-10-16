import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Formik, Form, type FormikProps } from "formik";
import * as Yup from "yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress } from "@mui/material";
import { AppIcon, toast, confirmDialog } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { useOrgScope, toCompanyIdParam } from "@/hooks/useOrgScope";
import { apiErrorMessage } from "@utils/apiError";
import { fetchDocumentsField } from "@services/employee";
import { fetchCompanyOverview } from "@services/company";
import { resolveActiveOrgId } from "@utils/activeOrg";
import {
  createApplicant,
  createApplication,
  getApplicantById,
  updateApplicant,
  uploadApplicantDocument,
  uploadApplicantPhoto,
  uploadApplicantResume,
} from "@services/recruitment";
import OnboardingWizard from "../forms/onboarding/OnboardingWizard";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import { FullscreenWizardModal } from "../forms/shared/FullscreenWizardModal";
import { buildCandidateWizardGroups } from "./buildCandidateWizardGroups";
import {
  applicantToFormikValues,
  candidateHasContact,
  candidateIdentityOk,
  emptyCandidateFormValues,
  formikToApplicantPayload,
  type CandidateFormValues,
} from "./candidateProfile";

const CONTACT_REQUIRED_MSG = "Enter an email or a phone number";

/** Wizard validation — first name + contact (email OR phone); role when Pipeline entry. */
const buildCandidateSchema = (roleRequired: boolean) =>
  Yup.object({
    firstName: Yup.string().trim().required("First name is required"),
    personalEmailId: Yup.string().trim().email("Enter a valid email").nullable(),
    personalPhoneNumber: Yup.string().trim().nullable(),
    requisitionId: roleRequired
      ? Yup.string().trim().required("Choose the role they are applying for")
      : Yup.string().trim().nullable(),
  }).test("contact", CONTACT_REQUIRED_MSG, function (values) {
    const hasContact = Boolean(
      String(values?.personalEmailId ?? "").trim() || String(values?.personalPhoneNumber ?? "").trim(),
    );
    if (hasContact) return true;
    // Attach to field paths so Formik / rail show inline errors (object-level alone is silent).
    return this.createError({ path: "personalEmailId", message: CONTACT_REQUIRED_MSG });
  });

/**
 * Full-page Add/Edit Candidate wizard — same fullscreen shell as Employee
 * Onboarding (`FullscreenWizardModal` + `OnboardingWizard`). Never creates an employee.
 */
export default function CandidateWizardHost() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { applicantId: routeApplicantId } = useParams<{ applicantId?: string }>();
  const [searchParams] = useSearchParams();
  const roleRequired = searchParams.get("roleRequired") === "1";
  const queryRequisitionId = searchParams.get("requisitionId") ?? "";
  // Inherit the shell org when Add/Edit is opened from a scoped tab (360 Wave B / U4).
  const shellCompanyId = searchParams.get("companyId") ?? "";

  // Same org filter RecruitmentMain uses — ALL_ORGS omits companyId so roles
  // across the family appear (resolveActiveOrgId alone scoped to root and returned []).
  const { scopeId } = useOrgScope({
    includeAll: true,
    initialScopeId: shellCompanyId || undefined,
  });
  const companyId = toCompanyIdParam(scopeId);

  const { data: companyOverviewRes } = useQuery({
    queryKey: ["company-overview-for-candidate-wizard"],
    queryFn: () => fetchCompanyOverview(),
    staleTime: 5 * 60 * 1000,
  });
  // Onboarding Docs master is per-org; when scope is All, fall back to the root.
  const docsCompanyId =
    companyId || resolveActiveOrgId(companyOverviewRes?.data?.companyOverview) || undefined;

  const isEdit = Boolean(routeApplicantId);
  const [applicantId, setApplicantId] = useState<string | undefined>(routeApplicantId);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pendingDocFiles, setPendingDocFiles] = useState<Record<string, File>>({});
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show, setShow] = useState(true);
  const formikRef = useRef<FormikProps<CandidateFormValues> | null>(null);

  const { data: applicant, isLoading: loadingApplicant } = useQuery({
    queryKey: [...queryKeys.recruitment.applicants(), "one", routeApplicantId],
    queryFn: () => getApplicantById(routeApplicantId!),
    enabled: Boolean(routeApplicantId),
  });

  const { data: docConfigRes } = useQuery({
    queryKey: ["onboarding-docs", docsCompanyId],
    queryFn: () => fetchDocumentsField(docsCompanyId),
    enabled: Boolean(docsCompanyId),
  });

  const documentFields = useMemo(() => {
    const list = docConfigRes?.data?.documents ?? [];
    const rows = Array.isArray(list) ? list : [];
    return rows.filter((d: { isEnabled?: boolean }) => d.isEnabled);
  }, [docConfigRes]);

  const initialValues = useMemo((): CandidateFormValues => {
    if (applicant) {
      return applicantToFormikValues(applicant, {
        requisitionId: queryRequisitionId,
        documentFields,
      });
    }
    const blank = emptyCandidateFormValues();
    blank.requisitionId = queryRequisitionId;
    blank.documentFields = documentFields;
    blank.documentInfo = documentFields.map((d: { id: string }) => ({
      documentId: d.id,
      path: "",
      fileName: "",
      identityNumber: "",
      employeeId: "",
    }));
    return blank;
  }, [applicant, queryRequisitionId, documentFields]);

  useEffect(() => {
    const f = formikRef.current;
    if (!f || documentFields.length === 0) return;
    f.setFieldValue("documentFields", documentFields, false);
    const existing = Array.isArray(f.values.documentInfo) ? f.values.documentInfo : [];
    if (existing.length === 0) {
      f.setFieldValue(
        "documentInfo",
        documentFields.map((d: { id: string }) => ({
          documentId: d.id,
          path: "",
          fileName: "",
          identityNumber: "",
          employeeId: "",
        })),
        false,
      );
    }
  }, [documentFields]);

  const setFile = useCallback((docId: string, file: File | null) => {
    if (docId === "userProfilePicture") {
      if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
      if (file) {
        setPhotoFile(file);
        setProfilePhotoPreview(URL.createObjectURL(file));
      } else {
        setPhotoFile(null);
        setProfilePhotoPreview(undefined);
      }
      return;
    }
    setPendingDocFiles((prev) => {
      const next = { ...prev };
      if (file) next[docId] = file;
      else delete next[docId];
      return next;
    });
  }, [profilePhotoPreview]);

  const removeFile = useCallback((docId: string) => {
    setFile(docId, null);
    if (docId === "userProfilePicture") {
      formikRef.current?.setFieldValue("avatar", "");
    }
  }, [setFile]);

  const leaveTarget = () =>
    (roleRequired || queryRequisitionId ? "/recruitment/pipeline" : "/recruitment/candidates");

  const goBack = () => {
    setShow(false);
    navigate(leaveTarget());
  };

  const handleCancel = async () => {
    const f = formikRef.current;
    const pendingUploads =
      Boolean(resumeFile) || Boolean(photoFile) || Object.keys(pendingDocFiles).length > 0;
    if (f?.dirty || pendingUploads) {
      const ok = await confirmDialog({
        title: "Discard unsaved changes?",
        text: "Changes on this candidate will be lost.",
        confirmText: "Discard",
        cancelText: "Keep editing",
        danger: true,
      });
      if (!ok) return;
    }
    goBack();
  };

  const uploadPending = async (id: string, values: CandidateFormValues) => {
    if (resumeFile) {
      try {
        await uploadApplicantResume(id, resumeFile);
        setResumeFile(null);
      } catch (err) {
        toast({ icon: "warning", title: `Saved, but resume upload failed: ${apiErrorMessage(err, "refused")}` });
      }
    }
    if (photoFile) {
      try {
        const row = await uploadApplicantPhoto(id, photoFile);
        setPhotoFile(null);
        if (row?.photoS3Url) formikRef.current?.setFieldValue("avatar", row.photoS3Url);
      } catch (err) {
        toast({ icon: "warning", title: `Saved, but photo upload failed: ${apiErrorMessage(err, "refused")}` });
      }
    }
    for (const [documentId, file] of Object.entries(pendingDocFiles)) {
      const identityNumber = values.documentInfo?.find((d) => d.documentId === documentId)?.identityNumber;
      try {
        await uploadApplicantDocument(id, file, documentId, identityNumber);
      } catch (err) {
        toast({ icon: "warning", title: `Document upload failed: ${apiErrorMessage(err, "refused")}` });
      }
    }
    setPendingDocFiles({});
  };

  const saveMut = useMutation({
    mutationFn: async ({ values, stay }: { values: CandidateFormValues; stay: boolean }) => {
      if (!candidateIdentityOk(values)) {
        throw new Error("First name is required");
      }
      if (!candidateHasContact(values)) {
        throw new Error("Add an email or a phone number so we can save this candidate");
      }
      if (roleRequired && !values.requisitionId) {
        throw new Error("Choose the role they are applying for");
      }
      const payload = formikToApplicantPayload(values);
      let id = applicantId;
      let revisionCount: number | undefined;

      if (id) {
        const res = await updateApplicant(id, {
          ...payload,
          expectedRevisionCount: applicant?.revisionCount,
        });
        revisionCount = res?.applicant?.revisionCount;
      } else if (values.requisitionId) {
        const res = await createApplication({
          applicant: payload,
          requisitionId: values.requisitionId,
        }, companyId);
        id = res?.application?.applicantId ?? res?.application?.applicant?.id;
      } else {
        const res = await createApplicant(payload, companyId);
        id = res?.applicant?.id;
        revisionCount = res?.applicant?.revisionCount;
      }

      if (!id) throw new Error("Could not save the candidate");
      await uploadPending(id, values);
      return { id, stay, revisionCount };
    },
    onSuccess: ({ id, stay }) => {
      qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
      setApplicantId(id);
      if (stay) {
        toast({ icon: "success", title: "Candidate saved" });
        if (!routeApplicantId) {
          navigate(`/recruitment/candidates/${id}/edit${roleRequired ? "?roleRequired=1" : ""}`, { replace: true });
        }
      } else {
        toast({ icon: "success", title: isEdit ? "Candidate updated" : "Candidate added" });
        goBack();
      }
    },
    onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not save the candidate") }),
  });

  const handleFinalSave = async () => {
    const f = formikRef.current;
    if (!f) return;
    setIsSubmitting(true);
    try {
      const errors = await f.validateForm();
      f.setTouched(
        Object.fromEntries(Object.keys(f.values).map((k) => [k, true])) as never,
        false,
      );
      if (Object.keys(errors).length) {
        toast({ icon: "warning", title: "Fix the highlighted fields before finishing" });
        return;
      }
      await saveMut.mutateAsync({ values: f.values, stay: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEarlySave = async () => {
    const f = formikRef.current;
    if (!f) return;
    if (!candidateIdentityOk(f.values)) {
      toast({ icon: "warning", title: "Enter a first name first" });
      return;
    }
    if (!candidateHasContact(f.values)) {
      f.setFieldTouched("personalEmailId", true, false);
      f.setFieldTouched("personalPhoneNumber", true, false);
      void f.validateForm();
      toast({
        icon: "warning",
        title: "Add an email or phone to save",
        text: "First name is enough to continue the form — saving needs a way to reach them.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await saveMut.mutateAsync({ values: f.values, stay: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validationSchema = useMemo(() => buildCandidateSchema(roleRequired), [roleRequired]);

  const groups = useMemo(
    () =>
      buildCandidateWizardGroups({
        roleRequired,
        companyId,
        resumeFile,
        onResumeFile: setResumeFile,
        existingResumeName: applicant?.resumeFileName,
        disabled: isSubmitting,
        isEdit: Boolean(applicantId || routeApplicantId),
      }),
    [roleRequired, companyId, resumeFile, applicant?.resumeFileName, isSubmitting, applicantId, routeApplicantId],
  );

  const sectionProps: OnboardingSectionsProps = {
    formikProps: formikRef.current as never,
    editMode: Boolean(applicantId),
    setFile: setFile as never,
    removeFile,
    profilePhotoPreview: profilePhotoPreview || applicant?.photoS3Url || undefined,
    // Pre-hire: identity is the only hard gate; family/address asterisks are noise.
    softRequired: true,
  };

  const summaryRows = (v: CandidateFormValues) => {
    const rows: Array<{ label: string; value: ReactNode; isStrong?: boolean }> = [];
    const name = `${v.firstName || ""} ${v.lastName || ""}`.trim();
    if (name) rows.push({ label: "Name", value: name, isStrong: true });
    if (v.personalEmailId) rows.push({ label: "Email", value: v.personalEmailId });
    if (v.personalPhoneNumber) rows.push({ label: "Phone", value: v.personalPhoneNumber });
    if (v.requisitionId) rows.push({ label: "Role", value: "Selected" });
    if (v.currentCtc != null) rows.push({ label: "Current CTC", value: String(v.currentCtc) });
    if (v.expectedCtc != null) rows.push({ label: "Expected CTC", value: String(v.expectedCtc) });
    return rows;
  };

  if (routeApplicantId && loadingApplicant) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <FullscreenWizardModal
      show={show}
      onClose={handleCancel}
      closeLabel="Close candidate wizard"
      className="onboarding-wizard-modal"
    >
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={() => handleFinalSave()}
        enableReinitialize
      >
        {(formikProps) => {
          formikRef.current = formikProps;
          return (
            <Form noValidate style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <OnboardingWizard
                groups={groups}
                sectionProps={{ ...sectionProps, formikProps }}
                headerTitle={isEdit || applicantId ? "Edit Candidate" : "Add Candidate"}
                headerSub={
                  isEdit || applicantId ? (
                    <>
                      {formikProps.values.personalEmailId && (
                        <span className="wizard-meta-chip">
                          <AppIcon name="bi-envelope" /> {formikProps.values.personalEmailId}
                        </span>
                      )}
                      {formikProps.values.personalPhoneNumber && (
                        <span className="wizard-meta-chip">
                          <AppIcon name="bi-telephone" /> {formikProps.values.personalPhoneNumber}
                        </span>
                      )}
                    </>
                  ) : (
                    "Capture identity, hiring facts and documents — optional until offer"
                  )
                }
                defaultValues={emptyCandidateFormValues()}
                isSubmitting={isSubmitting}
                isEditMode={Boolean(applicantId)}
                onCancel={handleCancel}
                onFinalSave={handleFinalSave}
                onDirectSave={handleEarlySave}
                directSaveLabel="Save draft"
                submitText={isEdit || applicantId ? "Done" : "Add Candidate"}
                summaryTitle="Candidate Summary"
                summaryRows={(v) => summaryRows(v as CandidateFormValues)}
                initialLeafId={roleRequired ? "application-strip" : undefined}
              />
            </Form>
          );
        }}
      </Formik>
    </FullscreenWizardModal>
  );
}
