import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import { MRT_ColumnDef } from "material-react-table";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { StatTile, TRIO } from "@app/modules/common/components/ui";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  applyDriveAssigneeModeToApi,
  bulkUpdateRecipientsToApi,
  getDrive,
  refreshDriveFromApi,
  updateDriveMetaToApi,
  updateRecipientToApi,
} from "../store/courtesyDeskStore";
import type {
  ConfigOption,
  CourtesyRecipient,
  DeliveryMode,
  SkippedReason,
} from "../types";
import { GIFT_RUN_LABEL, deliveryStatusColor, occasionLabel } from "../types";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { MemberTypeChip, PersonAvatar } from "./PersonPicker";
import SolidChipPickMenu from "./SolidChipPickMenu";

const SKIP_REASON_OPTIONS: ConfigOption[] = [
  { id: "REFUSED", name: "Refused", color: "#dc2626" },
  { id: "NOT_AVAILABLE", name: "Not available", color: "#ea580c" },
  { id: "DO_NOT_GIFT", name: "Do not gift", color: "#64748b" },
];

type AssigneeOpt = { id: string; name: string; avatarUrl?: string };

function AssigneeSelect({
  value,
  options,
  onChange,
  disabled,
  minWidth = 140,
  label,
  helperText,
}: {
  value: string;
  options: AssigneeOpt[];
  onChange: (id: string) => void;
  disabled?: boolean;
  minWidth?: number;
  label?: string;
  helperText?: string;
}) {
  const labelFor = (id: string) => options.find((o) => o.id === id);

  return (
    <TextField
      select
      size="small"
      label={label}
      helperText={helperText}
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth }}
      SelectProps={{
        renderValue: (id) => {
          const a = labelFor(String(id));
          if (!a?.id) return "—";
          return (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <PersonAvatar
                person={{ fullName: a.name, avatarUrl: a.avatarUrl }}
                size={22}
              />
              <Typography variant="body2" noWrap>
                {a.name}
              </Typography>
            </Stack>
          );
        },
      }}
    >
      <MenuItem value="">—</MenuItem>
      {options.map((a) => (
        <MenuItem key={a.id} value={a.id}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonAvatar
              person={{ fullName: a.name, avatarUrl: a.avatarUrl }}
              size={28}
            />
            <Typography variant="body2">{a.name}</Typography>
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}

export default function DriveDetail() {
  const theme = useTheme();
  const desk = useCourtesyDesk();
  const { driveId } = useParams<{ driveId: string }>();
  const drive = driveId ? getDrive(driveId) : undefined;
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.allEmployees.list);
  const employeeId = useSelector(
    (s: RootState) => s.employee.currentEmployee?.id,
  );

  const [statusFilter, setStatusFilter] = useState<"ALL" | string>("ALL");
  const deliveryStatuses = desk.config.deliveryStatuses;
  const giftRunStatuses = desk.config.giftRunStatuses;
  const deliveryModes = desk.config.deliveryModes;
  const [sourceFilter, setSourceFilter] = useState<
    "ALL" | "CONTACT" | "EMPLOYEE"
  >("ALL");
  const [areaFilter, setAreaFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState<CourtesyRecipient[]>([]);
  const [selectionAssigneeId, setSelectionAssigneeId] = useState("");
  const [tableSelectionReset, setTableSelectionReset] = useState(0);

  const selectedRowIdsKey = useMemo(
    () =>
      selectedRows
        .map((r) => r.id)
        .sort()
        .join("|"),
    [selectedRows],
  );

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    if (driveId) void refreshDriveFromApi(driveId);
  }, [driveId]);

  // New row selection = fresh assignee pick (don't carry over the last batch's employee).
  useEffect(() => {
    setSelectionAssigneeId("");
  }, [selectedRowIdsKey]);

  const areas = useMemo(() => {
    if (!drive) return [];
    return Array.from(
      new Set(drive.recipients.map((r) => r.area).filter(Boolean) as string[]),
    ).sort();
  }, [drive]);

  const runStats = useMemo(() => {
    if (!drive) return null;
    const recipients = drive.recipients;
    const total = recipients.length;
    const delivered = recipients.filter((r) => r.status === "DELIVERED").length;
    const pending = recipients.filter((r) => r.status === "PENDING").length;
    const out = recipients.filter((r) => r.status === "OUT").length;
    const skipped = recipients.filter((r) => r.status === "SKIPPED").length;
    return { total, delivered, pending, out, skipped };
  }, [drive]);

  const statusOverview = useMemo(() => {
    if (!drive) return [];
    const counts = new Map<string, number>();
    deliveryStatuses.forEach((s: ConfigOption) => counts.set(s.id, 0));
    drive.recipients.forEach((r) => {
      counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    });
    return deliveryStatuses.map((s: ConfigOption) => ({
      ...s,
      count: counts.get(s.id) ?? 0,
    }));
  }, [drive, deliveryStatuses]);

  const rowStatusTint = (statusId: string) => {
    const c = deliveryStatusColor(desk.config, statusId);
    return alpha(c, theme.palette.mode === "dark" ? 0.22 : 0.12);
  };

  const rows = useMemo(() => {
    if (!drive) return [];
    return drive.recipients.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && r.memberType !== sourceFilter) return false;
      if (areaFilter && (r.area || "") !== areaFilter) return false;
      return true;
    });
  }, [drive, statusFilter, sourceFilter, areaFilter]);

  const employeeAvatarById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => {
      if (e.avatar) m.set(String(e.employeeId), e.avatar);
    });
    return m;
  }, [employees]);

  const assigneeOptions = useMemo<AssigneeOpt[]>(
    () =>
      employees.slice(0, 40).map((e) => ({
        id: String(e.employeeId),
        name: e.employeeName || "Unnamed",
        avatarUrl: e.avatar || employeeAvatarById.get(String(e.employeeId)),
      })),
    [employees, employeeAvatarById],
  );

  const patchRecipient = (
    recipientId: string,
    patch: Parameters<typeof updateRecipientToApi>[2],
  ) => {
    if (!driveId) return;
    void updateRecipientToApi(driveId, recipientId, patch).catch((err: unknown) =>
      toast.error(apiErrorMessage(err, "Something went wrong")),
    );
  };

  const columns = useMemo<MRT_ColumnDef<CourtesyRecipient>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Person",
        Cell: ({ row }) => {
          const r = row.original;
          const href =
            r.memberType === "CONTACT"
              ? `/contacts/${r.personId}`
              : `/employees/${r.personId}`;
          const isDemo = r.personId.startsWith("demo_");
          const avatarUrl =
            r.avatarUrl ||
            (r.memberType === "EMPLOYEE"
              ? employeeAvatarById.get(r.personId)
              : undefined);
          const nameEl = isDemo ? (
            <Typography fontWeight={600} variant="body2" noWrap>
              {r.fullName}
            </Typography>
          ) : (
            <Link
              component={RouterLink}
              to={href}
              fontWeight={600}
              variant="body2"
              onClick={(e) => e.stopPropagation()}
              sx={{ display: "block" }}
              noWrap
            >
              {r.fullName}
            </Link>
          );
          return (
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <PersonAvatar
                person={{ fullName: r.fullName, avatarUrl }}
                size={34}
              />
              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  {nameEl}
                  <MemberTypeChip memberType={r.memberType} />
                </Stack>
              </Box>
            </Stack>
          );
        },
      },
      {
        accessorKey: "companyName",
        header: "Company",
        Cell: ({ cell }) => cell.getValue<string>() || "—",
      },
      {
        id: "areaAddress",
        header: "Area / Address",
        accessorFn: (r) =>
          [r.area, r.address].filter(Boolean).join(" · ") || "—",
      },
      {
        accessorKey: "phone",
        header: "Phone",
        size: 120,
        Cell: ({ cell }) => cell.getValue<string>() || "—",
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        size: 90,
        Cell: ({ row }) => (
          <TextField
            type="number"
            size="small"
            inputProps={{ min: 1, step: 1 }}
            value={row.original.quantity ?? 1}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1);
              patchRecipient(row.original.id, { quantity: n });
            }}
            sx={{ width: 80 }}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Delivery status",
        size: 140,
        Cell: ({ row }) => (
          <SolidChipPickMenu
            valueId={row.original.status}
            heading="SET STATUS"
            options={deliveryStatuses}
            onPick={(status) =>
              patchRecipient(row.original.id, {
                status,
                skippedReason:
                  status === "SKIPPED"
                    ? row.original.skippedReason || "REFUSED"
                    : "",
              })
            }
          />
        ),
      },
      {
        accessorKey: "mode",
        header: "Mode",
        size: 130,
        Cell: ({ row }) => (
          <SolidChipPickMenu
            valueId={row.original.mode}
            heading="SET MODE"
            options={deliveryModes}
            onPick={(mode) => {
              if (mode === "IN_PERSON" && !row.original.assigneeName) {
                const id =
                  drive?.defaultAssigneeEmployeeId ||
                  assigneeOptions[0]?.id ||
                  "";
                patchRecipient(row.original.id, {
                  mode: mode as DeliveryMode,
                  assigneeEmployeeId: id || undefined,
                  assigneeName:
                    assigneeOptions.find((a) => a.id === id)?.name ||
                    drive?.defaultAssigneeName ||
                    undefined,
                });
                return;
              }
              patchRecipient(row.original.id, {
                mode: mode as DeliveryMode,
              });
            }}
          />
        ),
      },
      {
        accessorKey: "assigneeName",
        header: "Assignee",
        size: 150,
        Cell: ({ row }) => (
          <AssigneeSelect
            value={row.original.assigneeEmployeeId || ""}
            options={assigneeOptions}
            disabled={row.original.mode !== "IN_PERSON"}
            onChange={(id) => {
              const found = assigneeOptions.find((a) => a.id === id);
              patchRecipient(row.original.id, {
                assigneeEmployeeId: id,
                assigneeName: found?.name || "",
              });
            }}
          />
        ),
      },
      {
        accessorKey: "remark",
        header: "Remark",
        Cell: ({ row }) => (
          <TextField
            size="small"
            placeholder="Optional"
            value={row.original.remark || ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              patchRecipient(row.original.id, {
                remark: e.target.value,
              })
            }
            sx={{ minWidth: 140 }}
          />
        ),
      },
      {
        id: "skipped",
        header: "Skip reason",
        size: 130,
        Cell: ({ row }) =>
          row.original.status === "SKIPPED" ? (
            <SolidChipPickMenu
              valueId={row.original.skippedReason || "REFUSED"}
              heading="SET REASON"
              options={SKIP_REASON_OPTIONS}
              onPick={(id) =>
                patchRecipient(row.original.id, {
                  skippedReason: id as SkippedReason,
                })
              }
            />
          ) : (
            "—"
          ),
      },
    ],
    [
      assigneeOptions,
      deliveryModes,
      deliveryStatuses,
      desk.config,
      drive,
      driveId,
      employeeAvatarById,
    ],
  );

  if (!drive) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">{GIFT_RUN_LABEL} not found.</Alert>
        <Button
          sx={{ mt: 2 }}
          startIcon={<AppIcon name="bi-arrow-left" />}
          onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/drives`)}
        >
          Back
        </Button>
      </Box>
    );
  }

  const wholeMode =
    drive.defaultMode === "MIXED" ? "MIXED" : drive.defaultMode || "IN_PERSON";
  const wholeAssignee = drive.defaultAssigneeEmployeeId || "";

  const toastApiErr = (err: unknown) =>
    toast.error(apiErrorMessage(err, "Something went wrong"));

  const applyWholeAssignee = (assigneeId: string) => {
    if (!assigneeId) {
      void updateDriveMetaToApi(drive.id, {
        defaultAssigneeEmployeeId: "",
        defaultAssigneeName: "",
      }).catch((err: unknown) => toastApiErr(err));
      return;
    }
    const found = assigneeOptions.find((a) => a.id === assigneeId);
    void applyDriveAssigneeModeToApi(drive.id, {
      assigneeEmployeeId: assigneeId,
      assigneeName: found?.name || "",
      mode: "IN_PERSON",
    })
      .then(() =>
        toast.success(`Assigned ${found?.name || "person"} to all (In Person).`),
      )
      .catch((err: unknown) => toastApiErr(err));
  };

  const applyWholeMode = (mode: DeliveryMode | "MIXED") => {
    if (mode === "MIXED") return;
    if (mode === "COURIER") {
      void applyDriveAssigneeModeToApi(drive.id, { mode: "COURIER" })
        .then(() => toast.success("Mode set to Courier for all."))
        .catch((err: unknown) => toastApiErr(err));
      return;
    }
    const id = drive.defaultAssigneeEmployeeId || assigneeOptions[0]?.id;
    const found = assigneeOptions.find((a) => a.id === id);
    void applyDriveAssigneeModeToApi(drive.id, {
      mode: "IN_PERSON",
      assigneeEmployeeId: id,
      assigneeName: found?.name || "",
    })
      .then(() => toast.success("Mode set to In Person for all."))
      .catch((err: unknown) => toastApiErr(err));
  };

  const assignRecipients = (recipientIds: string[], assigneeId: string) => {
    if (!assigneeId) return;
    const found = assigneeOptions.find((a) => a.id === assigneeId);
    void bulkUpdateRecipientsToApi(drive.id, recipientIds, {
      mode: "IN_PERSON",
      assigneeEmployeeId: assigneeId,
      assigneeName: found?.name || "",
    })
      .then(() =>
        toast.success(
          `Assigned ${recipientIds.length} to ${found?.name || "employee"}.`,
        ),
      )
      .catch((err: unknown) => toastApiErr(err));
  };

  const assignToSelected = () => {
    if (!selectedRows.length) return;
    if (!selectionAssigneeId) {
      toast.warning("Choose an assignee for the selected rows.");
      return;
    }
    assignRecipients(
      selectedRows.map((r) => r.id),
      selectionAssigneeId,
    );
    setSelectedRows([]);
    setSelectionAssigneeId("");
    setTableSelectionReset((n) => n + 1);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Button
        size="small"
        variant="text"
        startIcon={<AppIcon name="bi-arrow-left" />}
        onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/drives`)}
        sx={{ mb: 1, alignSelf: "flex-start", px: 0 }}
      >
        Back to Gift Runs
      </Button>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 0.5 }}
          >
            <Typography variant="h5" fontWeight={700}>
              {drive.title}
            </Typography>
            <Stack
              direction="row"
              alignItems="flex-end"
              spacing={0.75}
              useFlexGap
            >
              <SolidChipPickMenu
                valueId={drive.status}
                heading="SET GIFT RUN STATUS"
                options={giftRunStatuses}
                onPick={(status) => {
                  void updateDriveMetaToApi(drive.id, { status })
                    .then(() => toast.success("Gift run status updated"))
                    .catch((err: unknown) =>
                      toastApiErr(err),
                    );
                }}
              />
            </Stack>
          </Stack>
          <Typography variant="h6" fontWeight={700} color="text.secondary">
            Group:{" "}
            <Link
              component={RouterLink}
              to={`${GIFT_MANAGEMENT_BASE}/groups/${drive.sourceGroupId}`}
              onClick={(e) => e.stopPropagation()}
            >
              {drive.sourceGroupName}
            </Link>
          </Typography>
        </Box>
      </Paper>

      {runStats && (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "repeat(3, 1fr)",
              lg: "repeat(5, 1fr)",
            },
            mb: 2,
          }}
        >
          <StatTile
            label="Recipients"
            value={String(runStats.total)}
            trio={TRIO.purple}
            icon="people"
          />
          <StatTile
            label="Pending"
            value={String(runStats.pending)}
            trio={TRIO.amber}
            icon="time"
          />
          <StatTile
            label="Out"
            value={String(runStats.out)}
            trio={TRIO.cyan}
            icon="delivery"
          />
          <StatTile
            label="Delivered"
            value={String(runStats.delivered)}
            trio={TRIO.green}
            icon="check-circle"
          />
          <StatTile
            label="Skipped"
            value={String(runStats.skipped)}
            trio={TRIO.slate}
            icon="cross-circle"
          />
        </Box>
      )}

      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          Assign for whole {GIFT_RUN_LABEL}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mb: 1.5 }}
        >
          Per person: use the Assignee column in the table. Select rows for a
          batch assignee (below or in the table toolbar).
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "flex-end" }}
        >
          <AssigneeSelect
            label="Assignee (all)"
            value={wholeAssignee}
            options={assigneeOptions}
            minWidth={180}
            onChange={(id) => applyWholeAssignee(id)}
          />
          <TextField
            select
            size="small"
            label="Mode (all)"
            value={wholeMode}
            onChange={(e) =>
              applyWholeMode(e.target.value as DeliveryMode | "MIXED")
            }
            sx={{ minWidth: 180 }}
            helperText={
              wholeMode === "MIXED" ? "Mixed — edit per row" : undefined
            }
          >
            {wholeMode === "MIXED" && <MenuItem value="MIXED">Mixed</MenuItem>}
            {deliveryModes.map((m: ConfigOption) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {selectedRows.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ mt: 2.5, mb: 1.5 }}
            >
              Assign selected ({selectedRows.length})
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ sm: "flex-end" }}
            >
              <AssigneeSelect
                label="Assignee for selection"
                value={selectionAssigneeId}
                options={assigneeOptions}
                minWidth={220}
                onChange={setSelectionAssigneeId}
              />
              <Button
                size="small"
                variant="contained"
                disabled={!selectionAssigneeId}
                onClick={assignToSelected}
              >
                Assign to selected
              </Button>
            </Stack>
          </>
        )}
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        sx={{ mb: 2 }}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
      >
        <TextField
          select
          size="small"
          label="Delivery status filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All</MenuItem>
          {deliveryStatuses.map((s: ConfigOption) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Source"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="ALL">All sources</MenuItem>
          <MenuItem value="CONTACT">Contact</MenuItem>
          <MenuItem value="EMPLOYEE">Employee</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Area"
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">All areas</MenuItem>
          {areas.map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <MaterialTable
        key={`Courtesy-Gift-Run-Recipients-${tableSelectionReset}`}
        tableName="Courtesy-Gift-Run-Recipients"
        columns={columns}
        data={rows}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        enableRowSelection
        onSelectedRowsChange={setSelectedRows}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => ({
            sx: {
              backgroundColor: `${rowStatusTint(row.original.status)} !important`,
              "&:hover": {
                backgroundColor: `${alpha(
                  deliveryStatusColor(desk.config, row.original.status),
                  theme.palette.mode === "dark" ? 0.3 : 0.18,
                )} !important`,
              },
            },
          }),
        }}
      />
    </Box>
  );
}
