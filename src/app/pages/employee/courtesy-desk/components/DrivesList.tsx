import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Stack, Typography, alpha, useTheme } from "@mui/material";
import { toast } from "react-toastify";
import { MRT_ColumnDef } from "material-react-table";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { SolidChip } from "@app/pages/billing/operations/TrackerCells";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import { listDrives, updateDriveMeta } from "../store/courtesyDeskStore";
import type { ConfigOption, CourtesyDrive } from "../types";
import {
  GIFT_RUN_LABEL,
  GIFT_RUN_LABEL_PLURAL,
  giftRunStatusColor,
  occasionLabel,
} from "../types";
import SolidChipPickMenu from "./SolidChipPickMenu";
import { DriveCreateModal } from "./DriveCreate";

export default function DrivesList() {
  const theme = useTheme();
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [presetGroupId, setPresetGroupId] = useState<string | undefined>();
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
  const drives = listDrives();
  const giftRunStatuses = desk.config.giftRunStatuses;

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
        Cell: ({ row }) => (
          <SolidChipPickMenu
            valueId={row.original.status}
            heading="SET GIFT RUN STATUS"
            options={giftRunStatuses}
            onPick={(status) => {
              updateDriveMeta(row.original.id, { status });
              toast.success("Gift run status updated");
            }}
          />
        ),
      },
    ],
    [desk.config, giftRunStatuses],
  );

  const rowStatusTint = (statusId: string) => {
    const c = giftRunStatusColor(desk.config, statusId);
    return alpha(c, theme.palette.mode === "dark" ? 0.22 : 0.12);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
        <PremiumButton icon="bi-plus-lg" onClick={() => openCreate()}>
          New {GIFT_RUN_LABEL}
        </PremiumButton>
      </Stack>

      <MaterialTable
        tableName="Courtesy-Gift-Runs"
        columns={columns}
        data={drives}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => ({
            onClick: () =>
              navigate(`${GIFT_MANAGEMENT_BASE}/drives/${row.original.id}`),
            sx: {
              cursor: "pointer",
              backgroundColor: `${rowStatusTint(row.original.status)} !important`,
              "&:hover": {
                backgroundColor: `${alpha(
                  giftRunStatusColor(desk.config, row.original.status),
                  theme.palette.mode === "dark" ? 0.3 : 0.18,
                )} !important`,
              },
            },
          }),
        }}
      />

      <DriveCreateModal
        open={createOpen}
        onClose={closeCreate}
        presetGroupId={presetGroupId}
      />
    </Box>
  );
}
