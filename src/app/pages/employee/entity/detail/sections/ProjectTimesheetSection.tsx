import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Stack } from "@mui/material";
import { CheckSquare, Eye, FileText, Paperclip, Pencil, Plus, Trash2, Users } from "lucide-react";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import { DetailCard, DetailSummaryBar } from "@app/modules/detail-page/DetailPageComponents";
import { C, FONT, RADIUS } from "@app/modules/configuration/ConfigDesignSystem";
import {
  SegmentedControl, WtButton, WtEmptyState, WtIconButton, confirmDialog, toast, toneAlpha, tonePair,
} from "@app/modules/common/components/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { deleteTimeSheetById, getAllTimeSheetWithCostByProjectId } from "@services/tasks";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { formatDate } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
import { canDelete } from "@utils/can";
import NewTimeLogForm from "@app/pages/employee/timesheet/employeetimesheet/component/NewTimeLogForm";
import TimeLogDetailDialog from "@app/pages/employee/timesheet/components/TimeLogDetailDialog";
import { AssigneeAvatar } from "@pages/employee/tasks/components/primitives";

/** One row of the project with-costing endpoint. */
interface LogRow {
  id: string;
  /** The log's place in the project, oldest first — the number its Log Sheet shows. */
  serialNo?: number;
  taskName: string;
  isMeeting?: boolean;
  isRunning?: boolean;
  startTime: string;
  endTime: string | null;
  billable: boolean;
  cost: number;
  costFormatted: string;
  description: string | null;
  attachments: { url: string; fileName: string }[];
  logTimeHours: number;
  logTimeMinutes: number;
  logTimeSeconds: number;
  original: { employee?: { avatar?: string | null; users?: { firstName?: string | null; lastName?: string | null } | null } | null };
}

type Filter = "all" | "billable" | "nonBillable";

const SUCCESS = tonePair("success").fg;
const BRAND = tonePair("brand").fg;

const seconds = (r: LogRow) => r.logTimeHours * 3600 + r.logTimeMinutes * 60 + r.logTimeSeconds;
/** "1h 5m", "12m", "39s" — the smallest units that still say it. */
const duration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return m ? `${h}h ${m}m` : `${h}h`;
  if (m) return `${m}m`;
  return `${s % 60}s`;
};
const clock = (v: string | null) => (v ? dayjs(v).format("h:mm A") : "—");

const Pill: React.FC<{ fg: string; children: React.ReactNode }> = ({ fg, children }) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: RADIUS.full,
      background: toneAlpha(fg, 0.12), border: `1px solid ${toneAlpha(fg, 0.28)}`, color: fg,
      fontFamily: FONT.body, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/**
 * Project → Timesheet. Every hour logged on the project — the same card-and-summary layout as
 * Deliverables, with the logs in the app's table engine. A row opens the entry itself: what was
 * done and the files it produced, which open in the page rather than a new tab.
 */
const ProjectTimesheetSection: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null | undefined>(undefined); // undefined = closed, null = new

  const query = useQuery({
    queryKey: ["project-timesheets", projectId],
    queryFn: () => getAllTimeSheetWithCostByProjectId(projectId, ""),
    enabled: !!projectId,
    staleTime: 0,
  });
  // A log saved from anywhere (the timer, a task, My Timesheet) lands here straight away.
  useEventBus(EVENT_KEYS.NewTimeLogFromCreated, () => void query.refetch());

  const logs: LogRow[] = useMemo(() => query.data?.timeSheets ?? [], [query.data]);
  const shown = useMemo(
    () => logs.filter((l) => filter === "all" || (filter === "billable" ? l.billable : !l.billable)),
    [logs, filter],
  );
  const totalSeconds = logs.reduce((n, l) => n + seconds(l), 0);
  const people = new Set(logs.map((l) => l.original?.employee?.users?.firstName ?? "")).size;

  const remove = async (row: LogRow) => {
    const ok = await confirmDialog({ icon: "warning", title: "Delete this time log?", text: "This cannot be undone." });
    if (!ok) return;
    try {
      await deleteTimeSheetById(row.id);
      toast({ icon: "success", title: "Time log deleted" });
      void query.refetch();
    } catch (err) {
      toast({ icon: "error", title: apiErrorMessage(err, "Could not delete the time log") });
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: "serialNo",
      header: "#",
      size: 60,
      cell: ({ row }: { row: { original: LogRow } }) => (
        <span style={{ fontWeight: 700, color: C.textSecondary }}>{row.original.serialNo ?? "—"}</span>
      ),
    },
    {
      accessorKey: "taskName",
      header: "Task",
      size: 220,
      cell: ({ row }: { row: { original: LogRow } }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex shrink-0 leading-none"
            style={{ color: row.original.isMeeting ? C.purple : C.primary }}
          >
            {row.original.isMeeting
              ? <Users aria-hidden className="size-4" />
              : <CheckSquare aria-hidden className="size-4" />}
          </span>
          <span style={{ fontWeight: 600, color: C.textPrimary }}>{row.original.taskName}</span>
          {row.original.isRunning && <Pill fg={SUCCESS}>● Running</Pill>}
        </div>
      ),
    },
    {
      id: "employee",
      header: "Logged by",
      size: 180,
      accessorFn: (r: LogRow) => `${r.original?.employee?.users?.firstName ?? ""} ${r.original?.employee?.users?.lastName ?? ""}`,
      cell: ({ row }: { row: { original: LogRow } }) => <AssigneeAvatar employee={row.original.original?.employee} size={28} showName />,
    },
    {
      id: "date",
      header: "Date",
      size: 120,
      accessorFn: (r: LogRow) => r.startTime,
      cell: ({ row }: { row: { original: LogRow } }) => formatDate(row.original.startTime),
    },
    {
      id: "window",
      header: "Time",
      size: 170,
      accessorFn: (r: LogRow) => r.startTime,
      cell: ({ row }: { row: { original: LogRow } }) => (
        <span style={{ color: C.textSecondary }}>
          {clock(row.original.startTime)} <span style={{ color: C.textMuted }}>→</span> {row.original.isRunning ? "now" : clock(row.original.endTime)}
        </span>
      ),
    },
    {
      id: "logged",
      header: "Logged",
      size: 100,
      accessorFn: (r: LogRow) => seconds(r),
      cell: ({ row }: { row: { original: LogRow } }) => <Pill fg={BRAND}>{duration(seconds(row.original))}</Pill>,
    },
    {
      id: "billable",
      header: "Billable",
      size: 110,
      accessorFn: (r: LogRow) => (r.billable ? 1 : 0),
      cell: ({ row }: { row: { original: LogRow } }) =>
        row.original.billable ? <Pill fg={SUCCESS}>Billable</Pill> : <Pill fg={C.textSecondary}>Non-billable</Pill>,
    },
    {
      accessorKey: "cost",
      header: "Cost",
      size: 100,
      cell: ({ row }: { row: { original: LogRow } }) => (
        <span style={{ fontWeight: 700, color: row.original.cost > 0 ? C.textPrimary : C.textMuted }}>{row.original.costFormatted}</span>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      size: 100,
      enableSorting: false,
      accessorFn: (r: LogRow) => (r.attachments?.length ?? 0),
      // What the person wrote and attached — the part the old table never showed.
      cell: ({ row }: { row: { original: LogRow } }) => {
        const files = row.original.attachments?.length ?? 0;
        if (!row.original.description && !files) return <span style={{ color: C.textMuted }}>—</span>;
        return (
          <div className="flex items-center gap-3" style={{ color: C.textSecondary }}>
            {row.original.description && (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex leading-none" />}>
                  <FileText aria-hidden className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{row.original.description}</TooltipContent>
              </Tooltip>
            )}
            {files > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Paperclip aria-hidden className="size-4" />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{files}</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      size: 120,
      enableSorting: false,
      cell: ({ row }: { row: { original: LogRow } }) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <WtIconButton title="View" onClick={() => setViewing(row.original.id)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <Eye aria-hidden className="size-3.5" />
          </WtIconButton>
          <WtIconButton title="Edit" onClick={() => setEditing(row.original.id)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <Pencil aria-hidden className="size-3.5" />
          </WtIconButton>
          {canDelete("timesheets.employees") && (
          <WtIconButton title="Delete" color="#C0392B" onClick={() => void remove(row.original)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <Trash2 aria-hidden className="size-3.5" />
          </WtIconButton>
          )}
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ] as ColumnDef<LogRow, any>[], []);

  return (
    <div>
      <DetailSummaryBar
        items={[
          { label: "Time Logged", value: duration(totalSeconds), icon: "bi bi-stopwatch", accentColor: "primary" },
          { label: "Cost", value: query.data?.summary?.totalCostFormatted ?? "—", icon: "bi bi-currency-rupee", accentColor: "green" },
          { label: "Entries", value: `${logs.length} (${query.data?.summary?.billableEntries ?? 0} billable)`, icon: "bi bi-list-check", accentColor: "blue" },
          { label: "People", value: people, icon: "bi bi-people", accentColor: "amber" },
        ]}
      />

      <DetailCard
        title="Time Logs"
        subtitle="Every hour logged on this project — open a row to see what was done and its files"
        icon="bi bi-stopwatch"
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <SegmentedControl<Filter>
              ariaLabel="Billing"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: logs.length },
                { value: "billable", label: "Billable", count: logs.filter((l) => l.billable).length },
                { value: "nonBillable", label: "Non-billable", count: logs.filter((l) => !l.billable).length },
              ]}
            />
            <WtButton size="small" onClick={() => setEditing(null)} startIcon={<Plus aria-hidden className="size-3.5" />}>
              Add Log
            </WtButton>
          </Stack>
        }
        bodyStyle={{ padding: "4px 12px 12px" }}
      >
        {query.isError ? (
          <WtEmptyState variant="error" title="Couldn't load the time logs" actionLabel="Try again" onAction={() => void query.refetch()} />
        ) : !query.isLoading && logs.length === 0 ? (
          <WtEmptyState title="No time logged yet" hint="Time from the task timer or Add Log shows up here." actionLabel="Add Log" onAction={() => setEditing(null)} />
        ) : (
          <DataTable
            caption="Project Time Logs"
            stateKey="ProjectTimesheetLogs"
            data={shown}
            columns={columns as any}
            getRowId={(r) => r.id}
            loading={query.isLoading}
            tools={false}
            groupableColumns={false}
            onRowClick={(r) => setViewing(r.id)}
            rowLabel={(r) => r.taskName || "Open time log"}
          />
        )}
      </DetailCard>

      <TimeLogDetailDialog
        open={!!viewing}
        timesheetId={viewing}
        onClose={() => setViewing(null)}
        onChanged={() => void query.refetch()}
      />
      {editing !== undefined && (
        <NewTimeLogForm
          show
          timeSheetId={editing ?? undefined}
          prefilledProjectId={projectId}
          onClose={() => { setEditing(undefined); void query.refetch(); }}
        />
      )}
    </div>
  );
};

export default ProjectTimesheetSection;
