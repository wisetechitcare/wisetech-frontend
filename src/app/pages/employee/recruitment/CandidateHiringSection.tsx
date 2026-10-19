import { Box, Stack } from "@mui/material";
import { useFormikContext } from "formik";
import {
  FormSection, FORM_SPACE, TRIO, WtDateField, WtSwitchField,
} from "@app/modules/common/components/ui";
import { EmployeePickerField } from "@app/modules/common/components/EmployeePickerField";
import type { CandidateFormValues } from "./candidateProfile";

/**
 * Candidate-only hiring subset: proposed joining + referred-by (+ blacklist on edit).
 * Source lives on the Application strip (ApplicantSource master, not employee Source of Hire).
 * Referred-by uses the shared EmployeePickerField (avatar + designation rows) —
 * same control as Gift Management / Requisitions / Interviews.
 */
export function CandidateHiringSection({
  disabled,
  showBlacklist = false,
}: {
  disabled?: boolean;
  /** Edit mode only — create never blacklists a brand-new row. */
  showBlacklist?: boolean;
}) {
  const { values, setFieldValue } = useFormikContext<CandidateFormValues>();

  return (
    <FormSection
      tone={TRIO.purple}
      icon="briefcase"
      title="Hiring information"
      desc="Proposed joining and who referred them — optional until offer."
    >
      <Stack spacing={FORM_SPACE.fieldGap} sx={{ pt: FORM_SPACE.fieldGap / 2, maxWidth: { md: 520 } }}>
        <WtDateField
          label="Proposed joining date"
          value={values.proposedJoiningDate || null}
          onChange={(v) => setFieldValue("proposedJoiningDate", v)}
          disabled={disabled}
          helperText="Optional until an offer is made."
        />
        <EmployeePickerField
          label="Referred by"
          value={values.referredById || null}
          onChange={(ids) => setFieldValue("referredById", ids[0] ?? "")}
          disabled={disabled}
          placeholder="Not recorded"
          helperText="Optional. A colleague who referred this candidate."
          dialogTitle="Choose referrer"
        />
        {showBlacklist && (
          <Box>
            <WtSwitchField
              title="Blacklisted"
              description="Keeps the record (and its audit trail) but blocks new pool/role adds — the server refuses them."
              checked={values.isBlacklisted}
              onChange={(e) => setFieldValue("isBlacklisted", e.target.checked)}
              disabled={disabled}
            />
          </Box>
        )}
      </Stack>
    </FormSection>
  );
}

export default CandidateHiringSection;
