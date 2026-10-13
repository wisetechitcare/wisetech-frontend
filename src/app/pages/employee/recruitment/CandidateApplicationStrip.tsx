import { useRef } from "react";
import { useFormikContext } from "formik";
import { useQuery } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton, WtField, WtMoneyField } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { useEmployeeLevels } from "@/hooks/useEmployeeLevels";
import { annualAmountError } from "@utils/ctc";
import { getApplicantSources, getRequisitions, type ApplicantSource, type JobRequisition } from "@services/recruitment";
import type { CandidateFormValues } from "./candidateProfile";

/**
 * Hiring facts the employee onboarding wizard does not have — role, salary ask,
 * notice, seniority, recruitment source, resume. Lives as the first leaf in candidate mode.
 */
interface Props {
  roleRequired?: boolean;
  companyId?: string;
  resumeFile: File | null;
  onResumeFile: (file: File | null) => void;
  existingResumeName?: string | null;
  disabled?: boolean;
}

const SEARCHABLE_FROM = 8;

export function CandidateApplicationStrip({
  roleRequired = false,
  companyId,
  resumeFile,
  onResumeFile,
  existingResumeName,
  disabled,
}: Props) {
  const { values, setFieldValue, errors, touched } = useFormikContext<CandidateFormValues>();
  const { levels, isEmpty: noLevels } = useEmployeeLevels();
  const { data: sources = [] } = useQuery({
    queryKey: queryKeys.recruitment.applicantSources(),
    queryFn: getApplicantSources,
  });
  const { data: requisitions = [], isLoading: rolesLoading } = useQuery({
    queryKey: queryKeys.recruitment.requisitions(companyId),
    queryFn: () => getRequisitions(companyId),
  });
  const openRoles = (requisitions as JobRequisition[]).filter((r) => r.status === 1 && r.isActive !== false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const showRoleError = roleRequired && Boolean(touched.requisitionId) && !values.requisitionId;

  return (
    <Stack spacing={2}>
      <WtField
        label="Role"
        required={roleRequired}
        fullWidth
        clearable={!roleRequired}
        value={values.requisitionId}
        onChange={(v) => setFieldValue("requisitionId", v)}
        options={openRoles.map((r) => ({
          value: r.id,
          label: r.prefix ? `${r.prefix} · ${r.title}` : r.title,
        }))}
        searchable={openRoles.length >= SEARCHABLE_FROM}
        placeholder={rolesLoading ? "Loading roles…" : openRoles.length ? "Choose an approved role" : "No approved roles yet"}
        disabled={disabled || rolesLoading}
        error={showRoleError ? "Choose the role they are applying for" : undefined}
        hint={roleRequired
          ? "Only approved, open roles are listed."
          : "Optional. With a role they go onto its pipeline; without one they join the pool."}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <WtMoneyField
          label="Current Salary"
          per="year"
          hint="Full yearly amount"
          sx={{ flex: 1 }}
          value={values.currentCtc}
          onChange={(v) => setFieldValue("currentCtc", v)}
          error={annualAmountError("Current salary", values.currentCtc)}
          disabled={disabled}
        />
        <WtMoneyField
          label="Expected Salary"
          per="year"
          hint="Full yearly amount"
          sx={{ flex: 1 }}
          value={values.expectedCtc}
          onChange={(v) => setFieldValue("expectedCtc", v)}
          error={annualAmountError("Expected salary", values.expectedCtc)}
          disabled={disabled}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <WtField
          label="Experience"
          type="number"
          min={0}
          inputMode="numeric"
          hint="In months"
          sx={{ flex: 1 }}
          value={values.totalExperienceMonths ?? ""}
          onChange={(v) => setFieldValue("totalExperienceMonths", v === "" ? "" : Number(v))}
          disabled={disabled}
        />
        <WtField
          label="Notice Period"
          type="number"
          min={0}
          inputMode="numeric"
          hint="In days"
          sx={{ flex: 1 }}
          value={values.noticePeriodDays ?? ""}
          onChange={(v) => setFieldValue("noticePeriodDays", v === "" ? "" : Number(v))}
          disabled={disabled}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {!noLevels && (
          <WtField
            label="Seniority"
            sx={{ flex: 1 }}
            clearable
            value={values.employeeLevelId ?? ""}
            onChange={(v) => setFieldValue("employeeLevelId", v || "")}
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Not set"
            disabled={disabled}
          />
        )}
        <WtField
          label="Where They Came From"
          sx={{ flex: 1 }}
          clearable
          value={values.sourceId ?? ""}
          onChange={(v) => setFieldValue("sourceId", v || "")}
          options={sources.map((s: ApplicantSource) => ({ value: s.id, label: s.name }))}
          placeholder="Not recorded"
          hint="Channel attribution for recruiting spend."
          disabled={disabled}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <WtField
          label="Current Title"
          sx={{ flex: 1 }}
          value={values.currentTitle}
          onChange={(v) => setFieldValue("currentTitle", v)}
          disabled={disabled}
        />
        <WtField
          label="Current Employer"
          sx={{ flex: 1 }}
          value={values.currentEmployer}
          onChange={(v) => setFieldValue("currentEmployer", v)}
          disabled={disabled}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <WtField
          label="Current Location"
          sx={{ flex: 1 }}
          value={values.currentLocation}
          onChange={(v) => setFieldValue("currentLocation", v)}
          disabled={disabled}
        />
        <WtField
          label="Qualification"
          sx={{ flex: 1 }}
          value={values.qualification}
          onChange={(v) => setFieldValue("qualification", v)}
          disabled={disabled}
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1.5}>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf"
          hidden
          onChange={(e) => onResumeFile(e.target.files?.[0] ?? null)}
        />
        <WtButton
          ghost
          size="small"
          disabled={disabled}
          startIcon={<KTIcon iconName="cloud-add" className="fs-5" />}
          onClick={() => {
            if (fileRef.current) fileRef.current.value = "";
            fileRef.current?.click();
          }}
        >
          {resumeFile ? "Choose a different resume" : existingResumeName ? "Replace resume" : "Attach resume"}
        </WtButton>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", minWidth: 0, flex: 1 }} noWrap>
          {resumeFile?.name ?? existingResumeName ?? "PDF, DOC or DOCX"}
        </Typography>
      </Stack>

      {/* Surface Formik identity errors near the top of the strip when Save was attempted */}
      {Boolean(touched.firstName && errors.firstName) && (
        <Typography color="error" variant="caption">{String(errors.firstName)}</Typography>
      )}
    </Stack>
  );
}

export default CandidateApplicationStrip;
