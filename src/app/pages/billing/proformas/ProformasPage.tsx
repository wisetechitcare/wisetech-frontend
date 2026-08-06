import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, FormControlLabel, MenuItem, Pagination, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { TRIO, WtButton, WtSwitch, toast, confirmDialog } from "@app/modules/common/components/ui";
import {
  listProformas, accessProforma, deleteVersion,
  type ProformaListParams, type ProformaVersion,
} from "@services/proformas";
import {
  BillingPageHeader, BillingLoadingState, BillingEmptyState, ProjectFilterBanner,
} from "../components";
import ProformaTreeRow, { type VersionAction } from "./ProformaTreeRow";

/**
 * The Proforma repository — every proforma ever generated, grouped by revision.
 *
 * IT GENERATES NOTHING. Generation is Accounts Queue → Generate Proforma; this
 * page finds, versions, compares, archives and audits what that produced.
 *
 * Search, filtering and pagination are server-side, and the page counts
 * DOCUMENTS not versions — otherwise one proforma with six revisions swallows a
 * whole page on its own.
 */

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "GENERATED", label: "Generated" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "CLIENT_ACCEPTED", label: "Client Accepted" },
  { value: "CLIENT_REJECTED", label: "Client Rejected" },
  { value: "SUPERSEDED", label: "Superseded" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest first" },
  { value: "documentNumber", label: "Proforma number" },
  { value: "grandTotal", label: "Amount" },
  { value: "versionCount", label: "Revision count" },
];

const PAGE_SIZE = 25;

const ProformasPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "", status: "", sortBy: "createdAt", minVersions: "",
  });
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Drill-down from a project's Financial Workspace arrives pre-filtered. Read it
  // from the URL so the link is shareable and Back/Forward behave.
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;
  const clearProjectFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("projectId");
    setSearchParams(next, { replace: true });
  };

  const params: ProformaListParams = {
    projectId,
    search: filters.search || undefined,
    status: (filters.status || undefined) as ProformaListParams["status"],
    sortBy: filters.sortBy as ProformaListParams["sortBy"],
    minVersions: filters.minVersions ? Number(filters.minVersions) : undefined,
    archived,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["proformas", params],
    queryFn: () => listProformas(params),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["proformas"] });

  const access = useMutation({
    mutationFn: ({ id, intent, versionId }: { id: string; intent: "DOWNLOAD" | "PRINT" | "SHARE"; versionId: string }) =>
      accessProforma(id, intent, versionId),
    onSuccess: async (result, variables) => {
      if (variables.intent === "SHARE") {
        // Clipboard can be blocked (insecure origin, denied permission). Falling
        // back to opening the link is better than a silent no-op.
        try {
          await navigator.clipboard.writeText(result.url);
          toast({ icon: "success", title: "Share link copied — valid for 7 days" });
        } catch {
          window.open(result.url, "_blank", "noopener");
        }
      } else {
        window.open(result.url, "_blank", "noopener");
      }
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not open the document" }),
  });

  const removeVersion = useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) => deleteVersion(id, versionId),
    onSuccess: () => { toast({ icon: "success", title: "Draft version deleted" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not delete the version" }),
  });

  const handleAction = async (id: string, action: VersionAction, version: ProformaVersion) => {
    if (action === "preview") return navigate(`/billing/proformas/${id}?version=${version.id}`);
    if (action === "compare") return navigate(`/billing/proformas/${id}?compare=${version.id}`);
    if (action === "delete") {
      const confirmed = await confirmDialog({
        title: `Delete version ${version.versionNumber}?`,
        text: "Only unpublished drafts can be deleted. This cannot be undone.",
        confirmText: "Delete draft",
        danger: true,
      });
      if (confirmed) removeVersion.mutate({ id, versionId: version.id });
      return;
    }
    access.mutate({
      id,
      versionId: version.id,
      intent: action === "download" ? "DOWNLOAD" : action === "print" ? "PRINT" : "SHARE",
    });
  };

  const proformas = data?.proformas ?? [];
  const pagination = data?.pagination;

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="folder"
        trio={TRIO.cyan}
        title="Proformas"
        description="Every proforma ever generated, grouped by revision. Generated from the Accounts Queue."
        action={
          <WtButton
            ghost size="small"
            onClick={() => navigate("/billing/operations?status=READY_FOR_PROFORMA")}
            startIcon={<KTIcon iconName="inbox" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Accounts Queue
          </WtButton>
        }
      />

      {projectId && (
        <ProjectFilterBanner
          projectName={proformas[0]?.projectName}
          onClear={clearProjectFilter}
          onBackToProject={() => navigate(`/employee/lead/${projectId}?tab=billing`)}
        />
      )}

      {/* Filters. Archived is a switch, not a dropdown option: a repository that
          mixes live and archived rows by default is one nobody trusts the count of. */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ md: "center" }}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="Search proforma or template…"
          value={filters.search}
          onChange={(event) => { setFilters((p) => ({ ...p, search: event.target.value })); setPage(1); }}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{ startAdornment: <KTIcon iconName="magnifier" className="fs-5 me-2" /> }}
        />
        <TextField
          select size="small" label="Status" value={filters.status}
          onChange={(event) => { setFilters((p) => ({ ...p, status: event.target.value })); setPage(1); }}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 170 }}
        >
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>{option.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" label="Sort by" value={filters.sortBy}
          onChange={(event) => { setFilters((p) => ({ ...p, sortBy: event.target.value })); setPage(1); }}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 170 }}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>{option.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small" type="number" label="Min revisions" value={filters.minVersions}
          onChange={(event) => { setFilters((p) => ({ ...p, minVersions: event.target.value })); setPage(1); }}
          InputLabelProps={{ shrink: true }} sx={{ width: 140 }}
        />
        <FormControlLabel
          label={<Typography sx={{ fontSize: 12.5 }}>Archived</Typography>}
          control={
            <WtSwitch
              checked={archived}
              onChange={(_event, next) => { setArchived(next); setPage(1); }}
            />
          }
          sx={{ flexShrink: 0, ml: 0 }}
        />
      </Stack>

      {isLoading ? (
        <BillingLoadingState rows={4} />
      ) : proformas.length === 0 ? (
        <BillingEmptyState
          icon="folder"
          title={archived ? "No archived proformas" : "No proformas yet"}
          description={
            archived
              ? "Archived proformas will appear here."
              : "Open an approved request in the Accounts Queue and generate its proforma."
          }
        />
      ) : (
        <Stack spacing={1}>
          {proformas.map((node) => (
            <ProformaTreeRow
              key={node.id}
              node={node}
              expanded={expanded.has(node.id)}
              onToggle={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                })
              }
              onOpen={() => navigate(`/billing/proformas/${node.id}`)}
              onAction={(action, version) => handleAction(node.id, action, version)}
            />
          ))}
        </Stack>
      )}

      {pagination && pagination.pageCount > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {pagination.total} proformas
          </Typography>
          <Pagination
            size="small"
            count={pagination.pageCount}
            page={pagination.page}
            onChange={(_event, next) => setPage(next)}
          />
        </Stack>
      )}
    </Box>
  );
};

export default ProformasPage;
