import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, EntityCard, WtButton, TRIO,
    type EntityCardTag,
    WtSwitch, ActionIconButton, toast, confirmDialog, TableSelectionBar, WtEmptyState,
    CardsListViewSwitch, type CardsListView,
} from "@app/modules/common/components/ui";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { queryKeys } from "@/lib/queryKeys";
import { useRememberedChoice } from "@/hooks/useRememberedChoice";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
import { COPY, TERMS } from "./terms";
import {
    getPostings, updatePosting, deletePosting, getRequisitions,
    type JobPosting, type OrgScoped,
} from "@services/recruitment";
import { isRoleOpenForCandidates } from "@utils/requisitions";
import { postingColumns } from "./postingColumns";

/**
 * Job adverts — the public face of an approved role.
 *
 * The link a recruiter copies comes from the SERVER (`posting.publicUrl`). Copy is shown
 * only when `publicUrl` is set — no careers site configured ⇒ no inert control.
 *
 * Create Role lives on Roles. New Advert + Edit open JobCreateWizardHost
 * (`/recruitment/jobs/adverts/new` · `/recruitment/jobs/adverts/:id/edit`).
 */

const PostingsView = ({ companyId }: OrgScoped) => {
    const canWrite = canSection("recruitment", "write");
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [mode, setMode] = useRememberedChoice<CardsListView>(
        "recruitment:adverts-view", ["cards", "list"], "cards",
    );

    const { data: postings = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: queryKeys.recruitment.postings(companyId),
        queryFn: () => getPostings(companyId),
    });
    const { data: requisitions = [] } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId),
        queryFn: () => getRequisitions(companyId),
    });
    const approved = useMemo(
        () => requisitions.filter(isRoleOpenForCandidates),
        [requisitions],
    );

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.postings(companyId) });

    const withCompany = (path: string) => {
        const q = new URLSearchParams();
        if (companyId) q.set("companyId", companyId);
        return `${path}${q.toString() ? `?${q}` : ""}`;
    };
    /** Same wizard host as Edit — attach mode (pick open role, create posting only). */
    const openAttach = () => navigate(withCompany("/recruitment/jobs/adverts/new"));
    const openEdit = (p: JobPosting) => navigate(withCompany(`/recruitment/jobs/adverts/${p.id}/edit`));

    const publishMut = useMutation({
        mutationFn: (vars: { id: string; isPublished: boolean }) => updatePosting(vars.id, { isPublished: vars.isPublished }),
        onSuccess: (_d, vars) => { toast({ icon: "success", title: vars.isPublished ? "Advert is live on the careers page" : "Advert taken down" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the advert") }),
    });
    const deleteMut = useMutation({
        mutationFn: (id: string) => deletePosting(id),
        onSuccess: () => { toast({ icon: "success", title: "Advert removed" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not remove the advert") }),
    });

    /** One row at a time: the switch and the bin stay disabled until that row's write lands. */
    const busy = (id: string) =>
        (publishMut.isPending && publishMut.variables?.id === id) || (deleteMut.isPending && deleteMut.variables === id);

    const copyLink = async (p: JobPosting) => {
        if (!p.publicUrl) return;
        try { await navigator.clipboard.writeText(p.publicUrl); toast({ icon: "success", title: "Public link copied" }); }
        catch { toast({ icon: "info", title: p.publicUrl }); }
    };
    const remove = async (p: JobPosting) => {
        if (await confirmDialog({
            icon: "warning",
            title: "Archive this advert?",
            text: `"${p.title}" comes off the careers page and moves to Archive. Restore or permanently delete it from the Archive tab.`,
            confirmText: "Archive",
        })) deleteMut.mutate(p.id);
    };

    /** List: switch + icons, one line. Edit is row-click; no "Publish" label (aria covers it). */
    const listActions = (p: JobPosting) => (
        <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            flexWrap="nowrap"
            onClick={(e) => e.stopPropagation()}
            sx={{ whiteSpace: "nowrap", cursor: "default" }}
        >
            {canWrite && (
                <WtSwitch
                    size="sm"
                    checked={p.isPublished}
                    disabled={busy(p.id)}
                    aria-label={p.isPublished ? "Unpublish advert" : "Publish advert"}
                    onChange={(e) => publishMut.mutate({ id: p.id, isPublished: e.target.checked })}
                />
            )}
            {p.publicUrl ? (
                <ActionIconButton
                    iconName="copy"
                    title="Copy public link"
                    size="sm"
                    onClick={() => copyLink(p)}
                />
            ) : null}
            {canWrite && (
                <ActionIconButton
                    iconName="trash"
                    title="Archive"
                    tone="danger"
                    size="sm"
                    disabled={busy(p.id)}
                    onClick={() => remove(p)}
                />
            )}
        </Stack>
    );

    /** Card footer: Publish + copy + Archive. Edit = whole-card click → wizard. */
    const cardActions = (p: JobPosting) => (
        <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            onClick={(e) => e.stopPropagation()}
            sx={{ width: "100%", cursor: "default" }}
        >
            {canWrite && (
                <Stack direction="row" alignItems="center" spacing={0.75}>
                    <WtSwitch
                        size="sm"
                        checked={p.isPublished}
                        disabled={busy(p.id)}
                        aria-label={p.isPublished ? "Unpublish advert" : "Publish advert"}
                        onChange={(e) => publishMut.mutate({ id: p.id, isPublished: e.target.checked })}
                    />
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Publish</Typography>
                </Stack>
            )}
            <Box sx={{ flex: 1 }} />
            {p.publicUrl ? (
                <ActionIconButton
                    iconName="copy"
                    title="Copy public link"
                    size="sm"
                    onClick={() => copyLink(p)}
                />
            ) : null}
            {canWrite && (
                <ActionIconButton
                    iconName="trash"
                    title="Archive"
                    tone="danger"
                    size="sm"
                    disabled={busy(p.id)}
                    onClick={() => remove(p)}
                />
            )}
        </Stack>
    );

    const listColumns = useMemo(
        () => postingColumns({
            actions: listActions,
            omit: ["ref"],
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- actions use live mutators
        [canWrite, publishMut.isPending, deleteMut.isPending, publishMut.variables, deleteMut.variables],
    );

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title={TERMS.Postings}
                subtitle="Public adverts for approved roles — shown on the careers page."
                actions={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <CardsListViewSwitch
                            ariaLabel="Job adverts view"
                            value={mode}
                            onChange={setMode}
                        />
                        {canWrite && approved.length > 0 && (
                            <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openAttach}>
                                New Advert
                            </WtButton>
                        )}
                    </Stack>
                }
            />

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : isError ? (
                <WtEmptyState
                    variant="error"
                    title="Could not load the adverts"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : postings.length === 0 ? (
                <WtEmptyState
                    icon="notification-status"
                    title={COPY.noPostings.title}
                    hint={
                        canWrite && approved.length > 0
                            ? COPY.noPostings.hint
                            : "Raise a role under Roles first, then publish an advert here."
                    }
                    actionLabel={canWrite && approved.length > 0 ? COPY.noPostings.action : undefined}
                    onAction={canWrite && approved.length > 0 ? openAttach : undefined}
                />
            ) : mode === "list" ? (
                <MaterialTable
                    columns={listColumns}
                    data={postings}
                    isLoading={isLoading}
                    tableName="RecruitmentAdvertsList"
                    enableRowSelection={canWrite}
                    renderSelectionActions={(selected: JobPosting[]) => (
                        <TableSelectionBar count={selected.length}>
                            <WtButton
                                size="small"
                                tone="danger"
                                disabled={deleteMut.isPending}
                                onClick={async () => {
                                    const ok = await confirmDialog({
                                        icon: "warning",
                                        title: `Archive ${selected.length} adverts?`,
                                        text: "They come off the careers page and move to Archive. Restore or permanently delete from the Archive tab.",
                                        confirmText: "Archive",
                                    });
                                    if (!ok) return;
                                    await Promise.allSettled(selected.map((p) => deleteMut.mutateAsync(p.id)));
                                }}
                            >
                                Archive selected
                            </WtButton>
                        </TableSelectionBar>
                    )}
                    muiTableProps={canWrite ? {
                        muiTableBodyRowProps: ({ row }: { row: { original: JobPosting } }) => ({
                            onClick: () => openEdit(row.original),
                            sx: { cursor: "pointer" },
                        }),
                    } : undefined}
                />
            ) : (
                <AutoGrid min={320}>
                    {postings.map((p) => {
                        const tags: EntityCardTag[] = [
                            ...(p.location ? [{ label: p.location, tone: "neutral" as const }] : []),
                            ...(p.isRemote ? [{ label: "Remote", tone: "cyan" as const }] : []),
                            ...(p.showSalary ? [{ label: "Salary shown", tone: "success" as const }] : []),
                            ...(p.employmentType ? [{ label: p.employmentType, tone: "neutral" as const }] : []),
                        ];
                        return (
                            <EntityCard
                                key={p.id}
                                icon="notification-status"
                                iconTrio={p.isPublished ? TRIO.green : TRIO.cyan}
                                title={p.title}
                                subtitle={p.requisition?.prefix || undefined}
                                status={{
                                    label: p.isPublished ? "Published" : "Draft",
                                    tone: p.isPublished ? "success" : "warning",
                                }}
                                tags={tags}
                                actions={cardActions(p)}
                                onClick={canWrite ? () => openEdit(p) : undefined}
                            />
                        );
                    })}
                </AutoGrid>
            )}
        </Box>
    );
};

export default PostingsView;
