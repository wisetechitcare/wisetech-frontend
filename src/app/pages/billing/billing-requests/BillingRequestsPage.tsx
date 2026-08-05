import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtIconButton, toast, confirmDialog } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
import {
  listBillingRequests, submitBillingRequest, deleteBillingRequest,
  type BillingRequest,
} from "@services/billingRequest";
import {
  BillingTable, BillingStatusBadge, BillingPageHeader, type BillingColumn,
} from "../components";
import BillingRequestDetailDialog from "../../employee/billing/BillingRequestDetailDialog";
import BillingApprovalStatusDialog from "../../employee/billing/BillingApprovalStatusDialog";

/**
 * Billing Requests — the module-level list across EVERY project.
 *
 * This is the owner of billing-request CRUD. The project's Billing tab is a read-only
 * summary that links here; it does not duplicate this screen.
 *
 * Creating a request needs a project context (a stage, and its completed deliverables),
 * so "New" is raised from the project — this list is where they are then tracked,
 * submitted, inspected and withdrawn.
 */
const BillingRequestsPage: React.FC = () => {
  const qc = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approvalOf, setApprovalOf] = useState<{ instanceId: string; requestNumber: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const queryKey = ["billing-requests", "all"];
  const { data: requests = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listBillingRequests(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey });

  const submit = async (request: BillingRequest) => {
    try {
      await submitBillingRequest(request.id);
      toast({ icon: "success", title: "Submitted for approval" });
    } catch (err: unknown) {
      toast({ icon: "error", title: apiErrorMessage(err, "Could not submit the billing request") });
    }
    refresh();
  };

  const remove = async (request: BillingRequest) => {
    const withApprovers = request.status === "PENDING_APPROVAL" || request.status === "SUBMITTED";
    const confirmed = await confirmDialog({
      icon: "warning",
      danger: true,
      title: withApprovers ? `Withdraw ${request.requestNumber}?` : `Delete ${request.requestNumber}?`,
      text: withApprovers
        ? "It will be removed from the approvers' queues and its deliverables become available to bill again."
        : "Its deliverables become available to bill again.",
      confirmText: withApprovers ? "Withdraw" : "Delete",
    });
    if (!confirmed) return;
    try {
      await deleteBillingRequest(request.id);
      toast({ icon: "success", title: withApprovers ? "Withdrawn" : "Deleted" });
    } catch (err: unknown) {
      toast({ icon: "error", title: apiErrorMessage(err, "Could not delete the billing request") });
    }
    refresh();
  };

  const projectName = (r: BillingRequest) =>
    r.lead?.title || r.lead?.originalProjectPrefix || r.lead?.prefix || "—";
  const clientName = (r: BillingRequest) => r.lead?.company?.companyName || "—";

  const columns: BillingColumn<BillingRequest>[] = [
    {
      key: "number",
      header: "Request No",
      width: 150,
      searchValue: (r) => r.requestNumber,
      render: (r) => <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.requestNumber}</Typography>,
    },
    {
      key: "project",
      header: "Project",
      searchValue: (r) => projectName(r),
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{projectName(r)}</Typography>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{r.stageName}</Typography>
        </Box>
      ),
    },
    {
      key: "client",
      header: "Client",
      width: 170,
      searchValue: (r) => clientName(r),
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{clientName(r)}</Typography>,
    },
    {
      key: "requestedBy",
      header: "Requested By",
      width: 150,
      searchValue: (r) => r.requestedByName,
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{r.requestedByName ?? "—"}</Typography>,
    },
    {
      key: "amount",
      header: "Amount",
      width: 130,
      align: "right",
      render: (r) => (
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          {formatCurrencyDecimal(Number(r.totalAmount) || 0)}
        </Typography>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 160,
      render: (r) => <BillingStatusBadge status={r.status} />,
    },
    {
      key: "created",
      header: "Created",
      width: 110,
      render: (r) => (
        <Typography sx={{ fontSize: 12 }}>{formatDate(r.requestedAt ?? r.createdAt)}</Typography>
      ),
    },
  ];

  const actions = (r: BillingRequest) => {
    const editable = r.status === "DRAFT" || r.status === "REJECTED";
    return (
      <>
        <WtIconButton title="View details" onClick={() => setDetailId(r.id)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
          <KTIcon iconName="eye" className="fs-6" />
        </WtIconButton>
        {r.approvalInstanceId && (
          <WtIconButton
            title="Approval status"
            onClick={() => setApprovalOf({ instanceId: r.approvalInstanceId as string, requestNumber: r.requestNumber })}
            sx={{ width: 30, height: 30, borderRadius: "8px" }}
          >
            <KTIcon iconName="check-circle" className="fs-6" />
          </WtIconButton>
        )}
        {editable && (
          <WtIconButton title="Submit for approval" onClick={() => void submit(r)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <KTIcon iconName="send" className="fs-6" />
          </WtIconButton>
        )}
        {r.canDelete && (
          <WtIconButton title="Delete" color="#C0392B" onClick={() => void remove(r)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <KTIcon iconName="trash" className="fs-6" />
          </WtIconButton>
        )}
      </>
    );
  };

  const visible = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests;
  const total = visible.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="file-added"
        title="Billing Requests"
        description={`${visible.length} request${visible.length === 1 ? "" : "s"} · ${formatCurrencyDecimal(total)}`}
        action={
          <Stack alignItems="flex-end">
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              Raise new requests from a project&apos;s Billing tab
            </Typography>
          </Stack>
        }
      />

      <BillingTable
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        loading={isLoading}
        actions={actions}
        onRowClick={(r) => setDetailId(r.id)}
        searchPlaceholder="Search by request no, project, client or requester…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "DRAFT", label: "Draft" },
              { value: "PENDING_APPROVAL", label: "Pending Approval" },
              { value: "APPROVED", label: "Approved" },
              { value: "SENT_TO_ACCOUNTS", label: "With Accounts" },
              { value: "PROFORMA_GENERATED", label: "Proforma Generated" },
              { value: "REJECTED", label: "Rejected" },
            ],
          },
        ]}
        filterValues={{ status: statusFilter }}
        onFilterChange={(_key, value) => setStatusFilter(value)}
        emptyTitle="No billing requests yet"
        emptyDescription="Complete some billable deliverables on a project, then raise a request from its Billing tab."
      />

      <BillingRequestDetailDialog requestId={detailId} onClose={() => setDetailId(null)} />
      <BillingApprovalStatusDialog
        instanceId={approvalOf?.instanceId ?? null}
        requestNumber={approvalOf?.requestNumber}
        onClose={() => setApprovalOf(null)}
      />
    </Box>
  );
};

export default BillingRequestsPage;
