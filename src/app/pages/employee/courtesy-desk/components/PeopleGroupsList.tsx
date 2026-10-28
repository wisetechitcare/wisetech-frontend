import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import { MRT_ColumnDef } from "material-react-table";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { SolidChip } from "@app/pages/billing/operations/TrackerCells";
import { actionsColumn } from "@app/modules/common/components/table/columns";
import {
  ActionIconButton,
  AppIcon,
  FilterSheet,
  FilterSheetButton,
  FormSection,
  TRIO,
  WtField,
  countActiveFilters,
  useConfirmDialog,
  usePromptDialog,
} from "@app/modules/common/components/ui";
import { T } from "@app/modules/common/components/ui/tokens";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  archiveGroupToApi,
  cloneGroupToApi,
  deleteGroupToApi,
  listDrives,
  listGroups,
  unarchiveGroupToApi,
} from "../store/courtesyDeskStore";
import type { PeopleGroup } from "../types";
import { driveGroupIds, groupStatusColor, parseGroupStatus } from "../types";

type GroupStatusScope = "ACTIVE" | "ARCHIVED" | "ALL";

// Reset lands on Active — archived groups stay out of the default list.
const EMPTY_FILTERS: { status: GroupStatusScope } = { status: "ACTIVE" };

export default function PeopleGroupsList() {
  const theme = useTheme();
  useCourtesyDesk();
  const navigate = useNavigate();
  const { ask, dialog: confirmDialog } = useConfirmDialog();
  const { askText, dialog: promptDialog } = usePromptDialog();
  const employeeId = useSelector(
    (s: RootState) => s.employee.currentEmployee?.id,
  );
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const statusScope = filters.status;
  // Re-read on every store-driven render (useCourtesyDesk above).
  const allGroups = listGroups(true);
  const drives = listDrives(true);
  const runCountByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of drives) {
      for (const gid of driveGroupIds(d)) map.set(gid, (map.get(gid) || 0) + 1);
    }
    return map;
  }, [drives]);
  const groups =
    statusScope === "ALL"
      ? allGroups
      : statusScope === "ARCHIVED"
        ? allGroups.filter((g) => parseGroupStatus(g.status) === "ARCHIVED")
        : allGroups.filter((g) => parseGroupStatus(g.status) === "ACTIVE");

  const rowStatusTint = (status: unknown) => {
    const c = groupStatusColor(parseGroupStatus(status));
    return alpha(c, theme.palette.mode === "dark" ? 0.22 : 0.12);
  };

  const columns = useMemo<MRT_ColumnDef<PeopleGroup>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Group name",
        Cell: ({ row }) => (
          <Box>
            <Typography fontWeight={700}>{row.original.name}</Typography>
            <Typography variant="caption" color="text.secondary" fontSize={11}>
              {row.original.members
                .slice(0, 3)
                .map((m) => m.fullName)
                .join(", ")}
              {row.original.members.length > 3
                ? ` +${row.original.members.length - 3}`
                : ""}
            </Typography>
          </Box>
        ),
      },
      {
        id: "peopleCount",
        header: "People",
        accessorFn: (r) => r.members.length,
        size: 80,
      },
      {
        accessorKey: "notes",
        header: "Notes",
        Cell: ({ cell }) => cell.getValue<string>() || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        Cell: ({ row }) => {
          const status = parseGroupStatus(row.original.status);
          return (
            <SolidChip
              label={status === "ACTIVE" ? "Active" : "Archived"}
              color={groupStatusColor(status)}
            />
          );
        },
      },
      actionsColumn({
        size: 168,
        Cell: ({ row }) => {
          const g = row.original;
          return (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              onClick={(e) => e.stopPropagation()}
            >
              <ActionIconButton
                iconName="pencil"
                title="Edit group"
                size="sm"
                tone="indigo"
                onClick={() =>
                  navigate(`${GIFT_MANAGEMENT_BASE}/groups/${g.id}`)
                }
              />
              <ActionIconButton
                iconName="copy"
                title="Clone group"
                size="sm"
                tone="brand"
                onClick={() => {
                  void askText({
                    title: "Clone group",
                    message: `This will create a copy of the group with the same members.`,
                    label: "Group name",
                    defaultValue: `${g.name} (copy)`,
                    confirmLabel: "Clone",
                    icon: "bi-copy",
                  }).then((name) => {
                    if (!name) return;
                    void cloneGroupToApi(g.id, name)
                      .then((cloned) => {
                        toast.success("Group cloned.");
                        navigate(`${GIFT_MANAGEMENT_BASE}/groups/${cloned.id}`);
                      })
                      .catch((err: unknown) =>
                        toast.error(
                          apiErrorMessage(err, "Something went wrong"),
                        ),
                      );
                  });
                }}
              />
              {g.status === "ACTIVE" ? (
                <ActionIconButton
                  icon={<ArchiveOutlinedIcon sx={{ fontSize: 18 }} />}
                  title="Archive group"
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    void ask({
                      variant: "delete",
                      title: "Archive group",
                      message: `Archive “${g.name}”? You can restore it later.`,
                      confirmLabel: "Archive",
                      icon: "archive",
                    }).then((ok) => {
                      if (!ok) return;
                      void archiveGroupToApi(g.id)
                        .then(() => toast.success("Group archived."))
                        .catch((err: unknown) =>
                          toast.error(
                            apiErrorMessage(err, "Something went wrong"),
                          ),
                        );
                    });
                  }}
                />
              ) : (
                <>
                  <ActionIconButton
                    icon={
                      <AppIcon
                        name="bi-arrow-counterclockwise"
                        className="fs-6"
                      />
                    }
                    title="Restore group"
                    size="sm"
                    tone="success"
                    onClick={() =>
                      void unarchiveGroupToApi(g.id)
                        .then(() => toast.success("Group restored."))
                        .catch((err: unknown) =>
                          toast.error(
                            apiErrorMessage(err, "Something went wrong"),
                          ),
                        )
                    }
                  />
                  <ActionIconButton
                    iconName="trash"
                    title={
                      (runCountByGroup.get(g.id) || 0) > 0
                        ? `Delete ${runCountByGroup.get(g.id)} linked Gift Run(s) first`
                        : "Delete group permanently"
                    }
                    size="sm"
                    tone="danger"
                    disabled={(runCountByGroup.get(g.id) || 0) > 0}
                    onClick={() => {
                      void ask({
                        variant: "delete",
                        title: "Delete group",
                        message: `Permanently delete “${g.name}”? This cannot be undone.`,
                        confirmLabel: "Delete permanently",
                        icon: "trash",
                      }).then((ok) => {
                        if (!ok) return;
                        void deleteGroupToApi(g.id)
                          .then(() => toast.success("Group deleted."))
                          .catch((err: unknown) =>
                            toast.error(
                              apiErrorMessage(err, "Something went wrong"),
                            ),
                          );
                      });
                    }}
                  />
                </>
              )}
              <ActionIconButton
                icon={<AppIcon name="bi-gift" className="fs-6" />}
                title="New gift run"
                size="sm"
                tone="brand"
                onClick={() =>
                  navigate(
                    `${GIFT_MANAGEMENT_BASE}/drives?new=1&groupId=${encodeURIComponent(g.id)}`,
                  )
                }
              />
            </Stack>
          );
        },
      }),
    ],
    [ask, askText, navigate, runCountByGroup],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {confirmDialog}
      {promptDialog}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            People Groups
          </Typography>
          <Typography color="text.secondary">
            Reusable lists — use Update Group to edit
          </Typography>
        </Box>
        <PremiumButton
          icon="bi-plus-lg"
          onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/groups/new`)}
        >
          New Group
        </PremiumButton>
      </Stack>

      <MaterialTable
        tableName="Gift-Management-People-Groups"
        columns={columns}
        data={groups}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        enableStatusColorCoding={false}
        renderToolbarIconActions={() => (
          <FilterSheetButton
            count={countActiveFilters(filters, EMPTY_FILTERS)}
            onClick={() => setFilterSheetOpen(true)}
          />
        )}
        muiTablePaperStyle={{
          borderRadius: `${T.radius.lg}px`,
          border: `1px solid ${T.color.line}`,
          boxShadow: T.shadow.card,
        }}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => {
            const status = parseGroupStatus(row.original.status);
            const base = groupStatusColor(status);
            return {
              onClick: () =>
                navigate(`${GIFT_MANAGEMENT_BASE}/groups/${row.original.id}`),
              sx: {
                cursor: "pointer",
                backgroundColor: `${rowStatusTint(status)} !important`,
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

      <FilterSheet
        open={filterSheetOpen}
        value={filters}
        empty={EMPTY_FILTERS}
        title="Filter People Groups"
        description={`${groups.length.toLocaleString()} of ${allGroups.length.toLocaleString()} groups currently shown`}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterSheetOpen(false);
        }}
      >
        {(draft, set) => (
          <FormSection
            tone={TRIO.cyan}
            icon="people"
            title="Group"
            desc="Active groups show by default; pick Archived or All to see the rest."
          >
            <WtField
              label="Status"
              value={draft.status}
              onChange={(next) => set("status", next as GroupStatusScope)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "ARCHIVED", label: "Archived" },
                { value: "ALL", label: "All" },
              ]}
              fullWidth
            />
          </FormSection>
        )}
      </FilterSheet>
    </Box>
  );
}
