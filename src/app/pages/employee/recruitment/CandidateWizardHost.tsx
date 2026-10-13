import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Formik, Form, type FormikProps } from "formik";
import * as Yup from "yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress } from "@mui/material";
import { toast, WtButton } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { fetchDocumentsField } from "@services/employee";
import { fetchCompanyOverview } from "@services/company";
import { resolveActiveOrgId } from "@utils/activeOrg";
import {
  createApplicant,
  createApplication,
  getApplicantById,
  getRecruitmentSettings,
  updateApplicant,
  uploadApplicantDocument,
  uploadApplicantPhoto,
  uploadApplicantResume,
} from "@services/recruitment";
import OnboardingWizard from "../forms/onboarding/OnboardingWizard";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import { buildCandidateWizardGroups } from "./buildCandidateWizardGroups";
import {
  applicantToFormikValues,
  candidateIdentityOk,
  emptyCandidateFormValues,
  formikToApplicantPayload,
  type CandidateFormValues,
} from "./candidateProfile";

const candidateMinimalSchema = Yup.object({
  firstName: Yup.string().trim().required("First name is required"),
  personalEmailId: Yup.string().trim().email("Enter a valid email").nullable(),
  personalPhoneNumber: Yup.string().trim().nullable(),
}).test("email-or-phone", "Enter an email or a phone number", (v) =>
  Boolean(v?.personalEmailId?.trim() || v?.personalPhoneNumber?.trim()),
);

/**
 * Full-page Add/Edit Candidate wizard — reuses onboarding section renderers and
 * OnboardingWizard chrome in candidate mode. Never creates an employee.
 */
export default function CandidateWizardHost() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { applicantId: routeApplicantId } = useParams<{ applicantId?: string }>();
  const [searchParams] = useSearchParams();
  const roleRequired = searchParams.get("roleRequired") === "1";
  const queryRequisitionId = searchParams.get("requisitionId") ?? "";
  const { data: companyOverviewRes } = useQuery({
    queryKey: ["company-overview-for-candidate-wizard"],
    queryFn: () => fetchCompanyOverview(),
    staleTime: 5 * 60 * 1000,
  });
  const companyId = resolveActiveOrgId(companyOverviewRes?.data?.companyOverview) || undefined;

  const isEdit = Boolean(routeApplicantId);
  const [applicantId, setApplicantId] = useState<string | undefined>(routeApplicantId);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pendingDocFiles, setPendingDocFiles] = useState<Record<string, File>>({});
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formikRef = useRef<FormikProps<CandidateFormValues> | null>(null);

  const { data: settings } = useQuery({
    queryKey: queryKeys.recruitment.settings(),
    queryFn: getRecruitmentSettings,
  });

  // Kill switch: deep link must not strand users when wizard is off.
  useEffect(() => {
    if (settings && settings.candidateWizardEnabled === false) {
      toast({ icon: "info", title: "Candidate wizard is turned off — using the classic form" });
      navigate(roleRequired ? "/recruitment/pipeline" : "/recruitment/candidates", { replace: true });
    }
  }, [settings, navigate, roleRequired]);

  const { data: applicant, isLoading: loadingApplicant } = useQuery({
    queryKey: [...queryKeys.recruitment.applicants(), "one", routeApplicantId],
    queryFn: () => getApplicantById(routeApplicantId!),
    enabled: Boolean(routeApplicantId),
  });

  const { data: docConfigRes } = useQuery({
    queryKey: ["onboarding-docs", companyId],
    queryFn: () => fetchDocumentsField(companyId),
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

  // Keep documentFields mirrored when config loads after mount.
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

  const goBack = () => {
    navigate(roleRequired || queryRequisitionId ? "/recruitment/pipeline" : "/recruitment/candidates");
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
        throw new Error("First name and an email or phone are required");
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
      toast({ icon: "warning", title: "Enter a first name and an email or phone first" });
      return;
    }
    setIsSubmitting(true);
    try {
      await saveMut.mutateAsync({ values: f.values, stay: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const groups = useMemo(
    () =>
      buildCandidateWizardGroups({
        roleRequired,
        companyId,
        resumeFile,
        onResumeFile: setResumeFile,
        existingResumeName: applicant?.resumeFileName,
        disabled: isSubmitting,
      }),
    [roleRequired, companyId, resumeFile, applicant?.resumeFileName, isSubmitting],
  );

  const sectionProps: OnboardingSectionsProps = {
    formikProps: formikRef.current as never,
    editMode: Boolean(applicantId),
    setFile: setFile as never,
    removeFile,
    profilePhotoPreview: profilePhotoPreview || applicant?.photoS3Url || undefined,
  };

  if (routeApplicantId && loadingApplicant) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <Formik
        initialValues={initialValues}
        validationSchema={candidateMinimalSchema}
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
                  <WtButton ghost type="button" onClick={handleEarlySave} disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Save draft"}
                  </WtButton>
                }
                defaultValues={emptyCandidateFormValues()}
                isSubmitting={isSubmitting}
                isEditMode={Boolean(applicantId)}
                onCancel={goBack}
                onFinalSave={handleFinalSave}
                submitText={isEdit || applicantId ? "Done" : "Add Candidate"}
              />
            </Form>
          );
        }}
      </Formik>
    </Box>
  );
}
