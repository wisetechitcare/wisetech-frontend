import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import {
  ActionIconButton, ListHeader, SegmentedControl, WtEmptyState,
  confirmDialog, toast,
} from "@app/modules/common/components/ui";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
import { formatDate } from "@utils/dateFormats";
import {
  getRequisitions, restoreRequisition, permanentlyDeleteRequisition,
  getPostings, restorePosting, permanentlyDeletePosting,
  getApplications, restoreApplication, permanentlyDeleteApplication,
  getApplicants, restoreApplicant, permanentlyDeleteApplicant,
  type JobRequisition, type JobPosting, type Application, type Applicant, type OrgScoped,
} from "@services/recruitment";
import { TERMS } from "./terms";

type ArchiveKind = "roles" | "adverts" | "applications" | "candidates";

const KIND_OPTIONS: ReadonlyArray<{ value: ArchiveKind; label: string }> = [
  { value: "roles", label: TERMS.Requisitions },
  { value: "adverts", label: TERMS.Postings },
  { value: "applications", label: "Applications" },
  { value: "candidates", label: TERMS.Candidates },
];

function candidateName(a: Applicant) {
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || a.phone || "Candidate";
}

/**
 * Soft-deleted Roles / Adverts / Applications / Candidates.
 * Restore brings them back; Delete permanently cascades children (confirm always).
 */
const ArchiveView = ({ companyId }: OrgScoped) => {
  const canWrite = canSection("recruitment", "write");
  const qc = useQueryClient();
  const [kind, setKind] = useState<ArchiveKind>("roles");
  const scope = companyId ?? "";

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });

  const rolesQ = useQuery({
    queryKey: queryKeys.recruitment.archive("roles", scope),
    queryFn: () => getRequisitions(companyId, { archivedOnly: true }),
    enabled: kind === "roles",
  });
  const advertsQ = useQuery({
    queryKey: queryKeys.recruitment.archive("adverts", scope),
    queryFn: () => getPostings(companyId, { archivedOnly: true }),
    enabled: kind === "adverts",
  });
  const appsQ = useQuery({
    queryKey: queryKeys.recruitment.archive("applications", scope),
    queryFn: () => getApplications({ archivedOnly: true }, companyId),
    enabled: kind === "applications",
  });
  const candidatesQ = useQuery({
    queryKey: queryKeys.recruitment.archive("candidates", scope),
    queryFn: () => getApplicants(undefined, companyId, undefined, { archivedOnly: true }),
    enabled: kind === "candidates",
  });

  const restoreMut = useMutation({
    mutationFn: async (row: { kind: ArchiveKind; id: string }) => {
      if (row.kind === "roles") return restoreRequisition(row.id);
      if (row.kind === "adverts") return restorePosting(row.id);
      if (row.kind === "applications") return restoreApplication(row.id);
      return restoreApplicant(row.id);
    },
    onSuccess: () => { toast({ icon: "success", title: "Restored" }); invalidate(); },
    onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not restore") }),
  });

  const permanentMut = useMutation({
    mutationFn: async (row: { kind: ArchiveKind; id: string }) => {
      if (row.kind === "roles") return permanentlyDeleteRequisition(row.id);
      if (row.kind === "adverts") return permanentlyDeletePosting(row.id);
      if (row.kind === "applications") return permanentlyDeleteApplication(row.id);
      return permanentlyDeleteApplicant(row.id);
    },
    onSuccess: () => { toast({ icon: "success", title: "Permanently deleted" }); invalidate(); },
    onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not delete") }),
  });

  const confirmRestore = async (label: string, id: string) => {
    const ok = await confirmDialog({
      icon: "question",
      title: "Restore this item?",
      text: `"${label}" will return to the active list.`,
      confirmText: "Restore",
    });
    if (ok) restoreMut.mutate({ kind, id });
  };

  const confirmPermanent = async (label: string, id: string, cascadeText: string) => {
    const ok = await confirmDialog({
      icon: "warning",
      danger: true,
      title: "Delete permanently?",
      text: `"${label}" will be removed from the database. ${cascadeText} This cannot be undone.`,
      confirmText: "Delete permanently",
    });
    if (ok) permanentMut.mutate({ kind, id });
  };

  const busy = restoreMut.isPending || permanentMut.isPending;

  const actions = (label: string, id: string, cascadeText: string) => {
    if (!canWrite) return null;
    return (
      <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
        <ActionIconButton
          iconName="arrow-circle-left"
          size="sm"
          tone="indigo"
          title="Restore"
          disabled={busy}
          onClick={() => confirmRestore(label, id)}
        />
        <ActionIconButton
          iconName="trash"
          size="sm"
          tone="danger"
          title="Delete permanently"
          disabled={busy}
          onClick={() => confirmPermanent(label, id, cascadeText)}
        />
      </Stack>
    );
  };

  const roleCols = useMemo(() => [
    { header: "Title", accessorKey: "title", Cell: ({ row }: { row: { original: JobRequisition } }) => row.original.title },
    { header: "Archived", accessorKey: "updatedAt", Cell: ({ row }: { row: { original: JobRequisition } }) => formatDate(row.original.updatedAt) },
    {
      header: "",
      id: "actions",
      size: 100,
      Cell: ({ row }: { row: { original: JobRequisition } }) =>
        actions(
          row.original.title,
          row.original.id,
          "All applications, interviews, offers, and job adverts on this role will be deleted too.",
        ),
    },
  ], [canWrite, busy, kind]);

  const advertCols = useMemo(() => [
    { header: "Title", accessorKey: "title", Cell: ({ row }: { row: { original: JobPosting } }) => row.original.title },
    {
      header: "Role",
      id: "role",
      Cell: ({ row }: { row: { original: JobPosting } }) => row.original.requisition?.title ?? "—",
    },
    {
      header: "",
      id: "actions",
      size: 100,
      Cell: ({ row }: { row: { original: JobPosting } }) =>
        actions(row.original.title, row.original.id, "Applications keep their candidate; only this advert is removed."),
    },
  ], [canWrite, busy, kind]);

  const appCols = useMemo(() => [
    {
      header: "Candidate",
      id: "candidate",
      Cell: ({ row }: { row: { original: Application } }) => {
        const a = row.original.applicant;
        return a ? [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "—" : "—";
      },
    },
    {
      header: "Role",
      id: "role",
      Cell: ({ row }: { row: { original: Application } }) => row.original.requisition?.title ?? "—",
    },
    {
      header: "",
      id: "actions",
      size: 100,
      Cell: ({ row }: { row: { original: Application } }) => {
        const a = row.original.applicant;
        const label = a ? [a.firstName, a.lastName].filter(Boolean).join(" ") || "Application" : "Application";
        return actions(label, row.original.id, "Interviews, offers, notes, and stage history for this application will be deleted. The candidate record stays.");
      },
    },
  ], [canWrite, busy, kind]);

  const candidateCols = useMemo(() => [
    {
      header: "Name",
      id: "name",
      Cell: ({ row }: { row: { original: Applicant } }) => candidateName(row.original),
    },
    { header: "Email", accessorKey: "email", Cell: ({ row }: { row: { original: Applicant } }) => row.original.email || "—" },
    {
      header: "",
      id: "actions",
      size: 100,
      Cell: ({ row }: { row: { original: Applicant } }) =>
        actions(
          candidateName(row.original),
          row.original.id,
          "All of their applications, interviews, and offers will be deleted too.",
        ),
    },
  ], [canWrite, busy, kind]);

  const activeQ =
    kind === "roles" ? rolesQ
      : kind === "adverts" ? advertsQ
        : kind === "applications" ? appsQ
          : candidatesQ;

  const rows =
    kind === "roles" ? (rolesQ.data ?? [])
      : kind === "adverts" ? (advertsQ.data ?? [])
        : kind === "applications" ? (appsQ.data?.items ?? [])
          : (candidatesQ.data?.items ?? []);

  const columns =
    kind === "roles" ? roleCols
      : kind === "adverts" ? advertCols
        : kind === "applications" ? appCols
          : candidateCols;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
      <ListHeader
        title="Archive"
        subtitle="Soft-deleted items. Restore them, or delete permanently (cannot be undone)."
      />

      <Stack spacing={2} sx={{ mt: 2 }}>
        <SegmentedControl
          ariaLabel="Archive category"
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
        />

        {activeQ.isLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
        ) : activeQ.isError ? (
          <WtEmptyState
            variant="error"
            title="Could not load archive"
            hint={apiErrorMessage(activeQ.error, "Try again")}
            actionLabel="Retry"
            onAction={() => activeQ.refetch()}
          />
        ) : rows.length === 0 ? (
          <WtEmptyState
            dense
            icon="archive"
            title="Nothing archived"
            hint="When you archive a role, advert, application, or candidate, it appears here."
          />
        ) : (
          <MaterialTable
            columns={columns as never}
            data={rows as never}
            isLoading={activeQ.isLoading}
            tableName={`RecruitmentArchive-${kind}`}
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
