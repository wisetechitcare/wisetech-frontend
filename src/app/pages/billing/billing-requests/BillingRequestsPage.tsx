import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton, WtIconButton, toast, confirmDialog } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
import {
  listBillingRequests, submitBillingRequest, deleteBillingRequest,
  cancelBillingRequest, duplicateBillingRequest,
  type BillingRequest,
} from "@services/billingRequest";
import {
  BillingTable, BillingStatusBadge, BillingPageHeader, type BillingColumn,
} from "../components";

/**
 * Billing Requests — the module-level list across EVERY project.
 *
 * This screen OWNS billing-request CRUD. The project's Billing tab is a read-only summary
 * that links in here; it never duplicates this list.
 *
 * Row click opens the detail PAGE (not a dialog) so a request can be linked to from the
 * approval inbox, the accounts queue and the project tab.
 */
const BillingRequestsPage: React.FC = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const queryKey = ["billing-requests", "all"];
  const { data: requests = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listBillingRequests(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey });

  const projectName = (r: BillingRequest) =>
    r.lead?.title || r.lead?.originalProjectPrefix || r.lead?.prefix || "—";
  const clientName = (r: BillingRequest) => r.lead?.company?.companyName || "—";

  // ─── Actions ───────────────────────────────────────────────────────────────

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); refresh(); }
  };

  const submit = (r: BillingRequest) =>
    withBusy(r.id, async () => {
      try {
        await submitBillingRequest(r.id);
        toast({ icon: "success", title: "Submitted for approval" });
      } catch (err: unknown) {
        toast({ icon: "error", title: apiErrorMessage(err, "Could not submit the billing request") });
      }
    });

  /** Cancel keeps the record; delete removes it. Cancel is offered for anything that was
   *  actually raised, because finance wants the trail, not a gap in the numbering. */
  const cancel = async (r: BillingRequest) => {
    const confirmed = await confirmDialog({
      icon: "warning",
      danger: true,
      title: `Cancel ${r.requestNumber}?`,
      text: "The record and its history are kept, and its deliverables become billable again.",
      confirmText: "Cancel Request",
      cancelText: "Keep",
    });
    if (!confirmed) return;
    await withBusy(r.id, async () => {
      try {
        await cancelBillingRequest(r.id);
        toast({ icon: "success", title: "Billing request cancelled" });
      } catch (err: unknown) {
        toast({ icon: "error", title: apiErrorMessage(err, "Could not cancel the billing request") });
      }
    });
  };

  const remove = async (r: BillingRequest) => {
    const confirmed = await confirmDialog({
      icon: "warning",
      danger: true,
      title: `Delete ${r.requestNumber}?`,
      text: "The record is removed entirely. Cancel instead if you want to keep the trail.",
      confirmText: "Delete",
    });
    if (!confirmed) return;
    await withBusy(r.id, async () => {
      try {
        await deleteBillingRequest(r.id);
        toast({ icon: "success", title: "Billing request deleted" });
      } catch (err: unknown) {
        toast({ icon: "error", title: apiErrorMessage(err, "Could not delete the billing request") });
      }
    });
  };

  const duplicate = async (r: BillingRequest) => {
    setBusyId(r.id);
    try {
      const { billingRequest, skipped } = await duplicateBillingRequest(r.id);
      toast({
        icon: skipped ? "warning" : "success",
        title: `Created ${billingRequest.requestNumber}`,
        // Deliverables billed elsewhere since are dropped rather than silently duplicated.
        text: skipped ? `${skipped} deliverable(s) skipped — already billed.` : undefined,
      });
      navigate(`/billing/requests/${billingRequest.id}`);
    } catch (err: unknown) {
      toast({ icon: "error", title: apiErrorMessage(err, "Could not duplicate the billing request") });
    } finally {
      setBusyId(null);
      refresh();
    }
  };

  // ─── Table ─────────────────────────────────────────────────────────────────

  const columns: BillingColumn<BillingRequest>[] = [
    {
      key: "number",
      header: "Request No",
      width: 145,
      searchValue: (r) => r.requestNumber,
      sortValue: (r) => r.requestNumber,
      render: (r) => <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.requestNumber}</Typography>,
    },
    {
      key: "project",
      header: "Project",
      searchValue: (r) => projectName(r),
      sortValue: (r) => projectName(r),
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{projectName(r)}</Typography>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
            {r.stageName ?? `${new Set(r.items.map((i) => i.stageName)).size} stages`}
          </Typography>
        </Box>
      ),
    },
    {
      key: "client",
      header: "Client",
      width: 160,
      searchValue: (r) => clientName(r),
      sortValue: (r) => clientName(r),
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{clientName(r)}</Typography>,
    },
    {
      key: "requestedBy",
      header: "Requested By",
      width: 140,
      searchValue: (r) => r.requestedByName,
      sortValue: (r) => r.requestedAt ?? r.createdAt,
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5 }}>{r.requestedByName ?? "—"}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
            {formatDate(r.requestedAt ?? r.createdAt)}
          </Typography>
        </Box>
      ),
    },
    {
      key: "deliverables",
      header: "Items",
      width: 70,
      align: "right",
      sortValue: (r) => r.items.length,
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{r.items.length}</Typography>,
    },
    {
      key: "percentage",
      header: "%",
      width: 70,
      align: "right",
      sortValue: (r) => Number(r.totalPercentage) || 0,
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{Number(r.totalPercentage) || 0}%</Typography>,
    },
    {
      key: "amount",
      header: "Amount",
      width: 130,
      align: "right",
      sortValue: (r) => Number(r.totalAmount) || 0,
      render: (r) => (
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          {formatCurrencyDecimal(Number(r.totalAmount) || 0)}
        </Typography>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 155,
      sortValue: (r) => r.status,
      render: (r) => <BillingStatusBadge status={r.status} />,
    },
  ];

  const actions = (r: BillingRequest) => {
    const editable = r.status === "DRAFT" || r.status === "REJECTED";
    const busy = busyId === r.id;
    return (
      <>
        <WtIconButton title="View" onClick={() => navigate(`/billing/requests/${r.id}`)} sx={{ width: 28, height: 28, borderRadius: "8px" }}>
          <KTIcon iconName="eye" className="fs-6" />
        </WtIconButton>
        {editable && (
          <>
            <WtIconButton title="Edit" onClick={() => navigate(`/billing/requests/${r.id}/edit`)} sx={{ width: 28, height: 28, borderRadius: "8px" }}>
              <KTIcon iconName="pencil" className="fs-6" />
            </WtIconButton>
            <WtIconButton title="Submit for approval" onClick={() => void submit(r)} sx={{ width: 28, height: 28, borderRadius: "8px" }}>
              <KTIcon iconName="send" className="fs-6" />
            </WtIconButton>
          </>
        )}
        <WtIconButton title="Duplicate" onClick={() => void duplicate(r)} sx={{ width: 28, height: 28, borderRadius: "8px" }}>
          <KTIcon iconName="copy" className="fs-6" />
        </WtIconButton>
        {/* canDelete is server-computed: true only while no approver has acted. */}
        {r.canDelete && r.status !== "CANCELLED" && (
          <WtIconButton title="Cancel" color="#B7791F" onClick={() => void cancel(r)} sx={{ width: 28, height: 28, borderRadius: "8px" }} disabled={busy}>
            <KTIcon iconName="cross-circle" className="fs-6" />
          </WtIconButton>
        )}
        {r.canDelete && r.status === "DRAFT" && (
          <WtIconButton title="Delete" color="#C0392B" onClick={() => void remove(r)} sx={{ width: 28, height: 28, borderRadius: "8px" }} disabled={busy}>
            <KTIcon iconName="trash" className="fs-6" />
          </WtIconButton>
        )}
      </>
    );
  };

  // Dropdown filters are applied here; free-text search lives inside BillingTable.
  const visible = useMemo(
    () =>
      requests.filter((r) => {
        if (filters.status && r.status !== filters.status) return false;
        if (filters.project && r.leadId !== filters.project) return false;
        if (filters.requestedBy && r.requestedById !== filters.requestedBy) return false;
        return true;
      }),
    [requests, filters],
  );

  /** Options built from the rows on screen, so a filter can never select into nothing. */
  const uniqueOptions = (pick: (r: BillingRequest) => { value: string; label: string } | null) => {
    const map = new Map<string, string>();
    for (const r of requests) {
      const opt = pick(r);
      if (opt?.value && !map.has(opt.value)) map.set(opt.value, opt.label);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  };

  const total = visible.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="file-added"
        title="Billing Requests"
        description={`${visible.length} request${visible.length === 1 ? "" : "s"} · ${formatCurrencyDecimal(total)}`}
        action={
          <WtButton
            tone="primary"
            size="small"
            onClick={() => navigate("/billing/requests/new")}
            startIcon={<KTIcon iconName="plus" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            New Request
          </WtButton>
        }
      />

      <BillingTable
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        loading={isLoading}
        actions={actions}
        onRowClick={(r) => navigate(`/billing/requests/${r.id}`)}
        searchPlaceholder="Search by request no, project, client or requester…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "DRAFT", label: "Draft" },
              { value: "PENDING_APPROVAL", label: "Pending Approval" },
              { value: "APPROVED", label: "Approved" },
              { value: "READY_FOR_PROFORMA", label: "Ready For Proforma" },
              { value: "PROFORMA_GENERATED", label: "Proforma Generated" },
              { value: "REJECTED", label: "Rejected" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
          {
            key: "project",
            label: "Project",
            options: uniqueOptions((r) => (r.leadId ? { value: r.leadId, label: projectName(r) } : null)),
          },
          {
            key: "requestedBy",
            label: "Requested By",
            options: uniqueOptions((r) =>
              r.requestedById ? { value: r.requestedById, label: r.requestedByName ?? "—" } : null,
            ),
          },
        ]}
        filterValues={filters}
        onFilterChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        emptyTitle="No billing requests yet"
        emptyDescription="Raise one against a project's completed, billable deliverables."
      />
    </Box>
  );
};

export default BillingRequestsPage;
