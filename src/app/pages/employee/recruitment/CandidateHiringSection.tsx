import { useMemo } from "react";
import { useFormikContext } from "formik";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "@mui/material";
import { WtField, WtDateField } from "@app/modules/common/components/ui";
import { fetchAllEmployees } from "@services/employee";
import type { CandidateFormValues } from "./candidateProfile";

/**
 * Candidate-only hiring subset: proposed joining + referred-by.
 * Source lives on the Application strip (ApplicantSource master, not employee Source of Hire).
 * No exit / rejoin / employee status — those are post-hire.
 */
export function CandidateHiringSection({ disabled }: { disabled?: boolean }) {
  const { values, setFieldValue } = useFormikContext<CandidateFormValues>();
  const { data: empRes } = useQuery({
    queryKey: ["recruitment", "referrer-employees"],
    queryFn: () => fetchAllEmployees(),
  });
  const referrerOptions = useMemo(() => {
    const employees = empRes?.data?.employees ?? [];
    return employees.map((emp: { id: string; users?: { firstName?: string; lastName?: string } }) => ({
      value: emp.id,
      label: `${emp.users?.firstName ?? ""} ${emp.users?.lastName ?? ""}`.trim() || emp.id,
    }));
  }, [empRes]);

  return (
    <Stack spacing={2}>
      <WtDateField
        label="Proposed joining date"
        value={values.proposedJoiningDate || null}
        onChange={(v) => setFieldValue("proposedJoiningDate", v)}
        disabled={disabled}
        helperText="Optional until an offer is made."
      />
      <WtField
        label="Referred by"
        clearable
        searchable={referrerOptions.length >= 8}
        value={values.referredById}
        onChange={(v) => setFieldValue("referredById", v)}
        options={referrerOptions}
        placeholder="Not recorded"
        disabled={disabled}
        hint="Optional. A colleague who referred this candidate."
      />
    </Stack>
  );
}

export default CandidateHiringSection;
