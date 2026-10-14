import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import {
  AvatarOption,
  AvatarSingleValue,
} from "@app/modules/common/inputs/ColorInDropdwon";
import { WtSelect } from "@app/modules/common/components/ui/WtSelect";
import { apiErrorMessage } from "@utils/apiError";
import { MRT_ColumnDef } from "material-react-table";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { fetchAllEmployeesSelectedData } from "@services/employee";
import { getClientContactById } from "@services/companies";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import {
  ActionIconButton,
  StatTile,
  TRIO,
} from "@app/modules/common/components/ui";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  addPeopleToDriveToApi,
  applyDriveAssigneeModeToApi,
  bulkUpdateRecipientsToApi,
  getDrive,
  refreshDriveFromApi,
  removePeopleFromDriveToApi,
  updateDriveMetaToApi,
  updateRecipientToApi,
} from "../store/courtesyDeskStore";
import type {
  ConfigOption,
  CourtesyRecipient,
  DeliveryMode,
  PersonRef,
  SkippedReason,
} from "../types";
import { GIFT_RUN_LABEL, deliveryStatusColor, occasionLabel } from "../types";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import PersonPicker, {
  MemberTypeChip,
  PersonAvatar,
  courtesyDeskAssigneeOptions,
} from "./PersonPicker";
import SolidChipPickMenu from "./SolidChipPickMenu";

const SKIP_REASON_OPTIONS: ConfigOption[] = [
  { id: "REFUSED", name: "Refused", color: "#dc2626" },
  { id: "NOT_AVAILABLE", name: "Not available", color: "#ea580c" },
  { id: "DO_NOT_GIFT", name: "Do not gift", color: "#64748b" },
];

type PersonProfile = { gender?: string; designation?: string };

function employeeGenderLabel(g: unknown): string {
  const n = Number(g);
  if (Number.isNaN(n)) return "—";
  if (n === 0) return "Male";
  if (n === 1) return "Female";
  if (n === 2) return "Other";
  return "—";
}

function contactGenderLabel(g: unknown): string {
  if (!g || typeof g !== "string") return "—";
  const labels: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    UNSPECIFIED: "Not specified",
  };
  return labels[g] || g;
}

type AssigneeOpt = { id: string; name: string; avatarUrl?: string };

const ASSIGNEE_FIELD_WIDTH = 180;

/** MUI TextField-sized assignee picker — type in the field to search; list scrolls inside 240px. */
function AssigneeFieldSelect({
  label,
  value,
  onChange,
  options,
  fallbackName,
  tableCell,
}: {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  options: AssigneeOpt[];
  fallbackName?: string;
  tableCell?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const valueOpt = useMemo((): AssigneeOpt | null => {
    const found = options.find((o) => o.id === value);
    if (found) return found;
    if (value && fallbackName) {
      return { id: value, name: fallbackName };
    }
    return null;
  }, [fallbackName, options, value]);

  const stopRow = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <Autocomplete
      size="small"
      options={options}
      value={valueOpt}
      open={menuOpen}
      onOpen={() => setMenuOpen(true)}
      onClose={() => setMenuOpen(false)}
      onChange={(_, opt) => onChange(opt?.id ?? "")}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      selectOnFocus
      clearOnBlur={false}
      filterOptions={(opts, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q) return opts;
        return opts.filter((o) => o.name.toLowerCase().includes(q));
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <PersonAvatar
              person={{ fullName: option.name, avatarUrl: option.avatarUrl }}
              size={28}
            />
            <Typography variant="body2" noWrap>
              {option.name}
            </Typography>
          </Stack>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="—"
          onClick={tableCell ? stopRow : undefined}
          onMouseDown={tableCell ? stopRow : undefined}
          InputProps={{
            ...params.InputProps,
            startAdornment:
              valueOpt && !menuOpen ? (
                <>
                  <PersonAvatar
                    person={{
                      fullName: valueOpt.name,
                      avatarUrl: valueOpt.avatarUrl,
                    }}
                    size={24}
                  />
                  {params.InputProps.startAdornment}
                </>
              ) : (
                params.InputProps.startAdornment
              ),
          }}
          sx={{
            "& .MuiInputBase-input": {
              minWidth: menuOpen ? 48 : undefined,
            },
          }}
        />
      )}
      ListboxProps={{ style: { maxHeight: 240 } }}
      sx={{
        minWidth: ASSIGNEE_FIELD_WIDTH,
        width: tableCell ? "100%" : ASSIGNEE_FIELD_WIDTH,
      }}
    />
  );
}

/** Same react-select engine as Lead Wizard `DropDownInput` (WtSelect + avatar rows). */
function AssigneeSelect({
  value,
  options,
  onChange,
  disabled,
  // minWidth = 140,
  label,
  helperText,
  fallbackLabel,
}: {
  value: string;
  options: AssigneeOpt[];
  onChange: (id: string) => void;
  disabled?: boolean;
  minWidth?: number;
  label?: string;
  helperText?: string;
  /** Shown when `value` is set but not in `options` (e.g. former assignee). */
  fallbackLabel?: string;
}) {
  const wtOptions = useMemo(
    () =>
      sortOptionsAlphabetically(
        options.map((o) => ({
          value: o.id,
          label: o.name,
          avatar: o.avatarUrl || null,
        })),
      ),
    [options],
  );

  const selectedValue = useMemo(() => {
    if (!value) return null;
    const found = wtOptions.find((o) => o.value === value);
    if (found) return found;
    if (fallbackLabel) {
      return { value, label: fallbackLabel, avatar: null };
    }
    return null;
  }, [fallbackLabel, value, wtOptions]);

  const stopRowClick = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <Box onClick={stopRowClick} onMouseDown={stopRowClick}>
      {label ? (
        <Box
          component="label"
          sx={{
            display: "block",
            mb: 0.5,
            fontSize: 13.5,
            fontWeight: 500,
            color: "text.primary",
          }}
        >
          {label}
        </Box>
      ) : null}
      <WtSelect
        size="sm"
        ariaLabel={label || "Assignee"}
        options={wtOptions}
        value={selectedValue}
        onChange={(opt: { value?: string } | null) =>
          onChange(opt?.value ?? "")
        }
        isClearable
        isSearchable
        isDisabled={disabled}
        allowValueWrap
        placeholder="—"
        components={{
          Option: AvatarOption,
          SingleValue: AvatarSingleValue,
        }}
      />
      {helperText ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block" }}
        >
          {helperText}
        </Typography>
      ) : null}
    </Box>
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
  const [genderFilter, setGenderFilter] = useState<"ALL" | string>("ALL");
  const [designationFilter, setDesignationFilter] = useState<"ALL" | string>(
    "ALL",
  );
  const [modeFilter, setModeFilter] = useState<"ALL" | string>("ALL");
  const [selectedRows, setSelectedRows] = useState<CourtesyRecipient[]>([]);
  const [selectionAssigneeId, setSelectionAssigneeId] = useState("");
  const [selectionStatus, setSelectionStatus] = useState("");
  const [selectionQty, setSelectionQty] = useState("");
  const [selectionMode, setSelectionMode] = useState("");
  const [selectionRemark, setSelectionRemark] = useState("");
  const [selectionSkipReason, setSelectionSkipReason] = useState("");
  const [tableSelectionReset, setTableSelectionReset] = useState(0);
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [pickerPeople, setPickerPeople] = useState<PersonRef[]>([]);
  const [addingPeople, setAddingPeople] = useState(false);
  const [employeeProfiles, setEmployeeProfiles] = useState(
    () => new Map<string, PersonProfile>(),
  );
  const [contactProfiles, setContactProfiles] = useState(
    () => new Map<string, PersonProfile>(),
  );

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

  useEffect(() => {
    let cancelled = false;
    void fetchAllEmployeesSelectedData()
      .then((res) => {
        if (cancelled) return;
        const map = new Map<string, PersonProfile>();
        for (const e of res?.data?.employees ?? []) {
          map.set(String(e.id), {
            gender: employeeGenderLabel(e.gender),
            designation: e.designations?.role?.trim() || undefined,
          });
        }
        setEmployeeProfiles(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!drive) return;
    const ids = [
      ...new Set(
        drive.recipients
          .filter((r) => r.memberType === "CONTACT")
          .map((r) => r.personId),
      ),
    ];
    if (!ids.length) {
      setContactProfiles(new Map());
      return;
    }
    let cancelled = false;
    void Promise.all(
      ids.map(async (id) => {
        try {
          const res = await getClientContactById(id);
          const c =
            (res as { data?: { contact?: Record<string, unknown> } })?.data
              ?.contact ??
            (res as { contact?: Record<string, unknown> })?.contact ??
            (res as { data?: Record<string, unknown> })?.data ??
            res;
          const row = c as Record<string, unknown>;
          const role = row.contactRole as { name?: string } | undefined;
          return {
            id,
            gender: contactGenderLabel(row.gender),
            designation:
              (typeof row.roleInCompany === "string" &&
                row.roleInCompany.trim()) ||
              role?.name?.trim() ||
              undefined,
          };
        } catch {
          return { id, gender: "—", designation: undefined };
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const map = new Map<string, PersonProfile>();
      for (const r of rows) {
        map.set(r.id, { gender: r.gender, designation: r.designation });
      }
      setContactProfiles(map);
    });
    return () => {
      cancelled = true;
    };
  }, [drive?.id, drive?.recipients]);

  const getProfileFor = useCallback(
    (r: CourtesyRecipient): PersonProfile => {
      const map =
        r.memberType === "EMPLOYEE" ? employeeProfiles : contactProfiles;
      return map.get(r.personId) ?? {};
    },
    [employeeProfiles, contactProfiles],
  );

  const recipientGender = useCallback(
    (r: CourtesyRecipient) => getProfileFor(r).gender ?? "—",
    [getProfileFor],
  );

  const recipientDesignation = useCallback(
    (r: CourtesyRecipient) => getProfileFor(r).designation?.trim() || "—",
    [getProfileFor],
  );

  const genderFilterOptions = useMemo(() => {
    if (!drive) return [];
    return Array.from(
      new Set(drive.recipients.map((r) => recipientGender(r))),
    ).sort((a, b) => a.localeCompare(b));
  }, [drive, recipientGender]);

  const designationFilterOptions = useMemo(() => {
    if (!drive) return [];
    return Array.from(
      new Set(drive.recipients.map((r) => recipientDesignation(r))),
    ).sort((a, b) => a.localeCompare(b));
  }, [drive, recipientDesignation]);

  // New row selection = fresh assignee pick (don't carry over the last batch's employee).
  useEffect(() => {
    setSelectionAssigneeId("");
    setSelectionStatus("");
    setSelectionQty("");
    setSelectionMode("");
    setSelectionRemark("");
    setSelectionSkipReason("");
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

  const tableRows = useMemo(() => {
    if (!drive) return [];
    return drive.recipients.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && r.memberType !== sourceFilter) return false;
      if (areaFilter && (r.area || "") !== areaFilter) return false;
      if (genderFilter !== "ALL" && recipientGender(r) !== genderFilter)
        return false;
      if (
        designationFilter !== "ALL" &&
        recipientDesignation(r) !== designationFilter
      )
        return false;
      if (modeFilter !== "ALL" && r.mode !== modeFilter) return false;
      return true;
    });
  }, [
    drive,
    statusFilter,
    sourceFilter,
    areaFilter,
    genderFilter,
    designationFilter,
    modeFilter,
    recipientGender,
    recipientDesignation,
  ]);

  const existingPersonKeys = useMemo(() => {
    if (!drive) return new Set<string>();
    return new Set(
      drive.recipients.map((r) => `${r.memberType}:${r.personId}`),
    );
  }, [drive]);

  const employeeAvatarById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => {
      if (e.avatar) m.set(String(e.employeeId), e.avatar);
    });
    return m;
  }, [employees]);

  const assigneeOptions = useMemo<AssigneeOpt[]>(
    () => courtesyDeskAssigneeOptions(employees),
    [employees],
  );

  const toastApiErr = (err: unknown) =>
    toast.error(apiErrorMessage(err, "Something went wrong"));

  const patchRecipient = (
    recipientId: string,
    patch: Parameters<typeof updateRecipientToApi>[2],
  ) => {
    if (!driveId) return;
    void updateRecipientToApi(driveId, recipientId, patch).catch(toastApiErr);
  };

  const columns = useMemo<MRT_ColumnDef<CourtesyRecipient>[]>(() => {
    return [
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
                  {(r.rosterSource ?? "GROUP") === "DRIVE_ONLY" && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        px: 0.75,
                        py: 0.1,
                        borderRadius: 1,
                        bgcolor: "action.selected",
                        fontWeight: 700,
                        fontSize: 10,
                      }}
                    >
                      Gift only
                    </Typography>
                  )}
                </Stack>
              </Box>
              {(r.rosterSource ?? "GROUP") === "DRIVE_ONLY" && (
                <Box sx={{ ml: "auto", flexShrink: 0 }}>
                  <ActionIconButton
                    iconName="trash"
                    title="Remove from this Gift Run"
                    tone="danger"
                    size="sm"
                    onClick={() => {
                      if (!driveId) return;
                      void removePeopleFromDriveToApi(driveId, [r.id])
                        .then(() => toast.success("Removed from Gift Run."))
                        .catch((err: unknown) => toastApiErr(err));
                    }}
                  />
                </Box>
              )}
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
        id: "gender",
        header: "Gender",
        size: 100,
        accessorFn: (r) => recipientGender(r),
        Cell: ({ row }) => recipientGender(row.original),
      },
      {
        id: "designation",
        header: "Designation",
        size: 150,
        accessorFn: (r) => recipientDesignation(r),
        Cell: ({ row }) => recipientDesignation(row.original),
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
        size: 290,
        grow: 1,
        muiTableBodyCellProps: {
          sx: {
            whiteSpace: "normal",
            overflow: "visible",
            verticalAlign: "top",
          },
        },
        Cell: ({ row }) => (
          <AssigneeFieldSelect
            tableCell
            value={row.original.assigneeEmployeeId || ""}
            fallbackName={row.original.assigneeName}
            options={assigneeOptions}
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
    ];
  }, [
    assigneeOptions,
    deliveryModes,
    deliveryStatuses,
    desk.config,
    drive,
    driveId,
    employeeAvatarById,
    recipientDesignation,
    recipientGender,
  ]);

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

  /** UI sentinel when recipients disagree — stored on drive as MIXED. */
  const wholeModeSelectValue =
    drive.defaultMode === "MIXED" ? "ALL" : drive.defaultMode || "IN_PERSON";
  const wholeAssignee = drive.defaultAssigneeEmployeeId || "";

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
        toast.success(
          `Assigned ${found?.name || "person"} to all (In Person).`,
        ),
      )
      .catch((err: unknown) => toastApiErr(err));
  };

  const applyWholeMode = (mode: DeliveryMode | "ALL") => {
    if (mode === "ALL") return;
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

  const applyFieldsToSelected = () => {
    if (!selectedRows.length || !driveId) return;
    const patch: Parameters<typeof bulkUpdateRecipientsToApi>[2] = {};
    if (selectionStatus) {
      patch.status = selectionStatus;
      if (selectionStatus === "SKIPPED") {
        patch.skippedReason = (selectionSkipReason ||
          "REFUSED") as SkippedReason;
      } else {
        patch.skippedReason = "";
      }
    }
    if (selectionQty) {
      const n = Math.max(1, Number(selectionQty) || 1);
      patch.quantity = n;
    }
    if (selectionMode) {
      patch.mode = selectionMode as DeliveryMode;
    }
    if (selectionAssigneeId) {
      const found = assigneeOptions.find((a) => a.id === selectionAssigneeId);
      patch.assigneeEmployeeId = selectionAssigneeId;
      patch.assigneeName = found?.name || "";
    }
    if (selectionRemark.trim()) patch.remark = selectionRemark.trim();
    if (!Object.keys(patch).length) {
      toast.warning("Choose at least one field to update.");
      return;
    }
    void bulkUpdateRecipientsToApi(
      driveId,
      selectedRows.map((r) => r.id),
      patch,
    )
      .then(() => {
        toast.success(`Updated ${selectedRows.length} recipient(s).`);
        setSelectedRows([]);
        setTableSelectionReset((n) => n + 1);
      })
      .catch(toastApiErr);
  };

  const removeSelectedFromRun = () => {
    if (!driveId || !selectedRows.length) return;
    const ids = selectedRows
      .filter((r) => (r.rosterSource ?? "GROUP") === "DRIVE_ONLY")
      .map((r) => r.id);
    if (!ids.length) {
      toast.warning(
        "Only people added on this Gift Run can be removed here. Change the People Group to remove group members.",
      );
      return;
    }
    void removePeopleFromDriveToApi(driveId, ids)
      .then(() => {
        toast.success(`Removed ${ids.length} from Gift Run.`);
        setSelectedRows([]);
        setTableSelectionReset((n) => n + 1);
      })
      .catch(toastApiErr);
  };

  const openAddPeople = () => {
    setPickerPeople([]);
    setAddPeopleOpen(true);
  };

  const confirmAddPeople = () => {
    if (!driveId) return;
    const toAdd = pickerPeople.filter(
      (p) => !existingPersonKeys.has(`${p.memberType}:${p.personId}`),
    );
    if (!toAdd.length) {
      toast.warning("No new people selected.");
      return;
    }
    setAddingPeople(true);
    void addPeopleToDriveToApi(driveId, toAdd)
      .then(() => {
        toast.success(
          `Added ${toAdd.length} to Gift Run (not added to group).`,
        );
        setAddPeopleOpen(false);
        setPickerPeople([]);
      })
      .catch(toastApiErr)
      .finally(() => setAddingPeople(false));
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
        label="Delivery Status"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        sx={{ minWidth: 130 }}
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
        onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="ALL">All</MenuItem>
        <MenuItem value="CONTACT">Contact</MenuItem>
        <MenuItem value="EMPLOYEE">Employee</MenuItem>
      </TextField>
      <TextField
        select
        size="small"
        label="Gender"
        value={genderFilter}
        onChange={(e) => setGenderFilter(e.target.value)}
        sx={{ minWidth: 110 }}
      >
        <MenuItem value="ALL">All</MenuItem>
        {genderFilterOptions.map((g) => (
          <MenuItem key={g} value={g}>
            {g}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Designation"
        value={designationFilter}
        onChange={(e) => setDesignationFilter(e.target.value)}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="ALL">All</MenuItem>
        {designationFilterOptions.map((d) => (
          <MenuItem key={d} value={d}>
            {d}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Mode"
        value={modeFilter}
        onChange={(e) => setModeFilter(e.target.value)}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="ALL">All</MenuItem>
        {deliveryModes.map((m: ConfigOption) => (
          <MenuItem key={m.id} value={m.id}>
            {m.name}
          </MenuItem>
        ))}
      </TextField>
      {/* <TextField
        select
        size="small"
        label="Area"
        value={areaFilter}
        onChange={(e) => setAreaFilter(e.target.value)}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="">All</MenuItem>
        {areas.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField> */}
      <Button size="large" variant="contained" onClick={openAddPeople}>
        Add people
      </Button>
    </Stack>
  );

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
                    .catch((err: unknown) => toastApiErr(err));
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
          <AssigneeFieldSelect
            label="Assignee (all)"
            value={wholeAssignee}
            fallbackName={drive.defaultAssigneeName}
            options={assigneeOptions}
            onChange={(id) => applyWholeAssignee(id)}
          />
          {/* <AssigneeSelect
            // label="Assignee (all)"
            value={wholeAssignee}
            fallbackLabel={drive.defaultAssigneeName}
            options={assigneeOptions}
            minWidth={180}
            onChange={(id) => applyWholeAssignee(id)}
          /> */}
          <TextField
            select
            size="small"
            label="Mode (all)"
            value={wholeModeSelectValue}
            onChange={(e) =>
              applyWholeMode(e.target.value as DeliveryMode | "ALL")
            }
            sx={{ minWidth: 180 }}
          >
            {wholeModeSelectValue === "ALL" && (
              <MenuItem value="ALL">All</MenuItem>
            )}
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
              Edit selected ({selectedRows.length})
            </Typography>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ sm: "flex-end" }}
                flexWrap="wrap"
                useFlexGap
              >
                <TextField
                  select
                  size="small"
                  label="Delivery status"
                  value={selectionStatus}
                  onChange={(e) => setSelectionStatus(e.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">—</MenuItem>
                  {deliveryStatuses.map((s: ConfigOption) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Mode"
                  value={selectionMode}
                  onChange={(e) => setSelectionMode(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">—</MenuItem>
                  {deliveryModes.map((m: ConfigOption) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="number"
                  size="small"
                  label="Qty"
                  value={selectionQty}
                  onChange={(e) => setSelectionQty(e.target.value)}
                  inputProps={{ min: 1 }}
                  sx={{ width: 90 }}
                />
                <TextField
                  size="small"
                  label="Remark"
                  value={selectionRemark}
                  onChange={(e) => setSelectionRemark(e.target.value)}
                  sx={{ minWidth: 160 }}
                />
                {selectionStatus === "SKIPPED" && (
                  <TextField
                    select
                    size="small"
                    label="Skip reason"
                    value={selectionSkipReason || "REFUSED"}
                    onChange={(e) => setSelectionSkipReason(e.target.value)}
                    sx={{ minWidth: 150 }}
                  >
                    {SKIP_REASON_OPTIONS.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "flex-end" }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <AssigneeFieldSelect
                    label="Assignee"
                    value={selectionAssigneeId}
                    options={assigneeOptions}
                    onChange={setSelectionAssigneeId}
                  />
                  {/* <AssigneeSelect
                    label="Assignee"
                    value={selectionAssigneeId}
                    options={assigneeOptions}
                    minWidth={220}
                    onChange={setSelectionAssigneeId}
                  /> */}
                  <Button
                    size="medium"
                    variant="contained"
                    onClick={applyFieldsToSelected}
                  >
                    Apply to selected
                  </Button>
                  <Button
                    size="medium"
                    color="error"
                    variant="outlined"
                    onClick={removeSelectedFromRun}
                  >
                    Remove from Gift Run
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Remove works only for people you added on this Gift Run
                  (marked “Gift only”). People from the linked People Group must
                  be changed in the group — not removed here.
                </Typography>
              </Stack>
            </Stack>
          </>
        )}
      </Box>

      <Dialog
        open={addPeopleOpen}
        onClose={() => !addingPeople && setAddPeopleOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add people to this Gift Run</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These people are added only to this run — not to the linked People
            Group.
          </Typography>
          <PersonPicker selected={pickerPeople} onChange={setPickerPeople} />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAddPeopleOpen(false)}
            disabled={addingPeople}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmAddPeople}
            disabled={addingPeople}
          >
            {addingPeople ? "Adding…" : "Add to Gift Run"}
          </Button>
        </DialogActions>
      </Dialog>

      <MaterialTable
        key={`Courtesy-Gift-Run-Recipients-${tableSelectionReset}`}
        tableName="Courtesy-Gift-Run-Recipients"
        columns={columns}
        data={tableRows}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        enableRowSelection
        onSelectedRowsChange={setSelectedRows}
        renderTopToolbarRightActions={() => toolbarFilters}
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
