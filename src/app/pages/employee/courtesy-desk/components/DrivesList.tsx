import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import { MRT_ColumnDef } from "material-react-table";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { actionsColumn } from "@app/modules/common/components/table/columns";
import {
  ActionIconButton,
  useConfirmDialog,
} from "@app/modules/common/components/ui";
import { SolidChip } from "@app/pages/billing/operations/TrackerCells";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import { listDrives, updateDriveMetaToApi } from "../store/courtesyDeskStore";
import type { CourtesyDrive } from "../types";
import {
  GIFT_RUN_LABEL,
  GIFT_RUN_LABEL_PLURAL,
  giftRunStatusColor,
  occasionLabel,
} from "../types";
import {
  DriveCreateModal,
  DriveEditModal,
  isGiftRunEditable,
} from "./DriveCreate";
import { T } from "@app/modules/common/components/ui/tokens";

export default function DrivesList() {
  const theme = useTheme();
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const { ask, dialog: confirmDialog } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDrive, setEditDrive] = useState<CourtesyDrive | null>(null);
  const [presetGroupId, setPresetGroupId] = useState<string | undefined>();
  const [occasionFilter, setOccasionFilter] = useState<"ALL" | string>("ALL");
  const [giftRunStatusFilter, setGiftRunStatusFilter] = useState<
    "ALL" | string
  >("ALL");
  const employeeId = useSelector(
    (s: RootState) => s.employee.currentEmployee?.id,
  );

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setPresetGroupId(searchParams.get("groupId") || undefined);
    setCreateOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("groupId");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openCreate = (groupId?: string) => {
    setPresetGroupId(groupId);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setPresetGroupId(undefined);
  };
  // Always include archived so the status filter can surface them.
  const drives = listDrives(true);
  const giftRunStatuses = desk.config.giftRunStatuses;
  const occasions = desk.config.occasions;

  const filteredDrives = useMemo(() => {
    return drives.filter((d) => {
      if (occasionFilter !== "ALL" && d.occasionType !== occasionFilter)
        return false;
      // "All" keeps archived out of the default list; pick "Archived" (or a
      // specific status) to see those rows.
      if (giftRunStatusFilter === "ALL") return d.status !== "ARCHIVED";
      return d.status === giftRunStatusFilter;
    });
  }, [drives, occasionFilter, giftRunStatusFilter]);

  const columns = useMemo<MRT_ColumnDef<CourtesyDrive>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        Cell: ({ cell }) => (
          <Typography fontWeight={700}>{cell.getValue<string>()}</Typography>
        ),
      },
      { accessorKey: "giftItem", header: "Gift" },
      {
        id: "occasion",
        header: "Occasion",
        accessorFn: (r) => occasionLabel(desk.config, r.occasionType),
        Cell: ({ row }) => {
          const o = desk.config.occasions.find(
            (x) => x.id === row.original.occasionType,
          );
          return (
            <SolidChip
              label={o?.name || row.original.occasionType}
              color={o?.color || "#64748b"}
            />
          );
        },
      },
      { accessorKey: "sourceGroupName", header: "Group" },
      { accessorKey: "driveDate", header: "Date", size: 110 },
      {
        id: "qty",
        header: "Total qty",
        size: 90,
        accessorFn: (r) =>
          r.recipients.reduce((sum, x) => sum + (x.quantity || 1), 0),
      },
      {
        accessorKey: "status",
        header: "Gift Run status",
        size: 150,
        Cell: ({ row }) => {
          const s = giftRunStatuses.find((x) => x.id === row.original.status);
          return (
            <SolidChip
              label={s?.name || row.original.status}
              color={s?.color || giftRunStatusColor(desk.config, row.original.status)}
            />
          );
        },
      },
      actionsColumn({
        size: 100,
        Cell: ({ row }) => {
          const d = row.original;
          const archived = d.status === "ARCHIVED";
          return (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              onClick={(e) => e.stopPropagation()}
            >
              {isGiftRunEditable(d.status) ? (
                <ActionIconButton
                  iconName="pencil"
                  title={`Edit ${GIFT_RUN_LABEL}`}
                  size="sm"
                  tone="indigo"
                  onClick={() => setEditDrive(d)}
                />
              ) : null}
              {archived ? (
                <ActionIconButton
                  icon={<UnarchiveOutlinedIcon sx={{ fontSize: 18 }} />}
                  title={`Restore ${GIFT_RUN_LABEL}`}
                  size="sm"
                  tone="success"
                  onClick={() => {
                    void ask({
                      variant: "confirm",
                      title: `Restore ${GIFT_RUN_LABEL}`,
                      message: `Are you sure you want to restore this gift run from archive?`,
                      confirmLabel: "Restore",
                      icon: "archive",
                    }).then((ok) => {
                      if (!ok) return;
                      void updateDriveMetaToApi(d.id, { status: "COMPLETED" })
                        .then(() => toast.success("Gift run restored."))
                        .catch((err: unknown) =>
                          toast.error(
                            apiErrorMessage(err, "Something went wrong"),
                          ),
                        );
                    });
                  }}
                />
              ) : (
                <ActionIconButton
                  icon={<ArchiveOutlinedIcon sx={{ fontSize: 18 }} />}
                  title={`Archive ${GIFT_RUN_LABEL}`}
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    void ask({
                      variant: "delete",
                      title: `Archive ${GIFT_RUN_LABEL}`,
                      message: `Are you sure you want to archive this gift run? You can restore it later.`,
                      confirmLabel: "Archive",
                      icon: "archive",
                    }).then((ok) => {
                      if (!ok) return;
                      void updateDriveMetaToApi(d.id, { status: "ARCHIVED" })
                        .then(() => toast.success("Gift run archived."))
                        .catch((err: unknown) =>
                          toast.error(
                            apiErrorMessage(err, "Something went wrong"),
                          ),
                        );
                    });
                  }}
                />
              )}
            </Stack>
          );
        },
      }),
    ],
    [ask, desk.config, giftRunStatuses],
  );

  const rowStatusTint = (statusId: string) => {
    const c = giftRunStatusColor(desk.config, statusId);
    return alpha(c, theme.palette.mode === "dark" ? 0.22 : 0.12);
  };

  const toolbarFilters = (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
    >
      <TextField
        select
        size="small"
        label="Occasion"
        value={occasionFilter}
        onChange={(e) => setOccasionFilter(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="ALL">All</MenuItem>
        {occasions.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            {o.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Gift Run status"
        value={giftRunStatusFilter}
        onChange={(e) => setGiftRunStatusFilter(e.target.value)}
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="ALL">All</MenuItem>
        {giftRunStatuses.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {confirmDialog}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {GIFT_RUN_LABEL_PLURAL}
          </Typography>
          <Typography color="text.secondary">
            One gift distribution per occasion — track every person, then export
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <PremiumButton icon="bi-plus-lg" onClick={() => openCreate()}>
            New {GIFT_RUN_LABEL}
          </PremiumButton>
        </Stack>
      </Stack>

      <MaterialTable
        tableName="Courtesy-Gift-Runs"
        columns={columns}
        data={filteredDrives}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        enableStatusColorCoding={false}
        renderTopToolbarRightActions={() => toolbarFilters}
        muiTablePaperStyle={{
          borderRadius: `${T.radius.lg}px`,
          border: `1px solid ${T.color.line}`,
          boxShadow: T.shadow.card,
        }}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => {
            const statusId = String(row.original.status || "");
            const base = giftRunStatusColor(desk.config, statusId);
            return {
              onClick: () =>
                navigate(`${GIFT_MANAGEMENT_BASE}/drives/${row.original.id}`),
              sx: {
                cursor: "pointer",
                backgroundColor: `${rowStatusTint(statusId)} !important`,
                "& td:first-of-type": {
                  borderLeft: `4px solid ${base} !important`,
                },
                "&:hover": {
                  backgroundColor: `${alpha(
                    base,
                    theme.palette.mode === "dark" ? 0.3 : 0.18,
                  )} !important`,
                },
              },
            };
          },
        }}
      />

      <DriveCreateModal
        open={createOpen}
        onClose={closeCreate}
        presetGroupId={presetGroupId}
      />
      <DriveEditModal
        open={!!editDrive}
        drive={editDrive}
        onClose={() => setEditDrive(null)}
      />
    </Box>
  );
}
