import type { RequisitionPayload } from "@services/recruitment";
import { annualAmountError } from "@utils/ctc";

/**
 * Blank requisition — roles open on create (RBAC, no approval panel).
 * Shared by Roles edit modal and Create Role wizard.
 */
export const emptyRequisitionForm = (defaults: { branchId?: string } = {}): RequisitionPayload => ({
    title: "",
    jobDescription: "",
    headcount: 1,
    employeeLevelId: null,
    branchId: defaults.branchId ?? "",
    departmentId: null,
    designationId: null,
    minCtc: null,
    maxCtc: null,
    targetStartDate: null,
    requisitionStageId: "",
});

/** Every problem with the CTC band, by field. Save is held while any exist. */
export const bandErrors = (min?: number | null, max?: number | null) => ({
    min: annualAmountError("Min CTC", min),
    max: annualAmountError("Max CTC", max)
        ?? (min != null && max != null && max < min ? "Max CTC cannot be less than min CTC" : undefined),
});

export const parseHeadcount = (text: string): { value: number; valid: boolean } => {
    const value = Number.parseInt(text, 10);
    return { value, valid: Number.isInteger(value) && value >= 1 };
};
