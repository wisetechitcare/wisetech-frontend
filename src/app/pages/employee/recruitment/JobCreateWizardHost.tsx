import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMatch, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Formik, Form, useFormikContext, type FormikProps } from "formik";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, Stack } from "@mui/material";
import { History } from "@mui/icons-material";
import { toast, confirmDialog, WtButton } from "@app/modules/common/components/ui";
import RecruitmentVersionHistoryDialog from "./RecruitmentVersionHistoryDialog";
import type { AuditEntityType } from "@modules/audit/audit.service";
import { queryKeys } from "@/lib/queryKeys";
import { useOrgScope, toCompanyIdParam } from "@/hooks/useOrgScope";
import { useEmployeeLevels } from "@/hooks/useEmployeeLevels";
import { useRecruitmentBranches } from "@/hooks/useRecruitmentBranches";
import { useDepartmentDesignations } from "@/hooks/useDepartmentDesignations";
import { apiErrorMessage } from "@utils/apiError";
import { isRoleOpenForCandidates } from "@utils/requisitions";
import {
    createRequisition,
    createPosting,
    getRequisitionById,
    getRequisitions,
    getRequisitionStages,
    getPostingById,
    getPostings,
    updateRequisition,
    updatePosting,
    type JobPosting,
    type JobRequisition,
} from "@services/recruitment";
import { EnterpriseFormWizard } from '@/shared/form-engine';
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import { WtWizardDialog } from '@app/modules/common/components/ui';
import { buildJobCreateWizardGroups, JOB_CREATE_LEAF_IDS } from "./buildJobCreateWizardGroups";
import { isEditable } from "./requisitionColumns";
import {
    emptyJobCreateFormValues,
    jobCreateValuesFromEntities,
    pickPostingForRole,
    roleSectionComplete,
    toPostingPayload,
    toPostingUpdatePayload,
    toRequisitionPayload,
    type JobCreateFormValues,
} from "./jobCreateFormValues";
import { sanitizeApplyFormConfig } from "./postingFormModel";
import { bandErrors, parseHeadcount } from "./requisitionFormModel";

/**
 * Full-page Create / Edit Role / New Advert wizard — same shell as Candidate / Onboarding.
 * Create: requisition then careers advert (draft or published).
 * Edit: update role (when unlocked) + update or create the linked advert.
 * Attach: pick an open role, create posting only (New Advert).
 *
 * Routes:
 *   /recruitment/jobs/create
 *   /recruitment/jobs/:requisitionId/edit
 *   /recruitment/jobs/adverts/new
 *   /recruitment/jobs/adverts/:postingId/edit
 */
export default function JobCreateWizardHost() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { requisitionId: routeReqId, postingId: routePostingId } = useParams<{
        requisitionId?: string;
        postingId?: string;
    }>();
    const isAttach = Boolean(useMatch({ path: "/recruitment/jobs/adverts/new", end: true }));
    const [searchParams] = useSearchParams();
    const shellCompanyId = searchParams.get("companyId") ?? "";
    const isEdit = Boolean(routeReqId || routePostingId);
    const [historyTarget, setHistoryTarget] = useState<{ type: AuditEntityType; id: string; title: string } | null>(null);

    const { scopeId } = useOrgScope({
        includeAll: true,
        initialScopeId: shellCompanyId || undefined,
    });
    const companyId = toCompanyIdParam(scopeId);

    const { levels, isEmpty: noLevels } = useEmployeeLevels();
    const { byId: branchById, defaultBranchId, isLoading: branchesLoading } = useRecruitmentBranches({
        companyId,
    });
    const { isPairAllowed } = useDepartmentDesignations();
    const { data: stages = [] } = useQuery({
        queryKey: queryKeys.recruitment.requisitionStages(),
        queryFn: getRequisitionStages,
    });

    const [show, setShow] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formikRef = useRef<FormikProps<JobCreateFormValues> | null>(null);

    const { data: postingById, isLoading: loadingPosting } = useQuery({
        queryKey: [...queryKeys.recruitment.postings(companyId), "one", routePostingId],
        queryFn: () => getPostingById(routePostingId!),
        enabled: Boolean(routePostingId),
    });

    const requisitionIdToLoad = routeReqId || postingById?.requisitionId || undefined;

    const { data: requisition, isLoading: loadingReq } = useQuery({
        queryKey: [...queryKeys.recruitment.requisitions(companyId), "one", requisitionIdToLoad],
        queryFn: () => getRequisitionById(requisitionIdToLoad!),
        enabled: Boolean(requisitionIdToLoad),
    });

    const { data: postingsForRole = [], isLoading: loadingRolePostings } = useQuery({
        queryKey: [...queryKeys.recruitment.postings(companyId), "for-role", routeReqId],
        queryFn: () => getPostings(companyId),
        enabled: Boolean(routeReqId) && !routePostingId,
    });

    const { data: attachRoles = [], isLoading: loadingAttachRoles } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId),
        queryFn: () => getRequisitions(companyId),
        enabled: isAttach,
    });
    const openRoles = useMemo(
        () => attachRoles.filter(isRoleOpenForCandidates),
        [attachRoles],
    );

    const linkedPosting: JobPosting | null = useMemo(() => {
        if (routePostingId) return postingById ?? null;
        if (routeReqId) return pickPostingForRole(postingsForRole, routeReqId);
        return null;
    }, [routePostingId, postingById, routeReqId, postingsForRole]);

    const loadingEdit =
        isEdit &&
        (loadingPosting ||
            loadingReq ||
            (Boolean(routeReqId) && !routePostingId && loadingRolePostings) ||
            (Boolean(routePostingId) && !requisition && !loadingReq && postingById === undefined));

    const roleEditable = isAttach ? false : requisition ? isEditable(requisition) : true;

    const leavePath = () => {
        if (isAttach || routePostingId) {
            return companyId ? `/recruitment/job-adverts?companyId=${companyId}` : "/recruitment/job-adverts";
        }
        return companyId ? `/recruitment/roles?companyId=${companyId}` : "/recruitment/roles";
    };

    const goBack = () => {
        setShow(false);
        navigate(leavePath());
    };

    const handleCancel = async () => {
        const dirty = formikRef.current?.dirty;
        if (dirty) {
            const ok = await confirmDialog({
                icon: "warning",
                title: isEdit ? "Discard changes?" : isAttach ? "Discard this advert?" : "Discard this role?",
                text: isEdit ? "Unsaved edits will be lost." : "Nothing has been saved yet.",
                confirmText: "Discard",
                danger: true,
            });
            if (!ok) return;
        }
        goBack();
    };

    const createMut = useMutation({
        mutationFn: async ({ values, publish }: { values: JobCreateFormValues; publish: boolean }) => {
            const applyFormConfig = sanitizeApplyFormConfig(values.applyFormConfig);
            const withConfig = { ...values, applyFormConfig };

            if (isAttach) {
                const requisitionId = values.advert.requisitionId;
                if (!requisitionId) throw new Error("Choose an approved role for this advert");
                await createPosting(toPostingPayload(withConfig, requisitionId, publish), companyId);
                return { publish, attach: true as const };
            }

            const rolePayload = toRequisitionPayload(values);
            const reqRes = await createRequisition(rolePayload, companyId);
            const requisitionId: string | undefined = reqRes?.requisition?.id;
            if (!requisitionId) throw new Error("Role was created but no id came back");

            const postingPayload = toPostingPayload(withConfig, requisitionId, publish);
            try {
                await createPosting(postingPayload, companyId);
            } catch (err) {
                const msg = apiErrorMessage(err, "Could not create the advert");
                throw Object.assign(new Error(msg), { roleCreated: true, requisitionId });
            }
            return { publish, attach: false as const };
        },
        onSuccess: ({ publish, attach }) => {
            qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
            toast({
                icon: "success",
                title: publish
                    ? "Advert is live on the careers page"
                    : attach
                      ? "Advert created — not on the careers page yet"
                      : "Role created — advert not on the careers page yet",
            });
            setShow(false);
            navigate(companyId ? `/recruitment/job-adverts?companyId=${companyId}` : "/recruitment/job-adverts");
        },
        onError: (err: Error & { roleCreated?: boolean }) => {
            if (err.roleCreated) {
                toast({
                    icon: "warning",
                    title: "Role created, but the advert failed",
                    text: `${err.message} Open Roles to attach an advert.`,
                });
                qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
                setShow(false);
                navigate(companyId ? `/recruitment/roles?companyId=${companyId}` : "/recruitment/roles");
                return;
            }
            toast({
                icon: "error",
                title: apiErrorMessage(err, isAttach ? "Could not create the advert" : "Could not create the role"),
            });
        },
    });

    const updateMut = useMutation({
        mutationFn: async ({
            values,
            publish,
            req,
            posting,
        }: {
            values: JobCreateFormValues;
            publish: boolean;
            req: JobRequisition;
            posting: JobPosting | null;
        }) => {
            const applyFormConfig = sanitizeApplyFormConfig(values.applyFormConfig);
            const withConfig = { ...values, applyFormConfig };

            if (isEditable(req)) {
                await updateRequisition(
                    req.id,
                    toRequisitionPayload(withConfig, { expectedRevisionCount: req.revisionCount }),
                );
            }

            const isPublished = publish ? true : (posting?.isPublished ?? false);
            if (posting) {
                await updatePosting(posting.id, toPostingUpdatePayload(withConfig, isPublished));
            } else {
                await createPosting(toPostingPayload(withConfig, req.id, isPublished), companyId);
            }
            return { publish, hadPosting: Boolean(posting) };
        },
        onSuccess: ({ publish }) => {
            qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
            toast({
                icon: "success",
                title: publish ? "Saved — advert is live on the careers page" : "Changes saved",
            });
            goBack();
        },
        onError: (err) => {
            toast({ icon: "error", title: apiErrorMessage(err, "Could not save changes") });
        },
    });

    const validateBeforeSubmit = (values: JobCreateFormValues): string | null => {
        if (isAttach) {
            if (!values.advert.requisitionId) return "Choose an approved role for this advert";
            return null;
        }
        if (roleEditable && !roleSectionComplete(values)) {
            return "Fill in title, branch and a valid headcount before continuing";
        }
        if (roleEditable && !isPairAllowed(values.role.departmentId, values.role.designationId)) {
            if (
                !(
                    requisition &&
                    (values.role.departmentId ?? null) === (requisition.departmentId ?? null) &&
                    (values.role.designationId ?? null) === (requisition.designationId ?? null)
                )
            ) {
                return "Choose a designation that belongs to the selected department";
            }
        }
        if (roleEditable) {
            const band = bandErrors(values.role.minCtc, values.role.maxCtc);
            if (band.min || band.max) return band.min || band.max || null;
            const { valid } = parseHeadcount(values.headcountText);
            if (!valid) return "Headcount must be at least 1";
        }
        return null;
    };

    const runSubmit = async (publish: boolean) => {
        const f = formikRef.current;
        if (!f) return;
        const err = validateBeforeSubmit(f.values);
        if (err) {
            toast({ icon: "warning", title: err });
            return;
        }
        setIsSubmitting(true);
        try {
            if (isEdit) {
                if (!requisition) {
                    toast({ icon: "error", title: "Role could not be loaded" });
                    return;
                }
                await updateMut.mutateAsync({
                    values: f.values,
                    publish,
                    req: requisition,
                    posting: linkedPosting,
                });
            } else {
                await createMut.mutateAsync({ values: f.values, publish });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const initialValues = useMemo((): JobCreateFormValues => {
        if (isEdit && requisition) {
            return jobCreateValuesFromEntities(requisition, linkedPosting);
        }
        return emptyJobCreateFormValues({ branchId: defaultBranchId || undefined });
        // linkedPosting identity changes once; reinitialize Formik when edit payload lands
        // eslint-disable-next-line react-hooks/exhaustive-deps -- seed from entities when ready
    }, [isEdit, requisition?.id, linkedPosting?.id, defaultBranchId]);

    /**
     * Rows for one wizard leaf — the single source for both the Summary aside (all
     * leaves, rail order) and that leaf's Review card.
     */
    const leafRows = (leafId: string, v: JobCreateFormValues) => {
        const rows: Array<{ label: string; value: ReactNode; isStrong?: boolean }> = [];
        if (leafId === "role") {
            if (v.role?.title) rows.push({ label: "Role title", value: v.role.title, isStrong: true });
            if (v.headcountText) rows.push({ label: "Headcount", value: v.headcountText });
            if (v.role?.branchId) {
                const b = branchById.get(v.role.branchId);
                rows.push({ label: "Branch", value: b?.name ?? v.role.branchId });
            }
            if (v.role?.minCtc != null || v.role?.maxCtc != null) {
                rows.push({
                    label: "CTC band",
                    value: `${v.role.minCtc ?? "—"} – ${v.role.maxCtc ?? "—"}`,
                });
            }
        } else if (leafId === "advert") {
            const pubTitle = (v.advert?.title || v.role?.title || "").trim();
            if (pubTitle) rows.push({ label: "Public title", value: pubTitle });
            if (v.advert?.location) rows.push({ label: "Location", value: v.advert.location });
            if (v.advert?.employmentType) rows.push({ label: "Employment type", value: v.advert.employmentType });
            rows.push({ label: "Remote", value: v.advert?.isRemote ? "Yes" : "No" });
            rows.push({ label: "Show salary", value: v.advert?.showSalary ? "Yes" : "No" });
        } else if (leafId === "screening") {
            const q = v.applyFormConfig?.fields?.filter((f) => f.label.trim()).length ?? 0;
            rows.push({ label: "Screening questions", value: q === 0 ? "None" : String(q) });
        }
        return rows;
    };

    const summaryRows = (v: JobCreateFormValues) =>
        JOB_CREATE_LEAF_IDS.flatMap((leafId) => leafRows(leafId, v));

    if (loadingEdit) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (isEdit && !loadingEdit && !requisition) {
        return (
            <WtWizardDialog title="Role and advert" open onClose={goBack} closeLabel="Close" className="onboarding-wizard-modal">
                <Box sx={{ p: 4, textAlign: "center" }}>
                    Could not load this role. It may have been removed.
                </Box>
            </WtWizardDialog>
        );
    }

    return (
        <WtWizardDialog title={isAttach ? "New Advert" : isEdit ? "Edit Role" : "Create Role"}
            subtitle={isAttach ? "Publish an advert for this approved role" : "Define the role, advert and screening requirements"}
            icon="briefcase" closeGuard="host"
            open={show}
            onClose={handleCancel}
            closeLabel={isEdit ? "Close edit role wizard" : "Close create role wizard"}
            className="onboarding-wizard-modal"
        >
            <Formik
                initialValues={initialValues}
                onSubmit={() => void runSubmit(true)}
                enableReinitialize={isEdit}
            >
                {(formikProps) => {
                    formikRef.current = formikProps;
                    const branchId = formikProps.values.role.branchId;
                    const bandCurrency =
                        (branchId && branchById.get(branchId)?.currency) ||
                        requisition?.currency ||
                        undefined;
                    const branchUsable = !branchId || branchesLoading || branchById.has(branchId);
                    const groups = buildJobCreateWizardGroups({
                        companyId,
                        bandCurrency,
                        branchUsable,
                        levels,
                        hideLevels: noLevels,
                        stages,
                        disabled: isSubmitting,
                        roleDisabled: (isEdit && !roleEditable) || isAttach,
                        rejectedNotice: requisition?.status === 2,
                        attachMode: isAttach,
                        roleOptions: openRoles,
                        rolesLoading: loadingAttachRoles,
                    });
                    const sectionProps: OnboardingSectionsProps = {
                        formikProps: formikProps as never,
                        editMode: isEdit,
                        setFile: () => undefined,
                        softRequired: true,
                    };
                    const prefix = requisition?.prefix;
                    const headerTitle = isAttach ? "New Advert" : isEdit ? "Edit Role" : "Create Role";
                    // History stays in headerSub — never a Form sibling. enterprise-wizard is
                    // height:100% under overflow:hidden; a Stack above it clips the footer.
                    const subtitleText = isAttach
                        ? "From an approved role — careers advert and screening"
                        : isEdit
                          ? (prefix
                              ? `${prefix} — role, careers advert and screening`
                              : "Role, careers advert and screening")
                          : "Role, careers advert and screening — then create or publish";
                    const showHistory = isEdit && Boolean(requisition?.id || linkedPosting?.id);
                    const headerSub: ReactNode = showHistory ? (
                        <Stack
                            component="span"
                            direction="row"
                            alignItems="center"
                            flexWrap="wrap"
                            useFlexGap
                            spacing={1}
                            sx={{ display: "inline-flex", maxWidth: "100%" }}
                        >
                            <span>{subtitleText}</span>
                            {requisition?.id && (
                                <WtButton
                                    type="button"
                                    size="small"
                                    ghost
                                    startIcon={<History fontSize="small" />}
                                    onClick={() =>
                                        setHistoryTarget({
                                            type: "REQUISITION",
                                            id: requisition.id,
                                            title: "Role History",
                                        })
                                    }
                                >
                                    Role history
                                </WtButton>
                            )}
                            {linkedPosting?.id && (
                                <WtButton
                                    type="button"
                                    size="small"
                                    ghost
                                    startIcon={<History fontSize="small" />}
                                    onClick={() =>
                                        setHistoryTarget({
                                            type: "POSTING",
                                            id: linkedPosting.id,
                                            title: "Advert History",
                                        })
                                    }
                                >
                                    Advert history
                                </WtButton>
                            )}
                        </Stack>
                    ) : (
                        subtitleText
                    );
                    return (
                        <Form noValidate style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            {!isEdit && !isAttach && <BranchDefaultSync defaultBranchId={defaultBranchId} />}
                            <EnterpriseFormWizard layout="sections"
                                groups={groups}
                                sectionProps={sectionProps}
                                headerTitle={headerTitle}
                                headerSub={headerSub}
                                defaultValues={emptyJobCreateFormValues()}
                                isSubmitting={isSubmitting}
                                isEditMode={isEdit}
                                onCancel={handleCancel}
                                onFinalSave={() => void runSubmit(true)}
                                onDirectSave={() => void runSubmit(false)}
                                directSaveLabel={
                                    isAttach ? "Create Advert" : isEdit ? "Save Changes" : "Create Role"
                                }
                                submitText={isEdit && linkedPosting?.isPublished ? "Done" : "Publish"}
                                summaryTitle="Summary"
                                summaryRows={(v) => summaryRows(v as JobCreateFormValues)}
                                review={{ rows: (leafId, v) => leafRows(leafId, v as JobCreateFormValues) }}
                            />
                        </Form>
                    );
                }}
            </Formik>
            <RecruitmentVersionHistoryDialog
                open={!!historyTarget}
                onClose={() => setHistoryTarget(null)}
                type={historyTarget?.type ?? "REQUISITION"}
                id={historyTarget?.id ?? ""}
                title={historyTarget?.title}
            />
        </WtWizardDialog>
    );
}

/** Fill branch once when recruitment branches land and the field is still blank. */
function BranchDefaultSync({ defaultBranchId }: { defaultBranchId?: string }) {
    const { values, setFieldValue } = useFormikContext<JobCreateFormValues>();
    useEffect(() => {
        if (!defaultBranchId || values?.role?.branchId) return;
        void setFieldValue("role.branchId", defaultBranchId);
    }, [defaultBranchId, values?.role?.branchId, setFieldValue]);
    return null;
}
