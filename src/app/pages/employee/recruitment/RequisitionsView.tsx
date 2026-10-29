import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, EntityCard, WtButton, ActionIconButton, TRIO,
    toast, confirmDialog, TableSelectionBar,
    WtEmptyState, CardsListViewSwitch, type CardsListView,
    type EntityCardTag,
} from "@app/modules/common/components/ui";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { queryKeys } from "@/lib/queryKeys";
import { useRememberedChoice } from "@/hooks/useRememberedChoice";
import { COPY, TERMS } from "./terms";
import { useRecruitmentBranches } from "@/hooks/useRecruitmentBranches";
import {
    getRequisitions, archiveRequisition, submitRequisitionApproval,
    type JobRequisition, type OrgScoped,
} from "@services/recruitment";
import { formatDate } from '@utils/dateFormats';
import { apiErrorMessage } from '@utils/apiError';
import { canSection } from '@utils/can';
import {
    stageOf, ctcLabel, requisitionColumns,
} from "./requisitionColumns";
import { useNavigate } from "react-router-dom";

const RequisitionsView = ({ companyId }: OrgScoped) => {
    const canWrite = canSection("recruitment", "write");
    const navigate = useNavigate();
    const qc = useQueryClient();
    /** Cards or list — remembered like Pipeline (audit M20). */
    const [mode, setMode] = useRememberedChoice<CardsListView>(
        "recruitment:roles-view", ["cards", "list"], "cards",
    );
    const { byId: branchById } = useRecruitmentBranches({ companyId });

    const { data: requisitions = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId ?? "", false),
        queryFn: () => getRequisitions(companyId),
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });

    /** Legacy drafts only — new roles open on create. No approval panel. */
    const openRoleMut = useMutation({
        mutationFn: (r: JobRequisition) => submitRequisitionApproval(r.id),
        onSuccess: () => { toast({ icon: "success", title: "Role opened for hiring" }); invalidate(); },
        onError: (err) => { toast({ icon: "error", title: apiErrorMessage(err, "Could not open the role") }); invalidate(); },
    });

    const archiveMut = useMutation({
        mutationFn: (id: string) => archiveRequisition(id),
        // The server's message says how many adverts came down with it.
        onSuccess: (data: { message?: string } | undefined) => { toast({ icon: "success", title: data?.message ?? "Requisition archived" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not archive the requisition") }),
    });

    const withCompany = (path: string) => {
        const q = new URLSearchParams();
        if (companyId) q.set("companyId", companyId);
        return `${path}${q.toString() ? `?${q}` : ""}`;
    };
    /** Create + Edit share JobCreateWizardHost (same as Candidate new/edit). */
    const openCreate = () => navigate(withCompany("/recruitment/jobs/create"));
    const openEdit = (r: JobRequisition) => navigate(withCompany(`/recruitment/jobs/${r.id}/edit`));

    const archive = async (r: JobRequisition) => {
        const ok = await confirmDialog({
            icon: "warning",
            title: "Archive this requisition?",
            text: `"${r.title}" moves to Archive. Its job adverts come off the careers page. Restore or permanently delete it from the Archive tab.`,
            confirmText: "Archive",
        });
        if (ok) archiveMut.mutate(r.id);
    };

    /**
     * List: icon-only, no wrap. Edit is always row/card click → wizard (locks role when needed).
     * Soft archive only — restore / hard delete live on the Archive tab.
     */
    const listActions = (r: JobRequisition) => {
        if (!canWrite) return null;
        const canOpen = !r.approvalPending && r.status !== 1;
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                flexWrap="nowrap"
                onClick={(e) => e.stopPropagation()}
                sx={{ whiteSpace: "nowrap" }}
            >
                {canOpen && (
                    <ActionIconButton
                        iconName="check"
                        size="sm"
                        tone="brand"
                        title="Open for hiring"
                        disabled={openRoleMut.isPending}
                        onClick={() => openRoleMut.mutate(r)}
                    />
                )}
                <ActionIconButton
                    iconName="trash"
                    size="sm"
                    tone="danger"
                    title="Archive"
                    disabled={archiveMut.isPending}
                    onClick={() => archive(r)}
                />
            </Stack>
        );
    };

    /** Card footer: Open (legacy) + Archive. Edit = whole-card click → wizard. */
    const cardActions = (r: JobRequisition) => {
        if (!canWrite) return null;
        const canOpen = !r.approvalPending && r.status !== 1;
        return (
            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ width: "100%" }}>
                {canOpen && (
                    <WtButton
                        ghost size="small"
                        startIcon={<KTIcon iconName="check" className="fs-7" />}
                        disabled={openRoleMut.isPending}
                        onClick={() => openRoleMut.mutate(r)}
                        sx={{ minHeight: 32, px: 1.25 }}
                    >
                        Open
                    </WtButton>
                )}
                <Box sx={{ flex: 1 }} />
                <ActionIconButton
                    iconName="trash" size="sm" tone="danger"
                    title="Archive"
                    disabled={archiveMut.isPending}
                    onClick={() => archive(r)}
                />
            </Stack>
        );
    };

    const listColumns = useMemo(
        () => requisitionColumns({
            branchName: (id) => branchById.get(id)?.name,
            actions: canWrite ? listActions : undefined,
            omit: ["ref"],
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: actions use live mutators
        [branchById, canWrite, archiveMut.isPending, openRoleMut.isPending, navigate, companyId],
    );

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title={TERMS.Requisitions}
                subtitle="A role is a request to hire. Raise it, then publish it to the careers page — who can do that is recruitment access, not a separate approval chain."
                actions={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <CardsListViewSwitch
                            ariaLabel="Roles view"
                            value={mode}
                            onChange={setMode}
                        />
                        {canWrite && (
                            <WtButton size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openCreate}>
                                Create Role
                            </WtButton>
                        )}
                    </Stack>
                }
            />

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : isError ? (
                <WtEmptyState variant="error" title="Could not load the roles" hint={apiErrorMessage(error, "Check your connection and try again.")} actionLabel="Retry" onAction={() => refetch()} />
            ) : requisitions.length === 0 ? (
                <WtEmptyState
                    icon="briefcase"
                    title={COPY.noRequisitions.title}
                    hint={COPY.noRequisitions.hint}
                    actionLabel={canWrite ? "Create Role" : undefined}
                    onAction={openCreate}
                />
            ) : mode === "list" ? (
                <MaterialTable
                    columns={listColumns}
                    data={requisitions}
                    isLoading={isLoading}
                    tableName="RecruitmentRolesList"
                    enableRowSelection={canWrite}
                    renderSelectionActions={(selected: JobRequisition[]) => (
                        <TableSelectionBar count={selected.length}>
                            <WtButton
                                size="small"
                                tone="danger"
                                disabled={archiveMut.isPending}
                                onClick={async () => {
                                    const ok = await confirmDialog({
                                        icon: "warning",
                                        title: `Archive ${selected.length} roles?`,
                                        text: "They move to Archive with their job adverts. Restore or permanently delete from the Archive tab.",
                                        confirmText: "Archive",
                                    });
                                    if (!ok) return;
                                    await Promise.allSettled(selected.map((r) => archiveMut.mutateAsync(r.id)));
                                }}
                            >
                                Archive selected
                            </WtButton>
                        </TableSelectionBar>
                    )}
                    muiTableProps={canWrite ? {
                        muiTableBodyRowProps: ({ row }: { row: { original: JobRequisition } }) => ({
                            onClick: () => openEdit(row.original),
                            sx: { cursor: "pointer" },
                        }),
                    } : undefined}
                />
            ) : (
                <AutoGrid min={320}>
                    {requisitions.map((r) => {
                        const meta = stageOf(r);
                        const ctc = ctcLabel(r.minCtc, r.maxCtc, r.currency);
                        const branchName = r.branchId ? branchById.get(r.branchId)?.name : undefined;
                        const status: EntityCardTag[] = [
                            { label: meta.label, tone: meta.tone },
                        ];
                        const tags: EntityCardTag[] = [
                            { label: `${r.filledCount}/${r.headcount} filled`, tone: "brand" },
                            ...(r.requisitionStage?.name
                                ? [{ label: r.requisitionStage.name, tone: "indigo" as const }]
                                : []),
                            ...(ctc ? [{ label: ctc, tone: "neutral" as const }] : []),
                            ...(r.targetStartDate
                                ? [{ label: `Starts ${formatDate(r.targetStartDate)}`, tone: "cyan" as const }]
                                : []),
                        ];
                        return (
                            <EntityCard
                                key={r.id}
                                icon="briefcase"
                                iconTrio={TRIO.blue}
                                title={r.title}
                                subtitle={r.prefix || undefined}
                                category={branchName}
                                description={r.jobDescription || undefined}
                                status={status}
                                tags={tags}
                                actions={canWrite ? cardActions(r) : undefined}
                                onClick={canWrite ? () => openEdit(r) : undefined}
                            />
                        );
                    })}
                </AutoGrid>
            )}

        </Box>
    );
};

export default RequisitionsView;
