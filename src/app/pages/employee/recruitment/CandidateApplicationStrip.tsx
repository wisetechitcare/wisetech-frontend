import { type ReactNode } from "react";
import { useFormikContext } from "formik";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "@mui/material";
import {
  FormSection, FORM_SPACE, InlineNotice, TRIO, WtField, WtMoneyField,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { useEmployeeLevels } from "@/hooks/useEmployeeLevels";
import { annualAmountError } from "@utils/ctc";
import { isRoleOpenForCandidates, SEARCHABLE_FROM } from "@utils/requisitions";
import { getApplicantSources, getRequisitions, type ApplicantSource, type JobRequisition } from "@services/recruitment";
import type { CandidateFormValues } from "./candidateProfile";

/**
 * Hiring facts the employee onboarding wizard does not have — role, salary ask,
 * notice, seniority, recruitment source. Resume lives on the Documents leaf.
 * Layout follows Sandwich Add Rule: FormSection + FORM_SPACE + kit fields.
 */
interface Props {
  roleRequired?: boolean;
  companyId?: string;
  disabled?: boolean;
}

export function CandidateApplicationStrip({
  roleRequired = false,
  companyId,
  disabled,
}: Props) {
  const { values, setFieldValue, touched } = useFormikContext<CandidateFormValues>();
  const { levels, isEmpty: noLevels } = useEmployeeLevels();
  const { data: sources = [] } = useQuery({
    queryKey: queryKeys.recruitment.applicantSources(),
    queryFn: getApplicantSources,
  });
  const { data: requisitions = [], isLoading: rolesLoading } = useQuery({
    queryKey: queryKeys.recruitment.requisitions(companyId),
    queryFn: () => getRequisitions(companyId),
  });
  const openRoles = (requisitions as JobRequisition[]).filter(isRoleOpenForCandidates);
  const showRoleError = roleRequired && Boolean(touched.requisitionId) && !values.requisitionId;
  const noOpenRoles = !rolesLoading && openRoles.length === 0;

  return (
    <Stack spacing={FORM_SPACE.stackGap}>
      <FormSection tone={TRIO.blue} icon="briefcase" title="Role" desc="Approved open roles only — full seats are hidden.">
        {noOpenRoles && (
          <InlineNotice icon="information-5">
            {roleRequired
              ? "No approved roles with open seats. Approve a requisition or free a seat in Recruitment › Roles before continuing."
              : "No approved roles with open seats right now. You can still add them to the candidate pool without a role."}
          </InlineNotice>
        )}
        <WtField
          label="Role"
          size="md"
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
          disabled={disabled || rolesLoading || noOpenRoles}
          error={showRoleError ? "Choose the role they are applying for" : undefined}
          hint={roleRequired
            ? "Only approved, open roles are listed."
            : "Optional. With a role they go onto its pipeline; without one they join the pool."}
        />
      </FormSection>

      <FormSection tone={TRIO.amber} icon="wallet" title="Compensation & notice">
        <Stack spacing={FORM_SPACE.fieldGap}>
          <BoxGrid>
            <WtMoneyField
              label="Current Salary"
              size="md"
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
              size="md"
              per="year"
              hint="Full yearly amount"
              sx={{ flex: 1 }}
              value={values.expectedCtc}
              onChange={(v) => setFieldValue("expectedCtc", v)}
              error={annualAmountError("Expected salary", values.expectedCtc)}
              disabled={disabled}
            />
          </BoxGrid>
          <BoxGrid>
            <WtField
              label="Experience"
              size="md"
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
              size="md"
              type="number"
              min={0}
              inputMode="numeric"
              hint="In days"
              sx={{ flex: 1 }}
              value={values.noticePeriodDays ?? ""}
              onChange={(v) => setFieldValue("noticePeriodDays", v === "" ? "" : Number(v))}
              disabled={disabled}
            />
          </BoxGrid>
        </Stack>
      </FormSection>

      <FormSection tone={TRIO.purple} icon="profile-user" title="Background" desc="Title, employer, seniority and source.">
        <Stack spacing={FORM_SPACE.fieldGap}>
          <BoxGrid>
            {!noLevels && (
              <WtField
                label="Seniority"
                size="md"
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
              size="md"
              sx={{ flex: 1 }}
              clearable
              value={values.sourceId ?? ""}
              onChange={(v) => setFieldValue("sourceId", v || "")}
              options={sources.map((s: ApplicantSource) => ({ value: s.id, label: s.name }))}
              placeholder="Not recorded"
              hint="Channel attribution for recruiting spend."
              disabled={disabled}
            />
          </BoxGrid>
          <BoxGrid>
            <WtField
              label="Current Title"
              size="md"
              sx={{ flex: 1 }}
              value={values.currentTitle}
              onChange={(v) => setFieldValue("currentTitle", v)}
              disabled={disabled}
            />
            <WtField
              label="Current Employer"
              size="md"
              sx={{ flex: 1 }}
              value={values.currentEmployer}
              onChange={(v) => setFieldValue("currentEmployer", v)}
              disabled={disabled}
            />
          </BoxGrid>
        </Stack>
      </FormSection>
    </Stack>
  );
}

/** Two-up field row — Sandwich mid-density gap. */
function BoxGrid({ children }: { children: ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={FORM_SPACE.rowGap}>
      {children}
    </Stack>
  );
}

export default CandidateApplicationStrip;
