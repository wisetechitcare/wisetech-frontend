import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import {
  ActionIconButton, FILTER_TONES, ListHeader, TableSelectionBar,
  WtButton, WtEmptyState, confirmDialog, toast,
} from "@app/modules/common/components/ui";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { actionsColumn, dateColumn } from "@app/modules/common/components/table/columns";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
import {
  getRequisitions, restoreRequisition, permanentlyDeleteRequisition,
  getPostings, restorePosting, permanentlyDeletePosting,
  getApplications, restoreApplication, permanentlyDeleteApplication,
  getApplicants, restoreApplicant, permanentlyDeleteApplicant,
  type JobRequisition, type JobPosting, type Application, type Applicant, type OrgScoped,
} from "@services/recruitment";
import { TERMS } from "./terms";

type ArchiveKind = "all" | "roles" | "adverts" | "applications" | "candidates";
type ArchiveEntityKind = Exclude<ArchiveKind, "all">;

const KIND_OPTIONS: ReadonlyArray<{ value: ArchiveKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "roles", label: TERMS.Requisitions },
  { value: "adverts", label: TERMS.Postings },
  { value: "applications", label: "Applications" },
  { value: "candidates", label: TERMS.Candidates },
];

const KIND_LABEL: Record<ArchiveEntityKind, string> = {
  roles: TERMS.Requisition,
  adverts: TERMS.Posting,
  applications: "Application",
  candidates: TERMS.Candidate,
};

/** One archive row — composite `id` so All-tab selection never collides across entity types. */
type ArchiveRow = {
  id: string;
  entityId: string;
  kind: ArchiveEntityKind;
  title: string;
  detail: string;
  updatedAt?: string | null;
  cascadeText: string;
};

function candidateName(a: Applicant) {
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || a.phone || "Candidate";
}

function applicationLabel(a: Application) {
  const p = a.applicant;
  return p ? [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "Application" : "Application";
}

const cascadeFor = (kind: ArchiveEntityKind): string => {
  switch (kind) {
    case "roles":
      return "All applications, interviews, offers, and job adverts on this role will be deleted too.";
    case "adverts":
      return "Applications keep their candidate; only this advert is removed.";
    case "applications":
      return "Interviews, offers, notes, and stage history for this application will be deleted. The candidate record stays.";
    case "candidates":
      return "All of their applications, interviews, and offers will be deleted too.";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
};

/** Prefer updatedAt when the API sends it; fall back to createdAt. */
const archivedAt = (r: { updatedAt?: string; createdAt?: string }) =>
  r.updatedAt ?? r.createdAt ?? null;

const toRoleRows = (rows: JobRequisition[]): ArchiveRow[] =>
  rows.map((r) => ({
    id: `roles:${r.id}`,
    entityId: r.id,
    kind: "roles",
    title: r.title,
    detail: r.prefix ?? "—",
    updatedAt: archivedAt(r),
    cascadeText: cascadeFor("roles"),
  }));

const toAdvertRows = (rows: JobPosting[]): ArchiveRow[] =>
  rows.map((p) => ({
    id: `adverts:${p.id}`,
    entityId: p.id,
    kind: "adverts",
    title: p.title,
    detail: p.requisition?.title ?? "—",
    updatedAt: archivedAt(p as { updatedAt?: string; createdAt?: string }),
    cascadeText: cascadeFor("adverts"),
  }));

const toAppRows = (rows: Application[]): ArchiveRow[] =>
  rows.map((a) => ({
    id: `applications:${a.id}`,
    entityId: a.id,
    kind: "applications",
    title: applicationLabel(a),
    detail: a.requisition?.title ?? "—",
    updatedAt: archivedAt(a as { updatedAt?: string; createdAt?: string }),
    cascadeText: cascadeFor("applications"),
  }));

const toCandidateRows = (rows: Applicant[]): ArchiveRow[] =>
  rows.map((a) => ({
    id: `candidates:${a.id}`,
    entityId: a.id,
    kind: "candidates",
    title: candidateName(a),
    detail: a.email || a.phone || "—",
    updatedAt: archivedAt(a as { updatedAt?: string; createdAt?: string }),
    cascadeText: cascadeFor("candidates"),
  }));

/**
 * Soft-deleted Roles / Adverts / Applications / Candidates.
 * Restore brings them back; Delete permanently cascades children (confirm always).
 * Uses kit SegmentedControl + MaterialTable selection + shared actionsColumn / dateColumn.
 */
const ArchiveView = ({ companyId }: OrgScoped) => {
  const canWrite = canSection("recruitment", "write");
  const qc = useQueryClient();
  const [kind, setKind] = useState<ArchiveKind>("all");
  const scope = companyId ?? "";
  const showAll = kind === "all";

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });

  const rolesQ = useQuery({
    queryKey: queryKeys.recruitment.archive("roles", scope),
    queryFn: () => getRequisitions(companyId, { archivedOnly: true }),
    enabled: showAll || kind === "roles",
  });
  const advertsQ = useQuery({
    queryKey: queryKeys.recruitment.archive("adverts", scope),
    queryFn: () => getPostings(companyId, { archivedOnly: true }),
    enabled: showAll || kind === "adverts",
  });
  const appsQ = useQuery({
    queryKey: queryKeys.recruitment.archive("applications", scope),
    queryFn: () => getApplications({ archivedOnly: true }, companyId),
    enabled: showAll || kind === "applications",
  });
  const candidatesQ = useQuery({
    queryKey: queryKeys.recruitment.archive("candidates", scope),
    queryFn: () => getApplicants(undefined, companyId, undefined, { archivedOnly: true }),
    enabled: showAll || kind === "candidates",
  });

  const restoreOne = async (row: Pick<ArchiveRow, "kind" | "entityId">) => {
    if (row.kind === "roles") return restoreRequisition(row.entityId);
    if (row.kind === "adverts") return restorePosting(row.entityId);
    if (row.kind === "applications") return restoreApplication(row.entityId);
    return restoreApplicant(row.entityId);
  };

  const permanentOne = async (row: Pick<ArchiveRow, "kind" | "entityId">) => {
    if (row.kind === "roles") return permanentlyDeleteRequisition(row.entityId);
    if (row.kind === "adverts") return permanentlyDeletePosting(row.entityId);
    if (row.kind === "applications") return permanentlyDeleteApplication(row.entityId);
    return permanentlyDeleteApplicant(row.entityId);
  };

  const restoreMut = useMutation({
    mutationFn: async (rows: ArchiveRow[]) => {
      const results = await Promise.allSettled(rows.map((r) => restoreOne(r)));
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: results.length - failed, failed };
    },
    onSuccess: ({ ok, failed }) => {
      if (failed === 0) toast({ icon: "success", title: ok === 1 ? "Restored" : `${ok} restored` });
      else toast({ icon: "warning", title: `${ok} restored, ${failed} failed` });
      invalidate();
    },
    onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not restore") }),
  });

  const permanentMut = useMutation({
    mutationFn: async (rows: ArchiveRow[]) => {
      const results = await Promise.allSettled(rows.map((r) => permanentOne(r)));
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: results.length - failed, failed };
    },
    onSuccess: ({ ok, failed }) => {
      if (failed === 0) toast({ icon: "success", title: ok === 1 ? "Permanently deleted" : `${ok} permanently deleted` });
      else toast({ icon: "warning", title: `${ok} deleted, ${failed} failed` });
      invalidate();
    },
    onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not delete") }),
  });

  const busy = restoreMut.isPending || permanentMut.isPending;

  const confirmRestore = async (rows: ArchiveRow[]) => {
    if (!rows.length) return;
    const single = rows.length === 1;
    const ok = await confirmDialog({
      icon: "question",
      title: single ? "Restore this item?" : `Restore ${rows.length} items?`,
      text: single
        ? `"${rows[0].title}" will return to the active list.`
        : "Selected items will return to their active lists.",
      confirmText: "Restore",
    });
    if (ok) restoreMut.mutate(rows);
  };

  const confirmPermanent = async (rows: ArchiveRow[]) => {
    if (!rows.length) return;
    const single = rows.length === 1;
    const cascade = single
      ? rows[0].cascadeText
      : "Child records cascade per item type. This cannot be undone.";
    const ok = await confirmDialog({
      icon: "warning",
      danger: true,
      title: single ? "Delete permanently?" : `Delete ${rows.length} items permanently?`,
      text: single
        ? `"${rows[0].title}" will be removed from the database. ${cascade}`
        : `${rows.length} archived items will be removed from the database. ${cascade}`,
      confirmText: "Delete permanently",
    });
    if (ok) permanentMut.mutate(rows);
  };

  const rowActions = (row: ArchiveRow) => {
    if (!canWrite) return null;
    return (
      <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
        <ActionIconButton
          iconName="arrow-circle-left"
          size="sm"
          tone="indigo"
          title="Restore"
          disabled={busy}
          onClick={() => void confirmRestore([row])}
        />
        <ActionIconButton
          iconName="trash"
          size="sm"
          tone="danger"
          title="Delete permanently"
          disabled={busy}
          onClick={() => void confirmPermanent([row])}
        />
      </Stack>
    );
  };

  const columns = useMemo(() => {
    const cols = [
      ...(kind === "all"
        ? [{
            id: "type",
            header: "Type",
            size: 120,
            accessorFn: (r: ArchiveRow) => KIND_LABEL[r.kind],
            Cell: ({ row }: { row: { original: ArchiveRow } }) => KIND_LABEL[row.original.kind],
          }]
        : []),
      {
        id: "title",
        header: "Title",
        accessorFn: (r: ArchiveRow) => r.title,
        Cell: ({ row }: { row: { original: ArchiveRow } }) => row.original.title,
      },
      {
        id: "detail",
        header: kind === "candidates" ? "Contact" : kind === "roles" ? "Ref" : "Detail",
        accessorFn: (r: ArchiveRow) => r.detail,
        Cell: ({ row }: { row: { original: ArchiveRow } }) => row.original.detail,
      },
      dateColumn({ header: "Archived", accessorKey: "updatedAt", fallback: "—" }),
      ...(canWrite
        ? [actionsColumn({ size: 100, Cell: ({ row }: { row: { original: ArchiveRow } }) => rowActions(row.original) })]
        : []),
    ];
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rowActions closes over live mutators
  }, [kind, canWrite, busy]);

  const rows = useMemo((): ArchiveRow[] => {
    if (kind === "all") {
      return [
        ...toRoleRows(rolesQ.data ?? []),
        ...toAdvertRows(advertsQ.data ?? []),
        ...toAppRows(appsQ.data?.items ?? []),
        ...toCandidateRows(candidatesQ.data?.items ?? []),
      ];
    }
    if (kind === "roles") return toRoleRows(rolesQ.data ?? []);
    if (kind === "adverts") return toAdvertRows(advertsQ.data ?? []);
    if (kind === "applications") return toAppRows(appsQ.data?.items ?? []);
    return toCandidateRows(candidatesQ.data?.items ?? []);
  }, [kind, rolesQ.data, advertsQ.data, appsQ.data, candidatesQ.data]);

  const activeQueries = kind === "all"
    ? [rolesQ, advertsQ, appsQ, candidatesQ]
    : kind === "roles" ? [rolesQ]
      : kind === "adverts" ? [advertsQ]
        : kind === "applications" ? [appsQ]
          : [candidatesQ];

  const isLoading = activeQueries.some((q) => q.isLoading);
  const isError = activeQueries.some((q) => q.isError);
  const firstError = activeQueries.find((q) => q.isError)?.error;
  const refetchAll = () => { for (const q of activeQueries) void q.refetch(); };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
      <ListHeader
        title="Archive"
        subtitle="Soft-deleted items. Restore them, or delete permanently (cannot be undone)."
      />

      <Stack spacing={2} sx={{ mt: 2 }}>
        {isError && !isLoading ? (
          <WtEmptyState
            variant="error"
            title="Could not load archive"
            hint={apiErrorMessage(firstError, "Try again")}
            actionLabel="Retry"
            onAction={refetchAll}
          />
        ) : (
          <MaterialTable
            key={`RecruitmentArchive-${kind}`}
            columns={columns as never}
            data={rows as never}
            isLoading={isLoading}
            tableName={`RecruitmentArchive-${kind}`}
            enableRowSelection={canWrite}
            renderSelectionActions={(selected: ArchiveRow[]) => (
              <TableSelectionBar count={selected.length}>
                <WtButton
                  size="small"
                  ghost
                  disabled={busy}
                  onClick={() => void confirmRestore(selected)}
                >
                  Restore selected
                </WtButton>
                <WtButton
                  size="small"
                  tone="danger"
                  disabled={busy}
                  onClick={() => void confirmPermanent(selected)}
                >
                  Delete permanently
                </WtButton>
              </TableSelectionBar>
            )}
          />
        )}

        {!canWrite && (
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
            You need write access to restore or permanently delete archived items.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ArchiveView;
