import type {
    ApplyFormConfig,
    JobPosting,
    JobRequisition,
    PostingPayload,
    RequisitionPayload,
} from "@services/recruitment";
import { emptyRequisitionForm, parseHeadcount, bandErrors } from "./requisitionFormModel";
import { emptyPostingForm, normalizeFormConfig } from "./postingFormModel";

/**
 * Formik shape for Create / Edit Role wizard — role + advert + screening in one save.
 */
export interface JobCreateFormValues {
    role: RequisitionPayload;
    /** Headcount as typed text (shared with RequisitionFormFields). */
    headcountText: string;
    advert: PostingPayload;
    applyFormConfig: ApplyFormConfig;
    /** Once true, do not overwrite public description from role JD again. */
    descriptionPrefillDone: boolean;
}

export const emptyJobCreateFormValues = (defaults: { branchId?: string } = {}): JobCreateFormValues => {
    const advert = emptyPostingForm();
    return {
        role: emptyRequisitionForm(defaults),
        headcountText: "1",
        advert: { ...advert, requisitionId: undefined },
        applyFormConfig: { fields: [] },
        descriptionPrefillDone: false,
    };
};

/** Seed the wizard from an existing role (+ optional careers advert). */
export const jobCreateValuesFromEntities = (
    req: JobRequisition,
    posting?: JobPosting | null,
): JobCreateFormValues => {
    const applyFormConfig = normalizeFormConfig(posting?.applyFormConfig);
    return {
        role: {
            title: req.title,
            jobDescription: req.jobDescription ?? "",
            headcount: req.headcount ?? 1,
            employeeLevelId: req.employeeLevelId ?? null,
            branchId: req.branchId ?? "",
            departmentId: req.departmentId ?? null,
            designationId: req.designationId ?? null,
            minCtc: req.minCtc == null ? null : Number(req.minCtc),
            maxCtc: req.maxCtc == null ? null : Number(req.maxCtc),
            targetStartDate: req.targetStartDate ? req.targetStartDate.slice(0, 10) : null,
            requisitionStageId: req.requisitionStageId ?? "",
        },
        headcountText: String(req.headcount ?? 1),
        advert: posting
            ? {
                requisitionId: posting.requisitionId,
                title: posting.title ?? "",
                location: posting.location ?? "",
                isRemote: !!posting.isRemote,
                employmentType: posting.employmentType ?? "Full-time",
                descriptionHtml: posting.descriptionHtml ?? "",
                isPublished: !!posting.isPublished,
                showSalary: !!posting.showSalary,
                expiresAt: posting.expiresAt ? posting.expiresAt.slice(0, 10) : null,
                applyFormConfig,
            }
            : { ...emptyPostingForm(), requisitionId: req.id },
        applyFormConfig,
        descriptionPrefillDone: true,
    };
};

/** Prefer a live advert when a role has more than one. */
export const pickPostingForRole = (
    postings: JobPosting[],
    requisitionId: string,
): JobPosting | null => {
    const forRole = postings.filter((p) => p.requisitionId === requisitionId);
    if (forRole.length === 0) return null;
    return forRole.find((p) => p.isPublished) ?? forRole[0] ?? null;
};

export const roleSectionComplete = (v: JobCreateFormValues): boolean => {
    const titleOk = Boolean(v.role?.title?.trim());
    const branchOk = Boolean(v.role?.branchId);
    const { valid: headcountOk } = parseHeadcount(v.headcountText ?? "");
    const band = bandErrors(v.role?.minCtc, v.role?.maxCtc);
    return titleOk && branchOk && headcountOk && !band.min && !band.max;
};

export const toRequisitionPayload = (
    v: JobCreateFormValues,
    opts: { expectedRevisionCount?: number } = {},
): RequisitionPayload => {
    const { value: headcount } = parseHeadcount(v.headcountText);
    return {
        ...v.role,
        headcount,
        jobDescription: v.role.jobDescription || null,
        departmentId: v.role.departmentId || null,
        designationId: v.role.designationId || null,
        requisitionStageId: v.role.requisitionStageId || null,
        minCtc: v.role.minCtc ?? null,
        maxCtc: v.role.maxCtc ?? null,
        targetStartDate: v.role.targetStartDate || null,
        ...(opts.expectedRevisionCount != null
            ? { expectedRevisionCount: opts.expectedRevisionCount }
            : {}),
    };
};

export const toPostingPayload = (
    v: JobCreateFormValues,
    requisitionId: string,
    isPublished: boolean,
): PostingPayload => ({
    ...v.advert,
    requisitionId,
    title: (v.advert.title || v.role.title || "").trim() || v.role.title,
    descriptionHtml: v.advert.descriptionHtml || v.role.jobDescription || null,
    isPublished,
    applyFormConfig: v.applyFormConfig,
});

/** Update payload — role link is immutable once the public slug exists. */
export const toPostingUpdatePayload = (
    v: JobCreateFormValues,
    isPublished: boolean,
): Omit<PostingPayload, "requisitionId"> => {
    const { requisitionId: _role, ...rest } = toPostingPayload(v, v.advert.requisitionId ?? "", isPublished);
    return rest;
};
