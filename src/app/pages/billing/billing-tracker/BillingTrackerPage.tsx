import React, { useMemo, useState, useEffect } from "react";
import { useBillingOrgId } from "../BillingLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import { Progress } from "@/ds/ui/progress";
import { formatDate } from "@utils/dateFormats";
import dayjs from "dayjs";
import {TRACKER_SORT_KEYS, listBillingTracker,type BillingTrackerRow, type BillingTrackerParams, type BillingTrackerSort,
} from "@services/billingTrackers";
import { useBillingLabels } from "../components";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";
import { TrackerStatusCell } from "./TrackerStatusCell";
import { DASH, Money, TotalLabel, usePoChip } from "../components/trackerKit";
import { ACTION_COLUMN_WIDTH, TrackerActionsCell, useTrackerActions } from "./TrackerActions";

/**
 * The Billing Tracker — one row per PROJECT, including projects nothing has been billed against yet (a project with a
 * signed PO and no proforma is exactly the row Accounts needs to chase). Every money figure is summed from the
 * project's bills on the server.
 *
 * Runs on kit `DataTable`. Search, sorting and pagination are all SERVER-side: the money columns are cross-table
 * aggregates, and sorting them in the browser would reorder one page while implying the whole list was ranked.
 */

/** Only these can be ordered in SQL; a header click on anything else is ignored. */
const SERVER_SORTABLE: readonly string[] = TRACKER_SORT_KEYS;

/** What the Bill Stage column means, on its header — named as in Billing → Configure, where it is renamed. */
const STATUS_HINT =
  "Configure → Bill Stage. Where the project's billing stands, set by hand on this sheet.";

const EXPECTED_HINT =
  "What is still owed on issued bills whose due date falls in the current calendar month. " +
  "Money already received against them is not counted.";

/** Column header with a tooltip. */
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

  const columns = useMemo<ColumnDef<BillingTrackerRow, unknown>[]>(
    () => [
      {
        // The row's note and its tasks — first, like the Action column on Leads & Projects.
        id: "actions",
        accessorKey: "billingNote",
        header: "Action",
        size: ACTION_COLUMN_WIDTH,
        enableSorting: false,
        enableColumnFilter: false,
        meta: { defaultVisible: true, wrap: false },
        cell: ({ row }) => (
          <TrackerActionsCell row={row.original} onNote={onNote} onTasks={onTasks} />
        ),
      },
      {
        accessorKey: "projectStartDate",
        header: "Project Start Date",
        size: 150,
        meta: { defaultVisible: true, wrap: false },
        footer: () => <TotalLabel />,
        cell: ({ cell }) => {
          try {
            const v = cell.getValue();
            if (!v) return DASH;
            const date = dayjs(v as string);
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
        meta: { wrap: false },
        cell: ({ row }) => (
          <span className="block min-w-0 font-bold">{row.original.projectNumber ?? DASH}</span>
        ),
      },
      {
        accessorKey: "projectName",
        header: "Project Name",
        size: 240,
        cell: ({ cell }) => (cell.getValue() as string) || DASH,
      },
      {
        accessorKey: "clientName",
        header: "Client Company",
        size: 180,
        cell: ({ cell }) => (cell.getValue() as string) || DASH,
      },
      {
        accessorKey: "handledByName",
        header: "Project Manager",
        size: 160,
        cell: ({ cell }) => (cell.getValue() as string) || DASH,
      },
      {
        accessorKey: "projectStatus",
        header: "Project Status",
        size: 150,
        meta: { defaultVisible: true, align: "center", wrap: false },
        cell: ({ row }) => {
          const st = row.original.projectStatus;
          return st?.name ? <SolidChip label={st.name} color={st.color} /> : DASH;
        },
      },
      {
        // Same cell as the Proforma tracker's "Raised on Proformas": the figure, its %, and the bar.
        accessorKey: "workDoneAmount",
        header: "Work Done",
        size: 190,
        enableSorting: false, // not a SQL column — a header click would reorder nothing
        meta: { exportType: "currency" },
        cell: ({ row }) => {
          const project = row.original;
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
        header: () => <HintHeader title="Bill Stage" hint={STATUS_HINT} />,
        size: 195,
        meta: { label: "Bill Stage", align: "center", wrap: false },
        cell: ({ row }) => <TrackerStatusCell row={row.original} />,
      },
      {
        accessorKey: "followUpManagerName",
        header: "Follow-up Manager",
        size: 160,
        // ponytail: no follow-up owner in the schema yet. Wire it to the row's
        // `followUpManagerName` the moment the column exists — nothing else changes.
        cell: ({ cell }) => (cell.getValue() as string) || DASH,
      },
      {
        accessorKey: "nextFollowUpDate",
        header: "Next Follow-up",
        size: 145,
        meta: { wrap: false },
        cell: ({ cell }) => {
          const v = cell.getValue() as string | null;
          return v ? formatDate(v) : DASH;
        },
      },
      {
        accessorKey: "poValue",
        header: "PO Value",
        size: 170,
        meta: { exportType: "currency" },
        // The amount exists only once the PO is approved (the server sends null before that).
        // Until then the cell says where the PO stands — "PO Pending" — as a chip in the colour
        // configured for that status in Leads → Configure, the same source the lead form's
        // dropdown uses. A name with no configured colour gets the neutral chip.
        cell: ({ row }) => {
          const project = row.original;
          if (project.poApproved) return <Money value={project.poValue} bold />;
          return poChip(project.poStatus);
        },
        footer: () => <Money value={totals?.poValue} bold />,
      },
      {
        accessorKey: "totalBilled",
        header: "Total Billed",
        size: 150,
        meta: { exportType: "currency" },
        cell: ({ cell }) => <Money value={cell.getValue() as number} bold />,
        footer: () => <Money value={totals?.totalBilled} bold />,
      },
      {
        accessorKey: "notBilledAmount",
        header: "Total Not Billed",
        size: 150,
        meta: { exportType: "currency" },
        cell: ({ cell }) => <Money value={cell.getValue() as number} bold />,
        footer: () => <Money value={totals?.notBilledAmount} bold />,
      },
      {
        accessorKey: "receivedAmount",
        header: "Total Received",
        size: 150,
        meta: { exportType: "currency" },
        cell: ({ cell }) => <Money value={cell.getValue() as number} tone="success" />,
        footer: () => <Money value={totals?.receivedAmount} tone="success" />,
      },
      {
        accessorKey: "pendingAmount",
        header: "Total Pending",
        size: 165,
        meta: { exportType: "currency" },
        footer: () => (
          <Money
            value={totals?.pendingAmount}
            bold
            tone={totals?.pendingAmount && totals.pendingAmount > 0 ? "danger" : undefined}
          />
        ),
        cell: ({ row }) => {
          const project = row.original;
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
        meta: { wrap: false },
        cell: ({ cell }) => {
          const v = cell.getValue() as string | null;
          return v ? formatDate(v) : DASH;
        },
      },
      {
        accessorKey: "lastPaymentAmount",
        header: "Last Payment Amount",
        size: 165,
        meta: { exportType: "currency" },
        cell: ({ cell }) => <Money value={cell.getValue() as number} tone="success" />,
      },
      {
        // The latest issued bill's face value — the old Bill Amount column, renamed.
        id: "billAmount",
        accessorFn: (row) => row.bill?.amount ?? null,
        header: "Current Bill Value",
        size: 165,
        meta: { exportType: "currency" },
        cell: ({ cell }) => <Money value={cell.getValue() as number | null} />,
      },
      {
        accessorKey: "expectedThisMonth",
        header: () => <HintHeader title="Expected Payment This Month" hint={EXPECTED_HINT} />,
        size: 190,
        meta: { label: "Expected Payment This Month", exportType: "currency" },
        cell: ({ cell }) => <Money value={cell.getValue() as number} />,
        footer: () => <Money value={totals?.expectedThisMonth} bold />,
      },
    ],
    // onNote/onTasks only set page state; their identity changing doesn't change what a cell renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poChip, totals],
  );

  return (
    <>
      {dialogs}
      <DataTable
        caption="Billing Tracker"
        data={projects}
        columns={columns}
        getRowId={(r) => r.leadId}
        // V4: fresh prefs bucket — a saved column order outranks the code's, so
        // changed columns would never reach existing users.
        stateKey="BillingProjectOverviewV5"
        loading={isLoading}
        searchPlaceholder="Search project number, name or client…"
        initialSorting={[{ id: "projectNumber", desc: true }]}
        // The server owns all three. `data` is one page, so any local pass would
        // search, sort and count only the rows already on screen.
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        sorting={sorting}
        onSortingChange={setSorting}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        virtualized
        virtualMaxHeight="700px"
        groupableColumns={false}
        // The PROJECT view (/project/:id), not the lead view — every row here is a
        // project, and the lead path opens the same record with the lead tab set.
        // Clicks inside Action controls are skipped by DataTable's fromControl.
        onRowClick={(project) => navigate(`/project/${project.leadId}?tab=billing`)}
        rowLabel={(p) => p.projectNumber ?? p.projectName ?? "Open project"}
        /*
         * Soft tint + left edge from bill stage (Configure colour), falling back to PO state.
         * Stage is what this sheet is about; PO accent remains when nothing has been billed yet.
         */
        rowTone={(project) => {
          const stageTone = labels.tone(project.status);
          if (stageTone) return stageTone;
          if (project.poApproved) return "success";
          if (project.poStatus) return "warning";
          return undefined;
        }}
      />
    </>
  );
};

export default BillingTrackerPage;
