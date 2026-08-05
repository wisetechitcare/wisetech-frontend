import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { TRIO, WtButton } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { listDocuments, type GeneratedDocument } from "@services/documents";
import {
  BillingPageHeader, BillingTable, BillingStatusBadge, type BillingColumn,
} from "../components";

/**
 * Proformas — every document the engine has issued for the PROFORMA kind.
 *
 * Reads the generic `/api/documents` list with `kind=PROFORMA`. The same page
 * shape works for Tax Invoice and the rest by changing that one constant, which
 * is the point of keeping the kind out of the URL.
 */

const STATUS_FILTER = {
  key: "status",
  label: "Status",
  options: [
    { value: "", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "PUBLISHED", label: "Published" },
    { value: "SENT", label: "Sent" },
    { value: "CANCELLED", label: "Cancelled" },
  ],
};

const ProformasPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({ status: "" });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", "PROFORMA", filters.status],
    queryFn: () => listDocuments({ kind: "PROFORMA", status: (filters.status || undefined) as never }),
  });

  const columns: BillingColumn<GeneratedDocument>[] = [
    {
      key: "documentNumber",
      header: "Proforma No",
      width: 190,
      render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.documentNumber}</Typography>,
      searchValue: (row) => row.documentNumber,
      sortValue: (row) => row.documentNumber,
    },
    {
      key: "issueDate",
      header: "Issued",
      width: 120,
      render: (row) => formatDate(row.issueDate),
      sortValue: (row) => row.issueDate,
    },
    {
      key: "subtotal",
      header: "Taxable",
      width: 130,
      align: "right",
      render: (row) => formatCurrencyDecimal(Number(row.subtotal)),
      sortValue: (row) => Number(row.subtotal),
    },
    {
      key: "taxTotal",
      header: "GST",
      width: 120,
      align: "right",
      render: (row) => formatCurrencyDecimal(Number(row.taxTotal)),
      sortValue: (row) => Number(row.taxTotal),
    },
    {
      key: "grandTotal",
      header: "Total",
      width: 140,
      align: "right",
      render: (row) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
          {formatCurrencyDecimal(Number(row.grandTotal))}
        </Typography>
      ),
      sortValue: (row) => Number(row.grandTotal),
    },
    {
      key: "versionCount",
      header: "Ver.",
      width: 70,
      align: "right",
      render: (row) => `v${row.versionCount}`,
      sortValue: (row) => row.versionCount,
    },
    {
      key: "status",
      header: "Status",
      width: 130,
      render: (row) => <BillingStatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="receipt-square"
        trio={TRIO.cyan}
        title="Proformas"
        description="Pro-forma invoices raised against approved billing requests."
        action={
          <WtButton
            ghost size="small"
            onClick={() => navigate("/billing/accounts")}
            startIcon={<KTIcon iconName="delivery" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Accounts Queue
          </WtButton>
        }
      />

      <BillingTable
        rows={documents}
        columns={columns}
        getRowId={(row) => row.id}
        loading={isLoading}
        onRowClick={(row) => navigate(`/billing/proformas/${row.id}`)}
        searchPlaceholder="Search by proforma number…"
        filters={[STATUS_FILTER]}
        filterValues={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        emptyTitle="No proformas yet"
        emptyDescription="Open an approved request in the Accounts Queue and generate its proforma."
        minWidth={960}
      />
    </Box>
  );
};

export default ProformasPage;
