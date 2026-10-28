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
  DialogActions,
  DialogContent,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  InputAdornment,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
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
  GlassDialog,
  GlassHeader,
  StatTile,
  TRIO,
  useConfirmDialog,
  usePromptDialog,
  WtButton,
  WtDateField,
  FilterSheetButton,
} from "@app/modules/common/components/ui";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  addPeopleToDriveToApi,
  archiveDriveToApi,
  bulkUpdateRecipientsToApi,
  cloneDriveToApi,
  deleteDriveToApi,
  getDrive,
  listGroups,
  refreshDriveFromApi,
  removePeopleFromDriveToApi,
  unarchiveDriveToApi,
  updateDriveMetaToApi,
  updateRecipientToApi,
} from "../store/courtesyDeskStore";
import type {
  ConfigOption,
  CourtesyDrive,
  CourtesyRecipient,
  DeliveryMode,
  PersonRef,
  SkippedReason,
} from "../types";
import { formatCurrencyCompact } from "@utils/currency";
import { useSensitiveData } from "@app/modules/common/components/SensitiveData";
import {
  GIFT_RUN_LABEL,
  deliveryStatusColor,
  driveGroupIds,
  formatGiftQty,
  groupMembersOf,
  giftRunTotalAmount,
  giftsFromAmount,
  occasionLabel,
  recipientQty,
} from "../types";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import PersonPicker, {
  MemberTypeChip,
  PersonAvatar,
  courtesyDeskAssigneeOptions,
} from "./PersonPicker";
import {
  DriveCreateModal,
  DriveEditModal,
  isGiftRunEditable,
} from "./DriveCreate";
import GiftHistoryButton from "./GroupActivityLog";
import GroupsChip from "./GroupsChip";
import GroupsField from "./GroupsField";
import SolidChipPickMenu from "./SolidChipPickMenu";
import GiftRunFilterSheet from "./GiftRunFilterSheet";
import {
  EMPTY_GIFT_RUN_FILTERS,
  giftRunActiveFilterCount,
  matchesGiftRunFilters,
  type GiftRunFilters,
} from "./giftRunFilters";

const SKIP_REASON_OPTIONS: ConfigOption[] = [
  { id: "REFUSED", name: "Refused", color: "#dc2626" },
  { id: "NOT_AVAILABLE", name: "Not available", color: "#ea580c" },
  { id: "DO_NOT_GIFT", name: "Do not gift", color: "#64748b" },
];

/**
 * One person's quantity in the run's unit ("0.25" kg, "2" Box). Keeps what is typed and saves
 * on blur / Enter — saving per keystroke turned the leading "0" of "0.25" into 1.
 */
function GiftQtyInput({
  quantity,
  drive,
  disabled,
  onCommit,
}: {
  quantity: number;
  drive: CourtesyDrive | null | undefined;
  disabled: boolean;
  onCommit: (quantity: number) => void;
}) {
  const shown = String(Math.round(quantity * Number(drive?.sizePerGift || 1) * 1000) / 1000);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => {
    const next = drive ? giftsFromAmount(text, drive) : null;
    if (next === null) setText(shown);
    else if (next !== quantity) onCommit(next);
  };
  return (
    <TextField
      size="small"
      disabled={disabled}
      value={text}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      inputProps={{ inputMode: "decimal" }}
      InputProps={{
        endAdornment: drive?.sizeUnitSymbol ? (
          <InputAdornment position="end">{drive.sizeUnitSymbol}</InputAdornment>
        ) : undefined,
      }}
      sx={{ width: 120 }}
    />
  );
}

type PersonProfile = {
  gender?: string;
  designation?: string;
  /** Live CRM active flag — undefined until loaded. */
  isActive?: boolean;
};

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
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  options: AssigneeOpt[];
  fallbackName?: string;
  tableCell?: boolean;
  disabled?: boolean;
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
      disabled={disabled}
      options={options}
      value={valueOpt}
      open={menuOpen}
      onOpen={() => !disabled && setMenuOpen(true)}
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
  const sensitive = useSensitiveData();
  const { driveId } = useParams<{ driveId: string }>();
  const drive = driveId ? getDrive(driveId) : undefined;
  const runEditable = isGiftRunEditable(drive?.status ?? "");
  const navigate = useNavigate();
  const { ask, dialog: confirmDialog } = useConfirmDialog();
  const { askText, dialog: promptDialog } = usePromptDialog();
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.allEmployees.list);
  const employeeId = useSelector(
    (s: RootState) => s.employee.currentEmployee?.id,
  );

  const deliveryStatuses = desk.config.deliveryStatuses;
  const giftRunStatuses = desk.config.giftRunStatuses;
  const deliveryModes = desk.config.deliveryModes;
  const [filters, setFilters] = useState<GiftRunFilters>(
    EMPTY_GIFT_RUN_FILTERS,
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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
  const [pickerGroupIds, setPickerGroupIds] = useState<string[]>([]);
  const [addingPeople, setAddingPeople] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createFromRunOpen, setCreateFromRunOpen] = useState(false);
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
            isActive: (e as { isActive?: boolean }).isActive !== false,
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
          const isActive =
            row.isActive !== false && row.isContactActive !== false;
          return {
            id,
            gender: contactGenderLabel(row.gender),
            designation:
              (typeof row.roleInCompany === "string" &&
                row.roleInCompany.trim()) ||
              role?.name?.trim() ||
              undefined,
            isActive,
          };
        } catch {
          return { id, gender: "—", designation: undefined, isActive: true };
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const map = new Map<string, PersonProfile>();
      for (const r of rows) {
        map.set(r.id, {
          gender: r.gender,
          designation: r.designation,
          isActive: r.isActive,
        });
      }
      setContactProfiles(map);
    });
    return () => {
      cancelled = true;
    };
  }, [drive?.id, drive?.recipients]);

  const getProfileFor = useCallback(
    (r: CourtesyRecipient): PersonProfile => {
      if (r.memberType === "EMPLOYEE") {
        const fromProfile = employeeProfiles.get(r.personId);
        if (fromProfile) return fromProfile;
        const emp = employees.find((e) => String(e.employeeId) === r.personId);
        return { isActive: emp ? emp.isActive !== false : undefined };
      }
      return contactProfiles.get(r.personId) ?? {};
    },
    [employeeProfiles, contactProfiles, employees],
  );

  const recipientIsInactive = useCallback(
    (r: CourtesyRecipient) => getProfileFor(r).isActive === false,
    [getProfileFor],
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
    const standardGenders = ["Male", "Female", "Other"];
    const recipientGenders = drive
      ? drive.recipients.map((recipient) => recipientGender(recipient))
      : [];
    return Array.from(new Set([...standardGenders, ...recipientGenders]));
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
    const skipped = recipients.filter((r) => r.status === "SKIPPED").length;
    const amount = giftRunTotalAmount(drive);
    return { total, delivered, pending, skipped, amount };
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

  const linkedGroups = useMemo(
    () =>
      drive
        ? driveGroupIds(drive).flatMap((id) => listGroups(true).filter((g) => g.id === id))
        : [],
    [drive],
  );
  const tableRows = useMemo(() => {
    if (!drive) return [];
    return drive.recipients.filter((recipient) =>
      matchesGiftRunFilters(recipient, filters, {
        gender: recipientGender(recipient),
        designation: recipientDesignation(recipient),
        groupIds: linkedGroups
          .filter((g) =>
            g.members.some(
              (m) => m.memberType === recipient.memberType && m.personId === recipient.personId,
            ),
          )
          .map((g) => g.id),
      }),
    );
  }, [
    drive,
    linkedGroups,
    filters,
    recipientGender,
    recipientDesignation,
  ]);

  const existingPersonKeys = useMemo(() => {
    if (!drive) return new Set<string>();
    return new Set(
      drive.recipients.map((r) => `${r.memberType}:${r.personId}`),
    );
  }, [drive]);

  const existingPickerPeople = useMemo<PersonRef[]>(
    () =>
      drive?.recipients.map((r) => ({
        memberType: r.memberType,
        personId: r.personId,
        fullName: r.fullName,
        companyName: r.companyName,
        area: r.area,
        address: r.address,
        phone: r.phone,
        email: r.email,
        avatarUrl: r.avatarUrl,
        giftQuantity: r.quantity,
      })) ?? [],
    [drive],
  );

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

  const recipientAssigneeFilterOptions = useMemo(() => {
    const assigned = new Map<string, string>();
    drive?.recipients.forEach((recipient) => {
      if (recipient.assigneeEmployeeId) {
        assigned.set(
          recipient.assigneeEmployeeId,
          recipient.assigneeName || "Former employee",
        );
      }
    });
    return [
      { value: "ALL", label: "All" },
      { value: "UNASSIGNED", label: "None" },
      ...Array.from(assigned, ([value, label]) => ({ value, label })).sort(
        (a, b) => a.label.localeCompare(b.label),
      ),
    ];
  }, [drive]);

  const activeFilterCount = giftRunActiveFilterCount(filters);

  const toastApiErr = (err: unknown) =>
    toast.error(apiErrorMessage(err, "Something went wrong"));

  const patchRecipient = (
    recipientId: string,
    patch: Parameters<typeof updateRecipientToApi>[2],
  ) => {
    if (!driveId || !runEditable) return;
    void updateRecipientToApi(driveId, recipientId, patch).catch(toastApiErr);
  };

  const tableAmountTotal = useMemo(() => {
    if (!drive) return 0;
    const cost = Number(drive.costPerGift);
    if (!Number.isFinite(cost) || cost < 0) return 0;
    return tableRows.reduce(
      (sum, r) => sum + cost * recipientQty(r.quantity),
      0,
    );
  }, [drive, tableRows]);

  const tableQuantityTotal = useMemo(
    () =>
      tableRows.reduce(
        (sum, recipient) => sum + recipientQty(recipient.quantity),
        0,
      ),
    [tableRows],
  );

  const columns = useMemo<MRT_ColumnDef<CourtesyRecipient>[]>(() => {
    const unitCost = Number(drive?.costPerGift);
    const hasCost = Number.isFinite(unitCost) && unitCost >= 0;
    return [
      {
        accessorKey: "fullName",
        header: "Person",
        Footer: () => (
          <Typography fontWeight={800} sx={{ fontSize: "0.8rem" }}>
            TOTAL
          </Typography>
        ),
        Cell: ({ row }) => {
          const r = row.original;
          const inactive = recipientIsInactive(r);
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
            <Typography
              fontWeight={600}
              variant="body2"
              noWrap
              sx={inactive ? { color: "text.disabled" } : undefined}
            >
              {r.fullName}
              {inactive ? " (Inactive)" : ""}
            </Typography>
          ) : (
            <Link
              component={RouterLink}
              to={href}
              fontWeight={600}
              variant="body2"
              onClick={(e) => e.stopPropagation()}
              sx={{
                display: "block",
                ...(inactive ? { color: "text.disabled" } : {}),
              }}
              noWrap
            >
              {r.fullName}
              {inactive ? " (Inactive)" : ""}
            </Link>
          );
          return (
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0, opacity: inactive ? 0.72 : 1 }}
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
                  {inactive ? (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        px: 0.75,
                        py: 0.1,
                        borderRadius: 1,
                        bgcolor: "action.hover",
                        color: "text.secondary",
                        fontWeight: 700,
                        fontSize: 10,
                      }}
                    >
                      Inactive
                    </Typography>
                  ) : null}
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
        size: 130,
        meta: {
          exportValue: (r: CourtesyRecipient) =>
            drive ? formatGiftQty(recipientQty(r.quantity), drive) : r.quantity,
        },
        // Typed in the run's unit (0.25 kg); stored as gifts. Saved on blur / Enter.
        Cell: ({ row }) => (
          <GiftQtyInput
            quantity={recipientQty(row.original.quantity)}
            drive={drive}
            disabled={!runEditable}
            onCommit={(quantity) => patchRecipient(row.original.id, { quantity })}
          />
        ),
        Footer: () => (
          <Typography fontWeight={800} sx={{ fontSize: "0.8rem" }}>
            {drive ? formatGiftQty(tableQuantityTotal, drive) : tableQuantityTotal.toLocaleString()}
          </Typography>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        size: 120,
        accessorFn: (r) =>
          hasCost ? unitCost * recipientQty(r.quantity) : 0,
        Cell: ({ row }) => (
          <Box
            component="span"
            className={sensitive.cls}
            sx={{
              display: "inline-block",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            {formatCurrencyCompact(
              hasCost ? unitCost * recipientQty(row.original.quantity) : 0,
            )}
          </Box>
        ),
        Footer: () => (
          <Box
            component="span"
            className={sensitive.cls}
            sx={{
              display: "inline-block",
              fontWeight: 800,
              fontSize: "0.8rem",
            }}
          >
            {formatCurrencyCompact(tableAmountTotal)}
          </Box>
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
            disabled={!runEditable}
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
        accessorKey: "deliveredOn",
        header: "Delivery date",
        size: 150,
        Cell: ({ row }) => (
          <Box onClick={(e) => e.stopPropagation()}>
            <WtDateField
              disabled={!runEditable}
              value={row.original.deliveredOn}
              onChange={(v) =>
                patchRecipient(row.original.id, { deliveredOn: v || null })
              }
              sx={{ minWidth: 140 }}
            />
          </Box>
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
            disabled={!runEditable}
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
            disabled={!runEditable}
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
            disabled={!runEditable}
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
              disabled={!runEditable}
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
    recipientIsInactive,
    runEditable,
    sensitive.cls,
    tableAmountTotal,
    tableQuantityTotal,
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

  const applyBulkFields = () => {
    if (!runEditable || !driveId || !drive) return;
    const applyingToAll = selectedRows.length === 0;
    const targetIds = applyingToAll
      ? drive.recipients.map((r) => r.id)
      : selectedRows.map((r) => r.id);
    if (!targetIds.length) {
      toast.warning("No recipients to update.");
      return;
    }
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
    const selectionGifts = selectionQty && drive ? giftsFromAmount(selectionQty, drive) : null;
    if (selectionGifts) patch.quantity = selectionGifts;
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
    void ask({
      variant: "confirm",
      title: applyingToAll ? "Apply to all" : "Apply to selected",
      message: applyingToAll
        ? `Apply these changes to all ${targetIds.length} recipient(s)?`
        : `Apply these changes to ${targetIds.length} selected recipient(s)?`,
      confirmLabel: "Apply",
      icon: "bi-check-circle",
    }).then((ok) => {
      if (!ok) return;
      void bulkUpdateRecipientsToApi(driveId, targetIds, patch)
        .then(() => {
          if (
            applyingToAll &&
            (selectionAssigneeId ||
              selectionMode === "IN_PERSON" ||
              selectionMode === "COURIER")
          ) {
            const found = selectionAssigneeId
              ? assigneeOptions.find((a) => a.id === selectionAssigneeId)
              : undefined;
            return updateDriveMetaToApi(drive.id, {
              ...(selectionAssigneeId
                ? {
                    defaultAssigneeEmployeeId: selectionAssigneeId,
                    defaultAssigneeName: found?.name || "",
                  }
                : {}),
              ...(selectionMode === "IN_PERSON" || selectionMode === "COURIER"
                ? { defaultMode: selectionMode as DeliveryMode }
                : {}),
            });
          }
        })
        .then(() => {
          toast.success(
            applyingToAll
              ? `Updated all ${targetIds.length} recipient(s).`
              : `Updated ${targetIds.length} recipient(s).`,
          );
          if (!applyingToAll) {
            setSelectedRows([]);
            setTableSelectionReset((n) => n + 1);
          }
        })
        .catch(toastApiErr);
    });
  };

  const removeSelectedFromRun = () => {
    if (!runEditable || !driveId || !selectedRows.length) return;
    const ids = selectedRows.map((r) => r.id);
    void ask({
      variant: "delete",
      title: "Remove from Gift Run",
      message: `Remove ${ids.length} person(s) from this Gift Run? The People Group is unchanged.`,
      confirmLabel: "Remove",
    }).then((ok) => {
      if (!ok) return;
      void removePeopleFromDriveToApi(driveId, ids)
        .then(() => {
          toast.success(`Removed ${ids.length} from Gift Run.`);
          setSelectedRows([]);
          setTableSelectionReset((n) => n + 1);
        })
        .catch(toastApiErr);
    });
  };

  const openAddPeople = () => {
    if (!runEditable || !drive) return;
    setPickerGroupIds(driveGroupIds(drive));
    setPickerPeople(existingPickerPeople);
    setAddPeopleOpen(true);
  };

  // Groups and individuals in one step; anyone already on the run or in a picked group is skipped
  // (by person id — the API enforces the same rule).
  const confirmAddPeople = () => {
    if (!runEditable || !driveId || !drive) return;
    if (!pickerGroupIds.length) {
      toast.warning("Keep at least one People Group.");
      return;
    }
    const groupsChanged = pickerGroupIds.join() !== driveGroupIds(drive).join();
    const inGroups = new Set(
      groupMembersOf(listGroups(true), pickerGroupIds)
        .flat()
        .map((p) => `${p.memberType}:${p.personId}`),
    );
    const toAdd = pickerPeople.filter((p) => {
      const key = `${p.memberType}:${p.personId}`;
      return !existingPersonKeys.has(key) && !inGroups.has(key);
    });
    if (!groupsChanged && !toAdd.length) {
      toast.warning("Nothing new selected.");
      return;
    }
    const parts = [
      groupsChanged ? "update the People Groups" : "",
      toAdd.length ? `add ${toAdd.length} individual person(s)` : "",
    ].filter(Boolean);
    void ask({
      variant: "confirm",
      title: "Add people to Gift Run",
      message: `This will ${parts.join(" and ")}. Each person is listed once.`,
      confirmLabel: "Save",
      icon: "bi-people",
    }).then((ok) => {
      if (!ok) return;
      setAddingPeople(true);
      void (groupsChanged
        ? updateDriveMetaToApi(driveId, { sourceGroupIds: pickerGroupIds })
        : Promise.resolve())
        .then(() => (toAdd.length ? addPeopleToDriveToApi(driveId, toAdd) : undefined))
        .then(() => {
          toast.success("Gift Run people updated.");
          setAddPeopleOpen(false);
          setPickerPeople([]);
        })
        .catch(toastApiErr)
        .finally(() => setAddingPeople(false));
    });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {confirmDialog}
      {promptDialog}
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
              alignItems="center"
              spacing={0.75}
              useFlexGap
              flexWrap="wrap"
            >
              <SolidChipPickMenu
                valueId={drive.status}
                heading="SET GIFT RUN STATUS"
                options={giftRunStatuses}
                onPick={(status) => {
                  const needsConfirm =
                    status === "COMPLETED" ||
                    status === "ARCHIVED" ||
                    !isGiftRunEditable(drive.status);
                  const apply = () => {
                    const request =
                      status === "ARCHIVED"
                        ? archiveDriveToApi(drive.id)
                        : updateDriveMetaToApi(drive.id, { status });
                    void request
                      .then(() => toast.success("Gift run status updated"))
                      .catch((err: unknown) => toastApiErr(err));
                  };
                  if (!needsConfirm) {
                    apply();
                    return;
                  }
                  void ask({
                    variant: "confirm",
                    title: "Change gift run status",
                    message:
                      "Are you sure you want to change the status of this gift run?",
                    confirmLabel: "Change Status",
                  }).then((ok) => {
                    if (ok) apply();
                  });
                }}
              />
              {runEditable ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AppIcon name="bi-pencil" />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                startIcon={<AppIcon name="bi-gift" />}
                onClick={() => setCreateFromRunOpen(true)}
              >
                Add
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AppIcon name="bi-copy" />}
                onClick={() => {
                  void askText({
                    title: `Clone ${GIFT_RUN_LABEL}`,
                    message: `This will create a copy of the ${GIFT_RUN_LABEL} with the same Assignees, modes, and quantities.`,
                    label: `${GIFT_RUN_LABEL} title`,
                    defaultValue: `${drive.title} (copy)`,
                    confirmLabel: "Clone",
                    icon: "bi-copy",
                  }).then((title) => {
                    if (!title) return;
                    void cloneDriveToApi(drive.id, title)
                      .then((cloned) => {
                        toast.success(`${GIFT_RUN_LABEL} cloned.`);
                        navigate(`${GIFT_MANAGEMENT_BASE}/drives/${cloned.id}`);
                      })
                      .catch((err: unknown) => toastApiErr(err));
                  });
                }}
              >
                Clone
              </Button>
              {drive.status === "ARCHIVED" ? (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<AppIcon name="bi-arrow-counterclockwise" />}
                    onClick={() => {
                      void ask({
                        variant: "confirm",
                        title: `Unarchive ${GIFT_RUN_LABEL}`,
                        message: `Move “${drive.title}” out of archive back to its previous status?`,
                        confirmLabel: "Unarchive",
                        icon: "archive",
                      }).then((ok) => {
                        if (!ok) return;
                        void unarchiveDriveToApi(drive.id)
                          .then(() =>
                            toast.success(`${GIFT_RUN_LABEL} unarchived.`),
                          )
                          .catch((err: unknown) => toastApiErr(err));
                      });
                    }}
                  >
                    Unarchive
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<AppIcon name="bi-trash" />}
                    onClick={() => {
                      void ask({
                        variant: "delete",
                        title: `Delete ${GIFT_RUN_LABEL}`,
                        message: `Permanently delete “${drive.title}”? This cannot be undone.`,
                        confirmLabel: "Delete permanently",
                        icon: "trash",
                      }).then((ok) => {
                        if (!ok) return;
                        void deleteDriveToApi(drive.id)
                          .then(() => {
                            toast.success(`${GIFT_RUN_LABEL} deleted.`);
                            navigate(`${GIFT_MANAGEMENT_BASE}/drives`);
                          })
                          .catch((err: unknown) => toastApiErr(err));
                      });
                    }}
                  >
                    Delete
                  </Button>
                </>
              ) : null}
              <GiftHistoryButton kind="drive" id={drive.id} />
            </Stack>
          </Stack>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            {occasionLabel(desk.config, drive.occasionType)}
            {drive.giftItem ? ` · ${drive.giftItem}` : ""}
            {drive.driveDate ? ` · ${drive.driveDate}` : ""}
            {drive.costPerGift != null ? (
              <>
                {" · Cost per gift "}
                <Box
                  component="span"
                  className={sensitive.cls}
                  sx={{
                    display: "inline-block",
                    fontWeight: 700,
                  }}
                >
                  {formatCurrencyCompact(Number(drive.costPerGift))}
                </Box>
              </>
            ) : null}
          </Typography>
          <Typography variant="h6" fontWeight={700} color="text.secondary">
            {driveGroupIds(drive).length > 1 ? "Groups: " : "Group: "}
            <GroupsChip drive={drive} />
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
          <StatTile
            label="Total amount"
            value={formatCurrencyCompact(runStats.amount)}
            valueClassName={sensitive.cls}
            trio={TRIO.cyan}
            icon="bill"
          />
        </Box>
      )}

      {runEditable ? (
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
            {selectedRows.length > 0
              ? `Edit selected (${selectedRows.length})`
              : "Apply to whole Gift Run"}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 1.5 }}
          >
            {selectedRows.length > 0
              ? "Changes apply only to the selected people."
              : "No rows selected — changes apply to everyone. Select rows to limit the update."}
          </Typography>
          <Stack spacing={2}>
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
                size="small"
                label="Qty"
                value={selectionQty}
                onChange={(e) => setSelectionQty(e.target.value)}
                inputProps={{ inputMode: "decimal" }}
                InputProps={{
                  endAdornment: drive?.sizeUnitSymbol ? (
                    <InputAdornment position="end">{drive.sizeUnitSymbol}</InputAdornment>
                  ) : undefined,
                }}
                sx={{ width: 120 }}
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
              <Button
                size="medium"
                variant="contained"
                onClick={applyBulkFields}
              >
                {selectedRows.length > 0 ? "Apply to selected" : "Apply to all"}
              </Button>
              {selectedRows.length > 0 ? (
                <Button
                  size="medium"
                  color="error"
                  variant="contained"
                  onClick={removeSelectedFromRun}
                >
                  Remove from Gift Run
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          This gift run is{" "}
          {drive.status === "ARCHIVED" ? "archived" : "completed"} — editing is
          locked. Change status to reopen.
        </Alert>
      )}

      <DriveEditModal
        open={editOpen}
        drive={drive}
        onClose={() => setEditOpen(false)}
      />

      <DriveCreateModal
        open={createFromRunOpen}
        onClose={() => setCreateFromRunOpen(false)}
        fromDrive={drive}
      />

      <GlassDialog
        open={addPeopleOpen}
        onClose={() => !addingPeople && setAddPeopleOpen(false)}
        maxWidth="md"
        plain
        header={
          <GlassHeader
            icon={<KTIcon iconName="people" className="fs-2" />}
            title="Add people to this Gift Run"
            onClose={() => !addingPeople && setAddPeopleOpen(false)}
          />
        }
      >
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <GroupsField
              groups={listGroups()}
              value={pickerGroupIds}
              onChange={setPickerGroupIds}
              helperText="Everyone in these groups is on the run — each person once."
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Individual people are added to this run only — not to any People Group.
          </Typography>
          <PersonPicker
            selected={pickerPeople}
            onChange={setPickerPeople}
            baselineSelected={existingPickerPeople}
            baselineLabel="Gift Run"
            hideSelectedPanels
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <WtButton
            ghost
            onClick={() => setAddPeopleOpen(false)}
            disabled={addingPeople}
          >
            Cancel
          </WtButton>
          <WtButton onClick={confirmAddPeople} disabled={addingPeople}>
            {addingPeople ? "Saving…" : "Save"}
          </WtButton>
        </DialogActions>
      </GlassDialog>

      <GiftRunFilterSheet
        open={filterSheetOpen}
        value={filters}
        visibleCount={tableRows.length}
        totalCount={drive.recipients.length}
        statusOptions={[
          { value: "ALL", label: "All" },
          ...deliveryStatuses.map((status) => ({
            value: status.id,
            label: status.name,
          })),
        ]}
        modeOptions={[
          { value: "ALL", label: "All" },
          ...deliveryModes.map((mode) => ({
            value: mode.id,
            label: mode.name,
          })),
        ]}
        genderOptions={[
          { value: "ALL", label: "All" },
          ...genderFilterOptions.map((gender) => ({
            value: gender,
            label: gender,
          })),
        ]}
        designationOptions={[
          { value: "ALL", label: "All" },
          ...designationFilterOptions.map((designation) => ({
            value: designation,
            label: designation,
          })),
        ]}
        areaOptions={[
          { value: "ALL", label: "All" },
          ...areas.map((area) => ({ value: area, label: area })),
        ]}
        assigneeOptions={recipientAssigneeFilterOptions}
        groupOptions={linkedGroups.map((g) => ({ value: g.id, label: g.name }))}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setFilterSheetOpen(false);
        }}
      />

      <MaterialTable
        key={`Courtesy-Gift-Run-Recipients-${tableSelectionReset}`}
        tableName="Courtesy-Gift-Run-Recipients"
        // Export as the run's title; filtered to one of several groups → "Title (Group)".
        exportName={
          linkedGroups.length > 1 && linkedGroups.some((g) => g.id === filters.via)
            ? `${drive.title} (${linkedGroups.find((g) => g.id === filters.via)!.name})`
            : drive.title
        }
        columns={columns}
        data={tableRows}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        enableRowSelection={runEditable}
        showColumnFooter
        onSelectedRowsChange={setSelectedRows}
        renderToolbarIconActions={() => (
          <FilterSheetButton
            count={activeFilterCount}
            onClick={() => setFilterSheetOpen(true)}
          />
        )}
        renderTopToolbarRightActions={
          runEditable
            ? () => <WtButton onClick={openAddPeople}>Add people</WtButton>
            : undefined
        }
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
