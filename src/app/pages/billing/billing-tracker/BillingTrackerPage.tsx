import React, { useMemo, useState, useEffect } from "react";
import { useBillingOrgId } from "../BillingLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { Progress } from "@/ds/ui/progress";
import { toneAlpha, isHexColor, type SemanticTone } from "@app/modules/common/components/ui";
import { tonePair } from "@app/theme/tokens";
import { formatDate } from "@utils/dateFormats";
import dayjs from "dayjs";
import {TRACKER_SORT_KEYS, listBillingTracker,type BillingTrackerRow, type BillingTrackerParams, type BillingTrackerSort,
} from "@services/billingTrackers";
import { useBillingLabels } from "../components";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";
import { TrackerStatusCell } from "./TrackerStatusCell";
import { DASH, Money, TotalLabel, usePoChip } from "../components/trackerKit";
import { ACTION_COLUMN_WIDTH, TrackerActionsCell, useTrackerActions } from "./TrackerActions";

/** The four chip columns sit centred, header and body alike. */
const CENTRED = {
  muiTableHeadCellProps: { align: "center" as const },
  muiTableBodyCellProps: { align: "center" as const },
};

/**
 * The Billing Tracker — one row per PROJECT, including projects nothing has been billed against yet (a project with a
 * signed PO and no proforma is exactly the row Accounts needs to chase). Every money figure is summed from the
 * project's bills on the server.
 *
 * Runs on `MaterialTable`, the same engine and layout as Leads & Projects. Search, sorting and pagination are all
 * SERVER-side: the money columns are cross-table aggregates, and sorting them in the browser would reorder one page
 * while implying the whole list was ranked.
 */

/** Only these can be ordered in SQL; a header click on anything else is ignored. */
const SERVER_SORTABLE: readonly string[] = TRACKER_SORT_KEYS;

/** What the Bill Stage column means, on its header — named as in Billing → Configure, where it is renamed. */
const STATUS_HINT =
  "Configure → Bill Stage. Where the project's billing stands, set by hand on this sheet.";

const EXPECTED_HINT =
  "What is still owed on issued bills whose due date falls in the current calendar month. " +
  "Money already received against them is not counted.";

/** Column header with a tooltip. `Header` overrides the plain string in MaterialTable. */
const HintHeader: React.FC<{ title: string; hint: string }> = ({ title, hint }) => (
  <Tooltip>
    <TooltipTrigger render={<span className="inline-flex cursor-help items-center gap-1" />}>
      <span>{title}</span>
      <Info aria-hidden className="size-3 text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent side="top">{hint}</TooltipContent>
  </Tooltip>
);

const BillingTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const labels = useBillingLabels();
  const poChip = usePoChip();

  const [filters, setFilters] = useState({
    status: "", stage: "", billPaymentStatus: "", projectManagerId: "",
  });
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([
    // Newest project first.
    { id: "projectNumber", desc: true },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const organizationId = useBillingOrgId();
  // A new organization is a new result set; staying on page 7 of the old one shows nothing.
  useEffect(() => setPagination((prev) => ({ ...prev, pageIndex: 0 })), [organizationId]);

  useEffect(() => {
    const urlStatus = searchParams.get("status") || "";
    const urlStage = searchParams.get("stage") || "";
    if (urlStatus || urlStage) {
      setFilters((prev) => ({ ...prev, status: urlStatus, stage: urlStage }));
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [searchParams]);

  const active = sorting[0];
  const sortBy = SERVER_SORTABLE.includes(active?.id as string)
    ? (active.id as BillingTrackerSort)
    : "projectNumber";

  const params: BillingTrackerParams = {
    search: search || undefined,
    status: (filters.status || undefined) as BillingTrackerParams["status"],
    stage: (filters.stage || undefined) as BillingTrackerParams["stage"],
    billPaymentStatus: filters.billPaymentStatus || undefined,
    projectManagerId: filters.projectManagerId || undefined,
    // The organization chosen in the Billing tab bar — one filter for the whole module.
    organizationId,
    sortBy,
    sortDir: active?.desc ? "desc" : "asc",
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["billing-tracker", params],
    queryFn: () => listBillingTracker(params),
    // Keeps the Manager options on screen while the next filter's page loads.
    placeholderData: keepPreviousData,
  });

  const projects = data?.projects ?? [];
  const total = data?.pagination?.total ?? 0;
  // Footer sums come from the server over the whole filtered set — summing `projects` here
  // would total only the 25 rows on screen.
  const totals = data?.totals;
  const { onNote, onTasks, dialogs } = useTrackerActions();

  const columns = useMemo(
    () => [
      {
        // The row's note and its tasks — first, like the Action column on Leads & Projects.
        id: "actions",
        accessorKey: "billingNote",
        header: "Action",
        size: ACTION_COLUMN_WIDTH,
        enableSorting: false,
        enableColumnFilter: false,
        meta: { defaultVisible: true },
        Cell: ({ row }: any) => (
          <TrackerActionsCell row={row.original as BillingTrackerRow} onNote={onNote} onTasks={onTasks} />
        ),
      },
      {
        accessorKey: "projectStartDate",
        header: "Project Start Date",
        size: 150,
        meta: { defaultVisible: true },
        Footer: () => <TotalLabel />,
        Cell: ({ cell }: any) => {
          try {
            const v = cell.getValue();
            if (!v) return DASH;
            const date = dayjs(v);
            return date.isValid() ? date.format("DD-MM-YYYY") : DASH;
          } catch {
            return DASH;
          }
        },
      },
      {
        accessorKey: "projectNumber",
        header: "Project No",
        size: 165,
        Cell: ({ row }: any) => {
          const project: BillingTrackerRow = row.original;
          return (
            <span className="block min-w-0 font-bold">{project.projectNumber ?? DASH}</span>
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
        accessorKey: "clientName",
        header: "Client Company",
        size: 180,
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "handledByName",
        header: "Project Manager",
        size: 160,
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "projectStatus",
        header: "Project Status",
        size: 150,
        meta: { defaultVisible: true },
        ...CENTRED,
        Cell: ({ row }: any) => {
          const st = row?.original?.projectStatus;
          return st?.name ? <SolidChip label={st.name} color={st.color} /> : DASH;
        },
      },
      {
        // Same cell as the Proforma tracker's "Raised on Proformas": the figure, its %, and the bar.
        accessorKey: "workDoneAmount",
        header: "Work Done",
        size: 190,
        enableSorting: false, // not a SQL column — a header click would reorder nothing
        Cell: ({ row }: any) => {
          const project: BillingTrackerRow = row.original;
          if (project.workDonePercent == null) return DASH;
          return (
            <div className="min-w-[150px]">
              <div className="mb-1 flex justify-between">
                {project.workDoneAmount != null ? <Money value={project.workDoneAmount} bold muted={!project.workDoneAmount} /> : <span />}
                <span className="text-[11px] text-muted-foreground">{project.workDonePercent}%</span>
              </div>
              <Progress value={project.workDonePercent} aria-label="Work done on the project" />
            </div>
          );
        },
      },
      {
        // One column, not two: the stage always follows this status through the four bands, so
        // a separate Stage column repeated what this one already says.
        accessorKey: "paymentStatus",
        header: "Bill Stage",
        Header: () => <HintHeader title="Bill Stage" hint={STATUS_HINT} />,
        size: 195,
        ...CENTRED,
        Cell: ({ row }: any) => <TrackerStatusCell row={row.original as BillingTrackerRow} />,
      },
      {
        accessorKey: "followUpManagerName",
        header: "Follow-up Manager",
        size: 160,
        // ponytail: no follow-up owner in the schema yet. Wire it to the row's
        // `followUpManagerName` the moment the column exists — nothing else changes.
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "nextFollowUpDate",
        header: "Next Follow-up",
        size: 145,
        Cell: ({ cell }: any) => (cell.getValue() ? formatDate(cell.getValue()) : DASH),
      },
      {
        accessorKey: "poValue",
        header: "PO Value",
        size: 170,
        // The amount exists only once the PO is approved (the server sends null before that).
        // Until then the cell says where the PO stands — "PO Pending" — as a chip in the colour
        // configured for that status in Leads → Configure, the same source the lead form's
        // dropdown uses. A name with no configured colour gets the neutral chip.
        Cell: ({ row }: any) => {
          const project: BillingTrackerRow = row.original;
          if (project.poApproved) return <Money value={project.poValue} bold />;
          return poChip(project.poStatus);
        },
        Footer: () => <Money value={totals?.poValue} bold />,
      },
      {
        accessorKey: "totalBilled",
        header: "Total Billed",
        size: 150,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} bold />,
        Footer: () => <Money value={totals?.totalBilled} bold />,
      },
      {
        accessorKey: "notBilledAmount",
        header: "Total Not Billed",
        size: 150,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} bold />,
        Footer: () => <Money value={totals?.notBilledAmount} bold />,
      },
      {
        accessorKey: "receivedAmount",
        header: "Total Received",
        size: 150,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} tone="success" />,
        Footer: () => <Money value={totals?.receivedAmount} tone="success" />,
      },
      {
        accessorKey: "pendingAmount",
        header: "Total Pending",
        size: 165,
        Footer: () => (
          <Money
            value={totals?.pendingAmount}
            bold
            tone={totals?.pendingAmount && totals.pendingAmount > 0 ? "danger" : undefined}
          />
        ),
        Cell: ({ row }: any) => {
          const project: BillingTrackerRow = row.original;
          // Just the amount: the "% of PO" line under it was noise in a column of figures.
          return (
            <Money
              value={project.pendingAmount}
              bold
              tone={project.pendingAmount && project.pendingAmount > 0 ? "danger" : undefined}
            />
          );
        },
      },
      {
        accessorKey: "lastPaymentAt",
        header: "Last Payment Date",
        size: 145,
        Cell: ({ cell }: any) => (cell.getValue() ? formatDate(cell.getValue()) : DASH),
      },
      {
        accessorKey: "lastPaymentAmount",
        header: "Last Payment Amount",
        size: 165,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} tone="success" />,
      },
      {
        // The latest issued bill's face value — the old Bill Amount column, renamed.
        id: "billAmount",
        accessorFn: (row: BillingTrackerRow) => row.bill?.amount ?? null,
        header: "Current Bill Value",
        size: 165,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} />,
      },
      {
        accessorKey: "expectedThisMonth",
        header: "Expected Payment This Month",
        Header: () => <HintHeader title="Expected Payment This Month" hint={EXPECTED_HINT} />,
        size: 190,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} />,
        Footer: () => <Money value={totals?.expectedThisMonth} bold />,
      },
    ],
    // onNote/onTasks only set page state; their identity changing doesn't change what a cell renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poChip, totals],
  );

  return (
    <>
      {dialogs}
      <MaterialTable
        data={projects}
        columns={columns}
        // V4: fresh prefs bucket — a saved column order outranks the code's, so
        // changed columns would never reach existing users.
        tableName="BillingProjectOverviewV5"
        isLoading={isLoading}
        showColumnFooter={true}
        searchPlaceholder="Search project number, name or client…"
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
        muiTableContainerProps={{ sx: { maxHeight: "700px", overflowX: "auto" } }}
        muiTableProps={{
          sx: {
            // Separated rows with a 4px gutter — the Leads & Projects geometry.
            borderCollapse: "separate",
            borderSpacing: "0 4px !important",
            minWidth: "2200px",
          },
          muiTableBodyRowProps: ({ row }: any) => {
            const project: BillingTrackerRow = row.original;
            // The left accent carries PO state, the fact that gates every money
            // figure on the row — matching how the Leads table accents by status.
            const accent = project.poApproved
              ? "success.main"
              : project.poStatus
                ? "warning.main"
                : "transparent";
            /*
             * The row carries its BILL STAGE as a tint — the same idea as the tint
             * on the Leads & Projects table, pointed at the column this screen is
             * actually about. Where a project stands with its billing is then
             * readable across the whole row, not only in its own chip.
             *
             * The colour is the one configured for that stage in Billing →
             * Configure, so recolouring a stage there recolours these rows too and
             * the chip can never disagree with the row it sits on. A stage whose
             * colour is a tone name resolves through the theme; a hex is used as
             * picked. A project with no bill raised has no stage and stays plain,
             * which is what separates "nothing to do here" from the rest.
             *
             * `toneAlpha` rather than the `${color}20` concatenation the Leads
             * table uses: that silently produces "red20" and paints nothing when a
             * colour is stored as a name, while this returns it untouched.
             */
            const stageTone = labels.tone(project.status);
            const statusColor = stageTone
              ? (isHexColor(stageTone) ? stageTone : tonePair(stageTone as SemanticTone).fg)
              : null;

            return {
              // The PROJECT view (/project/:id), not the lead view — every row here is a
              // project, and the lead path opens the same record with the lead tab set.
              // A click inside the Action column (note, tasks) belongs to that control, not to the row.
              onClick: (e: React.MouseEvent) => {
                if ((e.target as Element).closest("[data-row-actions]")) return;
                navigate(`/project/${project.leadId}?tab=billing`);
              },
              sx: {
                cursor: "pointer",
                // Tokens where there is no status colour: this table has to survive
                // the dark theme, so the FALLBACK is never a hardcoded grey.
                // 0.22, not the 0.12 this started at: the stage colours are already
                // dark and desaturated (a deep green, a muted amber), so a tenth of
                // one over white was a grey that read as "no colour" rather than as
                // the stage. High enough to scan down the row, low enough to leave
                // the chips and the figures on top of it the strongest thing there.
                backgroundColor: statusColor ? toneAlpha(statusColor, 0.22) : "background.paper",
                transition: "background-color 0.15s ease",
                "&:hover": {
                  backgroundColor: statusColor ? toneAlpha(statusColor, 0.32) : "action.hover",
                },
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
    </>
  );
};

export default BillingTrackerPage;
