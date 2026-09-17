import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import dayjs from "dayjs";
import {listProjectOverview,type ProjectOverviewRow, type ProjectOverviewParams, type ProjectOverviewSort,
} from "@services/billingOperations";
import {  useBillingLabels, BILLING_LABEL_GROUP } from "../components";
import { TrackerStatusCell, TrackerStageCell, TrackerBillPaymentCell } from "./TrackerCells";

/**
 * Billing Operations — the Accounts team's workspace, at PROJECT grain.
 *
 * One row per project, not per billing request. That distinction is the point:
 * a project carrying a signed PO that nobody has raised a bill against has no
 * billing operation at all, so it is invisible on the operation-grain list —
 * and it is exactly the row Accounts needs to chase. Here it appears with its
 * full PO value sitting in Pending.
 *
 * Runs on `MaterialTable`, the same engine and layout as Leads & Projects, so
 * column show/hide, per-user column preferences, export and the search dropdown
 * all come for free rather than being rebuilt here.
 *
 * Search, sorting and pagination are all SERVER-side (`manualFiltering` /
 * `manualSorting` / `manualPagination`). The money columns are cross-table
 * aggregates: sorting them in the browser would reorder one page while implying
 * the whole list was ranked, on the one screen where "how much is still owed"
 * has to be right.
 */

const DASH = "—";

/** Only these can be ordered in SQL; a header click on anything else is ignored. */
const SERVER_SORTABLE: ProjectOverviewSort[] = [
  "projectNumber", "projectName", "poValue", "receivedAmount",
  "pendingAmount", "lastPaymentAt", "nextFollowUpDate",
];

/**
 * What the three workflow columns mean, on the column header.
 *
 * They were the part of this sheet nobody could read off the screen: three chips
 * per row, each with a real source and a hand-set fallback. Saying so in a tooltip
 * is cheaper than a legend, and it sits where the question gets asked. The naming
 * matches Billing → Configure's three groups exactly — Payment Stage, Billing
 * Status, Bill Payment Status — because that is where they are renamed.
 */
const STAGE_HINT =
  "Configure → Payment Stage. Which of the four bands this project's billing is in. " +
  "Normally it follows the Status; set one here to override that, or clear it to follow again.";

const STATUS_HINT =
  "Configure → Billing Status. Where the billing stands. A project billed through an approved " +
  "request offers only the moves its workflow allows; one that isn't billed yet can be set to " +
  "anything, and the real status takes over later.";

const BILL_PAYMENT_HINT =
  "Configure → Bill Payment Status. How much of the issued bill has been collected. Counted " +
  "from real payments once a bill exists; until then it can be set here.";

/** Column header with a tooltip. `Header` overrides the plain string in MaterialTable. */
const HintHeader: React.FC<{ title: string; hint: string }> = ({ title, hint }) => (
  <Tooltip title={hint} placement="top">
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ cursor: "help" }}>
      <span>{title}</span>
      <KTIcon iconName="information-2" className="fs-8 text-muted" />
    </Stack>
  </Tooltip>
);

const Money: React.FC<{ value: number | null | undefined; bold?: boolean; tone?: string }> = ({
  value, bold, tone,
}) => (
  <Typography sx={{ fontSize: "inherit", fontWeight: bold ? 700 : 500, color: tone ?? "inherit" }}>
    {value === null || value === undefined ? DASH : formatCurrencyDecimal(value)}
  </Typography>
);

const DateCell: React.FC<{ value: string | null | undefined }> = ({ value }) => (
  <span>{value ? formatDate(value) : DASH}</span>
);

const BillingOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const labels = useBillingLabels();

  const [filters, setFilters] = useState({
    status: "", stage: "", billPaymentStatus: "", projectManagerId: "",
  });
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([
    // Newest project first.
    { id: "projectNumber", desc: true },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  useEffect(() => {
    const urlStatus = searchParams.get("status") || "";
    const urlStage = searchParams.get("stage") || "";
    if (urlStatus || urlStage) {
      setFilters((prev) => ({ ...prev, status: urlStatus, stage: urlStage }));
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [searchParams]);

  const active = sorting[0];
  const sortBy = SERVER_SORTABLE.includes(active?.id as ProjectOverviewSort)
    ? (active.id as ProjectOverviewSort)
    : "projectNumber";

  const params: ProjectOverviewParams = {
    search: search || undefined,
    status: (filters.status || undefined) as ProjectOverviewParams["status"],
    stage: (filters.stage || undefined) as ProjectOverviewParams["stage"],
    billPaymentStatus: filters.billPaymentStatus || undefined,
    projectManagerId: filters.projectManagerId || undefined,
    sortBy,
    sortDir: active?.desc ? "desc" : "asc",
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["billing-project-overview", params],
    queryFn: () => listProjectOverview(params),
    // Keeps the Manager options on screen while the next filter's page loads.
    placeholderData: keepPreviousData,
  });

  const projects = data?.projects ?? [];
  const total = data?.pagination?.total ?? 0;

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Both dropdowns are the Configure catalogue, not a second hand-typed copy of
  // it: rename a status there and the filter that selects it renames with it.
  const statusOptions = [
    { value: "", label: "All statuses" },
    ...labels.options(BILLING_LABEL_GROUP.STATUS),
  ];
  const stageOptions = [
    { value: "", label: "All stages" },
    ...labels.options(BILLING_LABEL_GROUP.STAGE),
  ];
  const billPaymentOptions = [
    { value: "", label: "All bill payments" },
    ...labels.options(BILLING_LABEL_GROUP.BILL_PAYMENT),
  ];
  // Only people who manage a project, from the server — the same person the Handled By
  // column shows. A full employee list offered names that could only ever return nothing.
  const managerOptions = [
    { value: "", label: "All managers" },
    ...(data?.managers ?? []).map((m) => ({ value: m.id, label: m.name })),
  ];

  const filterSelects: Array<{ key: keyof typeof filters; label: string; width: number; options: { value: string; label: string }[] }> = [
    { key: "stage", label: "Bill Stage", width: 150, options: stageOptions },
    { key: "status", label: "Payment Status", width: 170, options: statusOptions },
    { key: "billPaymentStatus", label: "Bill Payment", width: 160, options: billPaymentOptions },
    { key: "projectManagerId", label: "Manager", width: 170, options: managerOptions },
  ];

  const columns = useMemo(
    () => [
      {
        accessorKey: "projectStartDate",
        header: "Project Start Date",
        size: 150,
        enableSorting: false,
        meta: { defaultVisible: true },
        Cell: ({ cell }: any) => {
          try {
            const v = cell.getValue();
            if (!v) return DASH;
            const date = dayjs(v);
            return date.isValid() ? date.format("DD-MM-YYYY") : DASH;
          } catch (err) {
            return DASH;
          }
        },
      },
      {
        accessorKey: "projectNumber",
        header: "Project No",
        size: 165,
        Cell: ({ row }: any) => {
          const project: ProjectOverviewRow = row.original;
          return (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "inherit", fontWeight: 700 }}>
                {project.projectNumber ?? DASH}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: "projectName",
        header: "Project Name",
        size: 240,
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "handledByName",
        header: "Project Manager",
        size: 160,
        enableSorting: false,
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "projectStatus",
        header: "Project Status",
        size: 150,
        enableSorting: false,
        meta: { defaultVisible: true },
        Cell: ({ row }: any) => {
          const st = row?.original?.projectStatus;
          return st?.name ? (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: st.color || 'action.hover',
              borderRadius: '16px', padding: '4px 10px 4px 8px',
            }}>
              <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'common.white' }} />
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'common.white' }}>
                {st.name}
              </Typography>
            </Box>
          ) : (
            DASH
          );
        },
      },
      {
        accessorKey: "billStage",
        header: "Bill Stage",
        Header: () => <HintHeader title="Bill Stage" hint={STAGE_HINT} />,
        size: 150,
        enableSorting: false,
        Cell: ({ row }: any) => <TrackerStageCell row={row.original as ProjectOverviewRow} />,
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment Status",
        Header: () => <HintHeader title="Payment Status" hint={STATUS_HINT} />,
        size: 195,
        enableSorting: false,
        Cell: ({ row }: any) => <TrackerStatusCell row={row.original as ProjectOverviewRow} />,
      },
      {
        accessorKey: "followUpManagerName",
        header: "Follow-up Manager",
        size: 160,
        enableSorting: false,
        // ponytail: no follow-up owner in the schema yet. Wire it to the row's
        // `followUpManagerName` the moment the column exists — nothing else changes.
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "nextFollowUpDate",
        header: "Next Follow-up",
        size: 145,
        Cell: ({ cell }: any) => <DateCell value={cell.getValue()} />,
      },
      {
        accessorKey: "poValue",
        header: "PO Value",
        size: 150,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} bold />,
      },
      {
        accessorKey: "receivedAmount",
        header: "Total Received",
        size: 150,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} tone="success.main" />,
      },
      {
        accessorKey: "pendingAmount",
        header: "Total Pending",
        size: 165,
        Cell: ({ row }: any) => {
          const project: ProjectOverviewRow = row.original;
          return (
            <Box>
              <Money
                value={project.pendingAmount}
                bold
                tone={project.pendingAmount && project.pendingAmount > 0 ? "error.main" : undefined}
              />
              {project.pendingPercentage !== null && (
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  {project.pendingPercentage}% of PO
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: "lastPaymentAt",
        header: "Last Payment Date",
        size: 145,
        Cell: ({ cell }: any) => <DateCell value={cell.getValue()} />,
      },
      {
        id: "billDate",
        accessorFn: (row: ProjectOverviewRow) => row.bill?.issueDate ?? null,
        header: "Bill Date",
        size: 130,
        enableSorting: false,
        Cell: ({ cell }: any) => <DateCell value={cell.getValue()} />,
      },
      {
        id: "billNo",
        accessorFn: (row: ProjectOverviewRow) => row.bill?.documentNumber ?? null,
        header: "Bill No",
        size: 175,
        enableSorting: false,
        Cell: ({ row }: any) => {
          const bill: ProjectOverviewRow["bill"] = row.original.bill;
          return bill ? (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "inherit", fontWeight: 600 }}>{bill.documentNumber}</Typography>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                {bill.kind === "TAX_INVOICE" ? "Tax Invoice" : "Proforma"}
              </Typography>
            </Box>
          ) : (
            DASH
          );
        },
      },
      {
        id: "billAmount",
        accessorFn: (row: ProjectOverviewRow) => row.bill?.amount ?? null,
        header: "Bill Amount",
        size: 150,
        enableSorting: false,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} />,
      },
      {
        id: "billStatus",
        // The resolved value, not the bill's — a project with no bill yet can carry
        // a hand-set state, and the column has to search and export what it shows.
        accessorFn: (row: ProjectOverviewRow) => row.billPaymentStatus ?? null,
        header: "Bill Payment",
        Header: () => <HintHeader title="Bill Payment" hint={BILL_PAYMENT_HINT} />,
        size: 175,
        enableSorting: false,
        Cell: ({ row }: any) => <TrackerBillPaymentCell row={row.original as ProjectOverviewRow} />,
      },
    ],
    [],
  );

  return (


      <MaterialTable
        data={projects}
        columns={columns}
        // V2: fresh prefs bucket — a saved column order outranks the code's, so
        // Project Start Date moving to the front would never reach existing users.
        tableName="BillingProjectOverviewV2"
        isLoading={isLoading}
        searchPlaceholder="Search project number or name…"
        enableColumnSpecificSearch={true}
        enableColumnResizing={true}
        layoutMode="semantic"
        defaultSorting={[{ id: "projectNumber", desc: true }]}
        // The server owns all three. `data` is one page, so any local pass would
        // search, sort and count only the rows already on screen.
        manualFiltering={true}
        onSearchChange={setSearch}
        manualSorting={true}
        onSortingChange={setSorting}
        manualPagination={true}
        rowCount={total}
        paginationState={pagination}
        onPaginationChange={setPagination}
        renderTopToolbarRightActions={() => (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ py: 0.5 }}>
            {filterSelects.map((f) => (
              <TextField
                key={f.key} select size="small" label={f.label} value={filters[f.key]}
                onChange={(e) => setFilter(f.key, e.target.value)}
                sx={{ minWidth: f.width }}
                SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 360 } } } }}
              >
                {f.options.map((o) => (
                  <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>
        )}
        muiTableContainerProps={{ sx: { maxHeight: "700px", overflowX: "auto" } }}
        muiTableProps={{
          sx: {
            // Separated rows with a 4px gutter — the Leads & Projects geometry.
            borderCollapse: "separate",
            borderSpacing: "0 4px !important",
            minWidth: "2200px",
          },
          muiTableBodyRowProps: ({ row }: any) => {
            const project: ProjectOverviewRow = row.original;
            // The left accent carries PO state, the fact that gates every money
            // figure on the row — matching how the Leads table accents by status.
            const accent = project.poApproved
              ? "success.main"
              : project.poStatus
                ? "warning.main"
                : "transparent";
            return {
              onClick: () => navigate(`/employee/lead/${project.leadId}?tab=billing`),
              sx: {
                cursor: "pointer",
                // Tokens, not hex: this table has to survive the dark theme.
                backgroundColor: "background.paper",
                transition: "background-color 0.15s ease",
                "&:hover": { backgroundColor: "action.hover" },
                "& .MuiTableCell-root": {
                  fontSize: "13.5px",
                  fontFamily: "Inter",
                  fontWeight: 500,
                  padding: "6px 10px !important",
                  border: "none",
                  color: "text.primary",
                  whiteSpace: "nowrap",
                  backgroundColor: "transparent",
                },
                "& .MuiTableCell-root:first-of-type": {
                  borderTopLeftRadius: "12px",
                  borderBottomLeftRadius: "12px",
                  borderLeft: `3px solid`,
                  borderLeftColor: accent,
                },
                "& .MuiTableCell-root:last-of-type": {
                  borderTopRightRadius: "12px",
                  borderBottomRightRadius: "12px",
                },
              },
            };
          },
        }}
      />
  );
};

export default BillingOperationsPage;
