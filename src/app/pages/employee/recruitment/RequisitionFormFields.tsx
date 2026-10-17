import { Stack, Typography } from "@mui/material";
import { WtField, WtDateField, WtMoneyField } from "@app/modules/common/components/ui";
import { DepartmentDesignationFields } from "@app/modules/common/components/DepartmentDesignationFields";
import { RecruitmentBranchField } from "./RecruitmentBranchField";
import { bandErrors, parseHeadcount } from "./requisitionFormModel";
import type { RequisitionPayload } from "@services/recruitment";

export interface RequisitionFormFieldsProps {
    value: RequisitionPayload;
    onChange: (next: RequisitionPayload) => void;
    /** Headcount as typed text (avoids number-input “15” when replacing 1). */
    headcountText: string;
    onHeadcountTextChange: (text: string) => void;
    companyId?: string;
    /** ISO currency for the CTC band (branch-resolved). */
    bandCurrency?: string | null;
    branchUsable?: boolean;
    levels?: ReadonlyArray<{ id: string; name: string }>;
    hideLevels?: boolean;
    stages?: ReadonlyArray<{ id: string; name: string }>;
    /** Rejected-status notice for edit modal. */
    rejectedNotice?: boolean;
    disabled?: boolean;
}

/**
 * Internal role fields — one UI for Roles edit modal and Create Role wizard.
 */
export function RequisitionFormFields({
    value,
    onChange,
    headcountText,
    onHeadcountTextChange,
    companyId,
    bandCurrency,
    branchUsable = true,
    levels = [],
    hideLevels = false,
    stages = [],
    rejectedNotice = false,
    disabled = false,
}: RequisitionFormFieldsProps) {
    const band = bandErrors(value.minCtc, value.maxCtc);
    const { valid: headcountValid } = parseHeadcount(headcountText);
    const patch = (partial: Partial<RequisitionPayload>) => onChange({ ...value, ...partial });

    return (
        <Stack spacing={2}>
            {rejectedNotice && (
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    This requisition was rejected. Adjust it, save, then resubmit it for approval.
                </Typography>
            )}
            <WtField
                label="Title"
                required
                fullWidth
                value={value.title}
                onChange={(v) => patch({ title: v })}
                disabled={disabled}
            />
            <WtField
                label="Job Description"
                fullWidth
                multiline
                minRows={3}
                value={value.jobDescription ?? ""}
                onChange={(v) => patch({ jobDescription: v })}
                disabled={disabled}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtField
                    label="Headcount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    required
                    sx={{ flex: 1 }}
                    value={headcountText}
                    onChange={onHeadcountTextChange}
                    error={headcountText !== "" && !headcountValid ? "At least 1" : undefined}
                    disabled={disabled}
                />
                <WtDateField
                    label="Target Start Date"
                    sx={{ flex: 1 }}
                    value={value.targetStartDate}
                    onChange={(v) => patch({ targetStartDate: v || null })}
                    disabled={disabled}
                />
                {!hideLevels && (
                    <WtField
                        label="Seniority"
                        sx={{ flex: 1 }}
                        clearable
                        value={value.employeeLevelId ?? ""}
                        onChange={(v) => patch({ employeeLevelId: v || null })}
                        options={levels.map((l) => ({ value: l.id, label: l.name }))}
                        placeholder="Not set"
                        disabled={disabled}
                    />
                )}
            </Stack>
            <RecruitmentBranchField
                companyId={companyId}
                required
                value={value.branchId}
                onChange={(v) => patch({ branchId: v })}
                error={value.branchId && !branchUsable ? "This branch is no longer active. Choose another." : undefined}
                disabled={disabled}
            />
            <DepartmentDesignationFields
                departmentId={value.departmentId ?? null}
                designationId={value.designationId ?? null}
                onChange={(next) => patch({ departmentId: next.departmentId, designationId: next.designationId })}
                disabled={disabled}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtMoneyField
                    label="Min CTC"
                    per="year"
                    currency={bandCurrency ?? undefined}
                    sx={{ flex: 1 }}
                    value={value.minCtc}
                    onChange={(v) => patch({ minCtc: v })}
                    error={band.min}
                />
                <WtMoneyField
                    label="Max CTC"
                    per="year"
                    currency={bandCurrency ?? undefined}
                    sx={{ flex: 1 }}
                    value={value.maxCtc}
                    onChange={(v) => patch({ maxCtc: v })}
                    error={band.max}
                />
                {stages.length > 0 && (
                    <WtField
                        label="Stage"
                        clearable
                        sx={{ flex: 1 }}
                        value={value.requisitionStageId ?? ""}
                        onChange={(v) => patch({ requisitionStageId: v || null })}
                        options={stages.map((s) => ({ value: s.id, label: s.name }))}
                        placeholder="Default"
                        disabled={disabled}
                    />
                )}
            </Stack>
        </Stack>
    );
}

export default RequisitionFormFields;
