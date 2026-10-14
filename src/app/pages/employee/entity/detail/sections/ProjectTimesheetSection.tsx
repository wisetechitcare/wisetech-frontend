import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { Box, Stack, Tooltip } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import type { RootState } from "@redux/store";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { DetailCard, DetailSummaryBar } from "@app/modules/detail-page/DetailPageComponents";
import { C, FONT, RADIUS } from "@app/modules/configuration/ConfigDesignSystem";
import {
  SegmentedControl, WtButton, WtEmptyState, WtIconButton, confirmDialog, toast, toneAlpha, tonePair,
} from "@app/modules/common/components/ui";
import { deleteTimeSheetById, getAllTimeSheetWithCostByProjectId } from "@services/tasks";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { formatDate } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
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

// The table sits flush in the card: no second paper, hairline rows (main.css styles every
// table card with !important, hence the `&&&` + !important — same as the Teams tab).
const FLUSH_PAPER = {
  "&&&": { boxShadow: "none !important", border: "none !important", borderRadius: "0 !important", backgroundColor: "transparent" },
};
const FLUSH_HEAD = {
  "&&&": {
    fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color: C.textSecondary,
    backgroundColor: "transparent !important", borderBottom: `1px solid ${C.border} !important`,
  },
};
const FLUSH_ROWS = {
  muiTableBodyRowProps: () => ({
    sx: {
      cursor: "pointer",
      "& .MuiTableCell-root": { fontFamily: FONT.body, fontSize: 13.5, borderBottom: `1px solid ${C.border} !important` },
      "&:hover .MuiTableCell-root": { backgroundColor: `${toneAlpha(C.primary, 0.03)} !important` },
    },
  }),
};

/**
 * Project → Timesheet. Every hour logged on the project — the same card-and-summary layout as
 * Deliverables, with the logs in the app's table engine. A row opens the entry itself: what was
 * done and the files it produced, which open in the page rather than a new tab.
 */
const ProjectTimesheetSection: React.FC<{ projectId: string }> = ({ projectId }) => {
  const currentUserId = useSelector((s: RootState) => s.employee?.currentEmployee?.id);
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
      Cell: ({ row }: { row: { original: LogRow } }) => (
        <span style={{ fontWeight: 700, color: C.textSecondary }}>{row.original.serialNo ?? "—"}</span>
      ),
    },
    {
      accessorKey: "taskName",
      header: "Task",
      size: 220,
      Cell: ({ row }: { row: { original: LogRow } }) => (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Box sx={{ color: row.original.isMeeting ? C.purple : C.primary, lineHeight: 0, flexShrink: 0 }}>
            <KTIcon iconName={row.original.isMeeting ? "people" : "check-square"} className="fs-4" />
          </Box>
          <span style={{ fontWeight: 600, color: C.textPrimary }}>{row.original.taskName}</span>
          {row.original.isRunning && <Pill fg={SUCCESS}>● Running</Pill>}
        </Stack>
      ),
    },
    {
      id: "employee",
      header: "Logged by",
      size: 180,
      accessorFn: (r: LogRow) => `${r.original?.employee?.users?.firstName ?? ""} ${r.original?.employee?.users?.lastName ?? ""}`,
      Cell: ({ row }: { row: { original: LogRow } }) => <AssigneeAvatar employee={row.original.original?.employee} size={28} showName />,
    },
    {
      id: "date",
      header: "Date",
      size: 120,
      accessorFn: (r: LogRow) => r.startTime,
      Cell: ({ row }: { row: { original: LogRow } }) => formatDate(row.original.startTime),
    },
    {
      id: "window",
      header: "Time",
      size: 170,
      accessorFn: (r: LogRow) => r.startTime,
      Cell: ({ row }: { row: { original: LogRow } }) => (
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
      Cell: ({ row }: { row: { original: LogRow } }) => <Pill fg={BRAND}>{duration(seconds(row.original))}</Pill>,
    },
    {
      id: "billable",
      header: "Billable",
      size: 110,
      accessorFn: (r: LogRow) => (r.billable ? 1 : 0),
      Cell: ({ row }: { row: { original: LogRow } }) =>
        row.original.billable ? <Pill fg={SUCCESS}>Billable</Pill> : <Pill fg={C.textSecondary}>Non-billable</Pill>,
    },
    {
      accessorKey: "cost",
      header: "Cost",
      size: 100,
      Cell: ({ row }: { row: { original: LogRow } }) => (
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
      Cell: ({ row }: { row: { original: LogRow } }) => {
        const files = row.original.attachments?.length ?? 0;
        if (!row.original.description && !files) return <span style={{ color: C.textMuted }}>—</span>;
        return (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ color: C.textSecondary }}>
            {row.original.description && (
              <Tooltip title={row.original.description}>
                <Box sx={{ lineHeight: 0 }}><KTIcon iconName="note-2" className="fs-4" /></Box>
              </Tooltip>
            )}
            {files > 0 && (
              <Stack direction="row" spacing={0.25} alignItems="center">
                <KTIcon iconName="paper-clip" className="fs-4" />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{files}</span>
              </Stack>
            )}
          </Stack>
        );
      },
    },
    {
      id: "actions",
      header: "",
      size: 120,
      enableSorting: false,
      Cell: ({ row }: { row: { original: LogRow } }) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <WtIconButton title="View" onClick={() => setViewing(row.original.id)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <KTIcon iconName="eye" className="fs-6" />
          </WtIconButton>
          <WtIconButton title="Edit" onClick={() => setEditing(row.original.id)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <KTIcon iconName="pencil" className="fs-6" />
          </WtIconButton>
          <WtIconButton title="Delete" color="#C0392B" onClick={() => void remove(row.original)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <KTIcon iconName="trash" className="fs-6" />
          </WtIconButton>
        </Stack>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

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
            <WtButton tone="primary" size="small" onClick={() => setEditing(null)} startIcon={<KTIcon iconName="plus" className="fs-6" />}>
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
          <MaterialTable
            tableName="ProjectTimesheetLogs"
            employeeId={currentUserId}
            data={shown}
            columns={columns as any}
            isLoading={query.isLoading}
            hideFilters
            hideExportCenter
            enableColumnActions={false}
            enableStatusColorCoding={false}
            muiTablePaperStyle={FLUSH_PAPER}
            muiTableHeadCellStyle={FLUSH_HEAD}
            muiTableProps={{
              ...FLUSH_ROWS,
              muiTableBodyRowProps: ({ row }: { row: { original: LogRow } }) => ({
                ...FLUSH_ROWS.muiTableBodyRowProps(),
                onClick: () => setViewing(row.original.id),
              }),
            }}
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
