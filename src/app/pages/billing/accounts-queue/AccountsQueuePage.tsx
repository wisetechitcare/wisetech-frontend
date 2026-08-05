import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton, WtIconButton, TRIO, toast } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
  getAccountsBillingQueue, getAccountsQueueStatistics, type AccountsQueueRow,
} from "@services/billingRequest";
import {
  BillingTable, BillingStatusBadge, BillingPageHeader, BillingStatsCard,
  type BillingColumn,
} from "../components";

/**
 * Accounts → Billing Queue.
 *
 * A WORK QUEUE for the Accounts department, not another billing-request list. Rows are
 * filtered SERVER-SIDE to approved-and-not-yet-converted, so rejected, cancelled and
 * already-converted requests can never appear here regardless of what the client asks.
 *
 * Accounts cannot edit anything from this screen — no project, deliverable or request
 * field is writable. The only forward action is Generate Proforma, which is deliberately
 * DISABLED until that module ships.
 */
const AccountsQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["accounts", "billing-queue"],
    queryFn: () => getAccountsBillingQueue(),
  });

  const { data: stats } = useQuery({
    queryKey: ["accounts", "billing-queue", "statistics"],
    queryFn: getAccountsQueueStatistics,
  });

  const projectName = (r: AccountsQueueRow) =>
    r.lead?.title || r.lead?.originalProjectPrefix || r.lead?.prefix || "—";
  const clientName = (r: AccountsQueueRow) => r.lead?.company?.companyName || "—";

  const columns: BillingColumn<AccountsQueueRow>[] = [
    {
      key: "number",
      header: "Request No",
      width: 140,
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
      width: 155,
      searchValue: (r) => clientName(r),
      sortValue: (r) => clientName(r),
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{clientName(r)}</Typography>,
    },
    {
      key: "requestedBy",
      header: "Requested By",
      width: 135,
      searchValue: (r) => r.requestedByName,
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{r.requestedByName ?? "—"}</Typography>,
    },
    {
      key: "approvedBy",
      header: "Approved By",
      width: 145,
      searchValue: (r) => r.approvedByName,
      // Oldest approval first is the queue default — sorting here reorders by wait time.
      sortValue: (r) => r.approvedAt,
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          {/* Read from the approval framework's own steps — billing keeps no parallel
              record of who approved what. */}
          <Typography sx={{ fontSize: 12.5 }}>{r.approvedByName ?? "—"}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>{formatDate(r.approvedAt)}</Typography>
        </Box>
      ),
    },
    {
      key: "items",
      header: "Items",
      width: 62,
      align: "right",
      sortValue: (r) => r.items.length,
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{r.items.length}</Typography>,
    },
    {
      key: "percentage",
      header: "%",
      width: 62,
      align: "right",
      sortValue: (r) => Number(r.totalPercentage) || 0,
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{Number(r.totalPercentage) || 0}%</Typography>,
    },
    {
      key: "amount",
      header: "Amount",
      width: 135,
      align: "right",
      sortValue: (r) => Number(r.totalAmount) || 0,
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
          {formatCurrencyDecimal(Number(r.totalAmount) || 0)}
        </Typography>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 150,
      render: (r) => <BillingStatusBadge status={r.status} />,
    },
  ];

  const actions = (r: AccountsQueueRow) => (
    <>
      <WtIconButton
        title="Review"
        onClick={() => navigate(`/billing/accounts/${r.id}`)}
        sx={{ width: 30, height: 30, borderRadius: "8px" }}
      >
        <KTIcon iconName="eye" className="fs-6" />
      </WtIconButton>
      {/* Placeholder until the Proforma module ships — disabled rather than hidden so the
          queue's finished shape is visible, and it cannot be clicked by accident. */}
      <WtButton
        tone="primary"
        size="small"
        disabled
        title="Proforma generation arrives in the next phase"
        onClick={() => toast({ icon: "info", title: "Proforma generation is not implemented yet" })}
        sx={{ minHeight: 30, borderRadius: "8px", fontSize: 11.5, px: 1, whiteSpace: "nowrap" }}
      >
        Proforma
      </WtButton>
    </>
  );

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (filters.project && r.leadId !== filters.project) return false;
        if (filters.client && (r.lead?.company?.id ?? "") !== filters.client) return false;
        if (filters.requestedBy && r.requestedById !== filters.requestedBy) return false;
        if (filters.approvedBy && (r.approvedByName ?? "") !== filters.approvedBy) return false;
        return true;
      }),
    [rows, filters],
  );

  /** Options built from the rows on screen, so a filter can never select into nothing. */
  const uniqueOptions = (pick: (r: AccountsQueueRow) => { value: string; label: string } | null) => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const opt = pick(r);
      if (opt?.value && !map.has(opt.value)) map.set(opt.value, opt.label);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  };

  const visibleTotal = visible.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="delivery"
        trio={TRIO.cyan}
        title="Accounts Queue"
        description="Approved billing requests awaiting proforma. Review only — nothing here is editable."
      />

      <Box
        sx={{
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          mb: 2,
        }}
      >
        <BillingStatsCard
          label="Awaiting Proforma" icon="delivery" trio={TRIO.cyan}
          value={stats?.pendingCount ?? visible.length} loading={isLoading}
          hint="Approved, not yet converted"
        />
        <BillingStatsCard
          label="Queue Value" icon="dollar" trio={TRIO.green}
          value={formatCurrencyDecimal(stats?.pendingAmount ?? visibleTotal)} loading={isLoading}
        />
        <BillingStatsCard
          label="Longest Waiting" icon="time"
          trio={(stats?.oldestWaitingDays ?? 0) > 7 ? TRIO.rose : TRIO.amber}
          value={stats?.oldestWaitingDays != null ? `${stats.oldestWaitingDays}d` : "—"}
          hint={stats?.oldestRequestNumber ?? "Nothing waiting"}
          loading={isLoading}
        />
        <BillingStatsCard
          label="Converted" icon="check-circle" trio={TRIO.purple}
          value={stats?.convertedCount ?? 0} loading={isLoading}
          hint="Proforma already generated"
        />
      </Box>

      <BillingTable
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        loading={isLoading}
        actions={actions}
        onRowClick={(r) => navigate(`/billing/accounts/${r.id}`)}
        searchPlaceholder="Search by request no, project or client…"
        filters={[
          {
            key: "project",
            label: "Project",
            options: uniqueOptions((r) => (r.leadId ? { value: r.leadId, label: projectName(r) } : null)),
          },
          {
            key: "client",
            label: "Client",
            options: uniqueOptions((r) =>
              r.lead?.company?.id ? { value: r.lead.company.id, label: clientName(r) } : null,
            ),
          },
          {
            key: "requestedBy",
            label: "Requested By",
            options: uniqueOptions((r) =>
              r.requestedById ? { value: r.requestedById, label: r.requestedByName ?? "—" } : null,
            ),
          },
          {
            key: "approvedBy",
            label: "Approved By",
            options: uniqueOptions((r) =>
              r.approvedByName ? { value: r.approvedByName, label: r.approvedByName } : null,
            ),
          },
        ]}
        filterValues={filters}
        onFilterChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        emptyTitle="Nothing awaiting a proforma"
        emptyDescription="Billing requests appear here automatically once they clear approval."
      />
    </Box>
  );
};

export default AccountsQueuePage;
