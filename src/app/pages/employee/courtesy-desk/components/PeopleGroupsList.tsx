import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { Archive, ArchiveRestore, Copy, Gift, Pencil, Trash2 } from "lucide-react";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import { DataTableExport } from "@/ds/patterns/data-table-export";
import { RowAction } from "@/ds/patterns/row-action";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";
import { actionsColumn } from "@app/modules/common/components/table/columns";
import {
  FilterSheet,
  FilterSheetButton,
  FormSection,
  TRIO,
  WtField,
  countActiveFilters,
  useConfirmDialog,
  usePromptDialog,
} from "@app/modules/common/components/ui";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import { canDelete } from "@utils/can";
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
  useCourtesyDesk();
  const navigate = useNavigate();
  const { ask, dialog: confirmDialog } = useConfirmDialog();
  const { askText, dialog: promptDialog } = usePromptDialog();
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

  const columns = useMemo<ColumnDef<PeopleGroup>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Group name",
        cell: ({ row }) => (
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
        cell: ({ cell }) => cell.getValue<string>() || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        cell: ({ row }) => {
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
        cell: ({ row }) => {
          const g = row.original;
          return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <RowAction
                label="Edit group"
                size="icon-sm"
                onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/groups/${g.id}`)}
              >
                <Pencil className="size-4" aria-hidden />
              </RowAction>
              <RowAction
                label="Clone group"
                size="icon-sm"
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
              >
                <Copy className="size-4" aria-hidden />
              </RowAction>
              {g.status === "ACTIVE" ? canDelete("gift-management") && (
                <RowAction
                  label="Archive group"
                  size="icon-sm"
                  tint="danger"
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
                >
                  <Archive className="size-4" aria-hidden />
                </RowAction>
              ) : (
                <>
                  <RowAction
                    label="Restore group"
                    size="icon-sm"
                    tint="success"
                    onClick={() =>
                      void unarchiveGroupToApi(g.id)
                        .then(() => toast.success("Group restored."))
                        .catch((err: unknown) =>
                          toast.error(
                            apiErrorMessage(err, "Something went wrong"),
                          ),
                        )
                    }
                  >
                    <ArchiveRestore className="size-4" aria-hidden />
                  </RowAction>
                  {canDelete("gift-management") && (
                  <RowAction
                    label={
                      (runCountByGroup.get(g.id) || 0) > 0
                        ? `Delete ${runCountByGroup.get(g.id)} linked Gift Run(s) first`
                        : "Delete group permanently"
                    }
                    size="icon-sm"
                    tint="danger"
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
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </RowAction>
                  )}
                </>
              )}
              <RowAction
                label="New gift run"
                size="icon-sm"
                onClick={() =>
                  navigate(
                    `${GIFT_MANAGEMENT_BASE}/drives?new=1&groupId=${encodeURIComponent(g.id)}`,
                  )
                }
              >
                <Gift className="size-4" aria-hidden />
              </RowAction>
            </div>
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

      <DataTable
        caption="People Groups"
        columns={columns}
        data={groups}
        getRowId={(r) => r.id}
        stateKey="Gift-Management-People-Groups"
        groupableColumns={false}
        onRowClick={(g) => navigate(`${GIFT_MANAGEMENT_BASE}/groups/${g.id}`)}
        rowLabel={(g) => g.name}
        rowTone={(g) => groupStatusColor(parseGroupStatus(g.status))}
        searchPlaceholder="Search groups…"
        toolbar={(ctx) => (
          <>
            <FilterSheetButton
              count={countActiveFilters(filters, EMPTY_FILTERS)}
              onClick={() => setFilterSheetOpen(true)}
            />
            <DataTableExport columns={columns} ctx={ctx} filename="People Groups" />
          </>
        )}
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
