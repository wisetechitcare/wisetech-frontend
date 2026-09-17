import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, MenuItem, Pagination, Stack, TextField, Typography, TableContainer,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Menu,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { TRIO, WtButton, toast } from "@app/modules/common/components/ui";
import {
  listInvoices, accessInvoice, downloadInvoiceWord,
  type ProformaListParams, type ProformaNode,
} from "@services/taxInvoices";
import {
  BillingPageHeader, BillingLoadingState, BillingEmptyState, BillingStatusBadge, ProjectFilterBanner,
} from "../components";
import { formatDate } from "@utils/dateFormats";
import { formatCurrencyDecimal } from "@utils/currency";

/**
 * The Tax Invoice repository — every invoice generated after verified payment.
 *
 * IT GENERATES NOTHING. Generation is Payment Collection → Verify → Generate Invoice;
 * this page finds, archives and audits what that produced.
 *
 * Invoices are read-only records. No revision/editing allowed.
 */

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "GENERATED", label: "Generated" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "CLIENT_ACCEPTED", label: "Client Accepted" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest first" },
  { value: "documentNumber", label: "Invoice number" },
  { value: "grandTotal", label: "Amount" },
];

const PAGE_SIZE = 25;

const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", status: "", sortBy: "createdAt" });
  const [page, setPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
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
    archived: false,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["taxInvoices", params],
    queryFn: () => listInvoices(params),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["taxInvoices"] });

  const access = useMutation({
    mutationFn: ({ id, intent }: { id: string; intent: "DOWNLOAD" | "PRINT" | "SHARE" }) =>
      accessInvoice(id, intent),
    onSuccess: async (result, variables) => {
      if (variables.intent === "SHARE") {
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
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not access the document" }),
  });

  const downloadWord = useMutation({
    mutationFn: ({ id }: { id: string }) => downloadInvoiceWord(id),
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not download the document" }),
  });

  const invoices = data?.invoices ?? [];
  const pagination = data?.pagination;

  const handleMenuOpen = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl((p) => ({ ...p, [id]: event.currentTarget }));
  };

  const handleMenuClose = (id: string) => {
    setAnchorEl((p) => ({ ...p, [id]: null }));
  };

  const handleAction = (id: string, action: string, invoice: ProformaNode) => {
    handleMenuClose(id);
    if (action === "preview") return navigate(`/billing/proformas/${id}`);
    if (action === "download-word") return downloadWord.mutate({ id });
    if (action === "download-pdf") return access.mutate({ id, intent: "DOWNLOAD" });
    if (action === "print") return access.mutate({ id, intent: "PRINT" });
    if (action === "share") return access.mutate({ id, intent: "SHARE" });
    // The project entity lives at /employee/lead/:leadId; land on its Billing tab.
    if (action === "open-project" && invoice.leadId) {
      return navigate(`/employee/lead/${invoice.leadId}?tab=billing`);
    }
  };

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="receipt-square"
        trio={TRIO.purple}
        title="Tax Invoices"
        description="GST tax invoices issued after payment verification. Read-only records."
        action={
          <WtButton
            ghost size="small"
            onClick={() => navigate("/billing/payments")}
            startIcon={<KTIcon iconName="credit-cart" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Payment Collection
          </WtButton>
        }
      />

      {projectId && (
        <ProjectFilterBanner
          projectName={invoices[0]?.projectName}
          onClear={clearProjectFilter}
          onBackToProject={() => navigate(`/employee/lead/${projectId}?tab=billing`)}
        />
      )}

      {/* Filters */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ md: "center" }}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="Search invoice or project…"
          value={filters.search}
          onChange={(event) => {
            setFilters((p) => ({ ...p, search: event.target.value }));
            setPage(1);
          }}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{ startAdornment: <KTIcon iconName="magnifier" className="fs-5 me-2" /> }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={filters.status}
          onChange={(event) => {
            setFilters((p) => ({ ...p, status: event.target.value }));
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        >
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Sort by"
          value={filters.sortBy}
          onChange={(event) => {
            setFilters((p) => ({ ...p, sortBy: event.target.value }));
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? (
        <BillingLoadingState rows={4} />
      ) : invoices.length === 0 ? (
        <BillingEmptyState
          icon="receipt-square"
          title="No tax invoices yet"
          description="Invoices are generated automatically after payment verification. Record and verify a payment to generate its invoice."
          actionLabel="Go to Payments"
          onAction={() => navigate("/billing/payments")}
        />
      ) : (
        <TableContainer sx={{ borderRadius: "8px", border: "1px solid", borderColor: "divider", overflowX: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Client</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12 }}>
                  Taxable
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12 }}>
                  GST
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12 }}>
                  Total
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Issued</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: 12, width: 40 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  hover
                  onClick={() => navigate(`/billing/proformas/${invoice.id}`)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{invoice.documentNumber}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{invoice.projectName || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{invoice.clientName || "—"}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>
                    {formatCurrencyDecimal(invoice.subtotal as number)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>
                    {formatCurrencyDecimal(invoice.taxTotal as number)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, fontWeight: 500 }}>
                    {formatCurrencyDecimal(invoice.grandTotal as number)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    <BillingStatusBadge status={invoice.currentStatus || ""} />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(invoice.id, e);
                      }}
                    >
                      <KTIcon iconName="dots-vertical" className="fs-6" />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl[invoice.id]}
                      open={Boolean(anchorEl[invoice.id])}
                      onClose={() => handleMenuClose(invoice.id)}
                      slotProps={{ paper: { sx: { width: 200 } } }}
                    >
                      {[
                        { label: "Preview", icon: "eye", action: "preview" },
                        { label: "Download PDF", icon: "download-1", action: "download-pdf" },
                        { label: "Download Word", icon: "download-1", action: "download-word" },
                        { label: "Print", icon: "printer", action: "print" },
                        { label: "Share", icon: "share-1", action: "share" },
                        { label: "Open Project", icon: "arrow-right", action: "open-project" },
                      ].map((item) => (
                        <MenuItem
                          key={item.action}
                          onClick={() => handleAction(invoice.id, item.action, invoice)}
                          dense
                          sx={{ fontSize: 12 }}
                        >
                          <KTIcon iconName={item.icon} className="fs-6 me-2" /> {item.label}
                        </MenuItem>
                      ))}
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {pagination && pagination.pageCount > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {pagination.total} invoices
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

export default InvoicesPage;
