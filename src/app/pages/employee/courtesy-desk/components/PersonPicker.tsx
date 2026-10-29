import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Avatar, Box, Checkbox, Chip, CircularProgress, InputAdornment, Link, Stack, Tab, Tabs, TextField, Typography, alpha, useTheme } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { getAllClientContacts } from "@services/companies";
import { initialsOf } from "@app/modules/common/components/EmployeeIdentityCell";
import {
  ActionIconButton,
  ConfirmDialog,
  useConfirmDialog,
} from "@app/modules/common/components/ui";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { TRIO, type Trio } from "@app/modules/common/components/ui/patterns";
import type { MemberType, PersonRef } from "../types";
import { pinNewlySelected } from "./personPickerUtils";
import { WtButton } from '@app/modules/common/components/ui/buttons';

export function personProfilePath(
  p: Pick<PersonRef, "memberType" | "personId">,
) {
  return p.memberType === "CONTACT"
    ? `/contacts/${p.personId}`
    : `/employees/${p.personId}`;
}

type SourceTab = "CONTACTS" | "EMPLOYEES";

/** Tall enough on desktop; on phone use more of the viewport. */
const SELECTED_LIST_MAX_HEIGHT = { xs: "min(62vh, 520px)", md: 520 };

/** Same page size as ContactPicker — server searches; we do not ship 6k rows. */
const CONTACT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 250;

function isContactCrmActive(c: {
  isActive?: boolean | null;
  isContactActive?: boolean | null;
}) {
  return c.isActive !== false && c.isContactActive !== false;
}

function contactToPersonRef(c: any): PersonRef {
  return {
    memberType: "CONTACT",
    personId: String(c.id),
    fullName: c.fullName || c.name || "Unnamed",
    companyName: c.company?.companyName || c.companyName || "",
    area: c.area || c.city || "",
    address: c.address || "",
    phone: c.phone || "",
    email: c.email || "",
    doNotGift: Boolean(c.doNotGift),
    avatarUrl: c.profilePhoto || c.avatar || c.users?.avatar || "",
  };
}

interface PersonPickerProps {
  selected: PersonRef[];
  onChange: (next: PersonRef[]) => void;
  /**
   * When editing an existing group, pass the members loaded from the server.
   * Selected people are split into "Already in group" vs "Newly selected".
   */
  baselineSelected?: PersonRef[];
  /** Name of the collection represented by `baselineSelected`. */
  baselineLabel?: string;
  /** Hide the selected/newly-selected chip panels (e.g. when the parent already lists them). */
  hideSelectedPanels?: boolean;
}

function matchesQuery(haystack: string, q: string) {
  return haystack.toLowerCase().includes(q.toLowerCase());
}

export function personKey(p: Pick<PersonRef, "memberType" | "personId">) {
  return `${p.memberType}:${p.personId}`;
}

/** Active employees from `fetchAllEmployeesSelectedData` / `allEmployees` — same roster as the Employees tab here. */
export function courtesyDeskAssigneeOptions(
  employees: Array<{
    employeeId: string;
    employeeName: string;
    avatar: string;
    isActive?: boolean;
    phone?: string;
    email?: string;
    area?: string;
    address?: string;
  }>,
) {
  return employees
    .filter((e) => e.isActive !== false)
    .map((e) => ({
      id: String(e.employeeId),
      name: e.employeeName || "Unnamed",
      avatarUrl: e.avatar || "",
      phone: e.phone || "",
      email: e.email || "",
      area: e.area || "",
      address: e.address || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function memberTrio(memberType: MemberType): Trio {
  return memberType === "CONTACT" ? TRIO.blue : TRIO.cyan;
}

const SELECTED_TRIO = TRIO.green;

export function MemberTypeChip({ memberType }: { memberType: MemberType }) {
  const theme = useTheme();
  const trio = memberTrio(memberType);
  const label = memberType === "CONTACT" ? "Contact" : "Employee";
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 20,
        fontSize: 10,
        fontWeight: 700,
        bgcolor: alpha(trio.c, theme.palette.mode === "dark" ? 0.25 : 0.12),
        color: trio.c,
        border: `1px solid ${alpha(trio.c, 0.35)}`,
      }}
    />
  );
}

export function PersonAvatar({
  person,
  size = 32,
}: {
  person: Pick<PersonRef, "fullName" | "avatarUrl">;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Avatar
      src={person.avatarUrl || undefined}
      alt=""
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 700,
        bgcolor: alpha(
          SELECTED_TRIO.c,
          theme.palette.mode === "dark" ? 0.35 : 0.15,
        ),
        color: SELECTED_TRIO.c,
        flexShrink: 0,
      }}
    >
      {initialsOf(person.fullName)}
    </Avatar>
  );
}

function PersonChipRow({
  person,
  onRemove,
  selectable,
  selected,
  onToggleSelect,
}: {
  person: PersonRef;
  onRemove?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const hoverBg = isDark
    ? alpha(theme.palette.common.white, 0.06)
    : theme.palette.grey[50];
  const selectedBg = alpha(theme.palette.primary.main, isDark ? 0.18 : 0.08);
  const selectedHoverBg = alpha(
    theme.palette.primary.main,
    isDark ? 0.24 : 0.12,
  );
  const isDemo = person.personId.startsWith("demo_");
  const profilePath = personProfilePath(person);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={{ xs: 1, sm: 1.25 }}
      onClick={selectable ? onToggleSelect : undefined}
      sx={{
        px: { xs: 1.25, sm: 1.75 },
        py: { xs: 1.25, sm: 1.1 },
        minHeight: { xs: 64, sm: "auto" },
        borderBottom: "1px solid",
        borderColor: alpha(theme.palette.divider, 0.9),
        bgcolor: selected ? selectedBg : "transparent",
        cursor: selectable ? "pointer" : "default",
        transition: "background-color 0.12s ease",
        "&:hover": {
          bgcolor: selected ? selectedHoverBg : hoverBg,
        },
        "&:last-child": { borderBottom: "none" },
      }}
    >
      {selectable && (
        <Checkbox
          size="small"
          checked={Boolean(selected)}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          sx={{ p: 0.25, flexShrink: 0 }}
        />
      )}
      <PersonAvatar person={person} size={38} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          {isDemo ? (
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ minWidth: 0, maxWidth: "100%", color: "text.primary" }}
            >
              {person.fullName}
            </Typography>
          ) : (
            <Link
              component={RouterLink}
              to={profilePath}
              variant="body2"
              fontWeight={600}
              noWrap
              onClick={(e) => e.stopPropagation()}
              sx={{
                minWidth: 0,
                maxWidth: "100%",
                color: "primary.main",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {person.fullName}
            </Link>
          )}
          <MemberTypeChip memberType={person.memberType} />
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          display="block"
          sx={{ mt: 0.15 }}
        >
          {[person.companyName, person.area].filter(Boolean).join(" · ") || "—"}
        </Typography>
      </Box>
      {onRemove && (
        <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
          <ActionIconButton
            icon={<AppIcon name="bi-trash" className="fs-6" />}
            title="Remove"
            size="sm"
            tone="danger"
            onClick={onRemove}
          />
        </Box>
      )}
    </Stack>
  );
}

/** Reusable member list — used by PersonPicker and the Existing members section. */
export function MemberListPanel({
  title: _title,
  people,
  tone: _tone,
  icon: _icon,
  emptyText,
  onRemove,
  searchable = false,
  selectable = false,
  hideWhenEmpty = false,
  sx,
}: {
  title?: string;
  people: PersonRef[];
  tone?: Trio;
  icon?: string;
  emptyText?: string;
  onRemove?: (person: PersonRef) => void;
  searchable?: boolean;
  selectable?: boolean;
  hideWhenEmpty?: boolean;
  sx?: object;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<PersonRef[] | null>(null);

  const sorted = useMemo(
    () =>
      [...people].sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || "", undefined, {
          sensitivity: "base",
        }),
      ),
    [people],
  );

  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return sorted;
    return sorted.filter((p) =>
      matchesQuery(
        [p.fullName, p.companyName, p.area, p.phone].filter(Boolean).join(" "),
        q,
      ),
    );
  }, [sorted, query]);

  const peopleKeys = useMemo(() => new Set(people.map(personKey)), [people]);

  useEffect(() => {
    setSelectedKeys((prev) => {
      const next = new Set<string>();
      prev.forEach((k) => {
        if (peopleKeys.has(k)) next.add(k);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [peopleKeys]);

  if (hideWhenEmpty && people.length === 0) return null;

  const selectedCount = selectedKeys.size;
  const allSelected = people.length > 0 && selectedCount === people.length;
  const allVisibleSelected =
    visible.length > 0 && visible.every((p) => selectedKeys.has(personKey(p)));
  const someVisibleSelected = visible.some((p) =>
    selectedKeys.has(personKey(p)),
  );
  const removeBtnLabel = allSelected ? "Remove all" : "Remove selected";

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((p) => next.delete(personKey(p)));
      } else {
        visible.forEach((p) => next.add(personKey(p)));
      }
      return next;
    });
  };

  const askRemoveOne = (person: PersonRef) => setPendingRemove([person]);

  const askRemoveSelected = () => {
    if (!selectedCount) return;
    setPendingRemove(people.filter((p) => selectedKeys.has(personKey(p))));
  };

  const confirmPendingRemove = () => {
    if (!pendingRemove?.length || !onRemove) return;
    pendingRemove.forEach((p) => onRemove(p));
    setSelectedKeys(new Set());
    setPendingRemove(null);
  };

  const canRemove = Boolean(onRemove);

  const pendingCount = pendingRemove?.length ?? 0;
  const pendingIsAll =
    pendingCount > 0 && pendingCount === people.length && allSelected;

  return (
    <Box sx={{ mb: 2, ...sx }}>
      {people.length === 0 ? (
        emptyText ? (
          <Typography variant="body2" color="text.secondary">
            {emptyText}
          </Typography>
        ) : null
      ) : (
        <Stack spacing={1.5}>
          {searchable && (
            <TextField
              size="small"
              fullWidth
              placeholder="Search members…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.common.white, 0.04)
                      : theme.palette.grey[50],
                  borderRadius: 2,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          )}

          {selectable && canRemove && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
              sx={{
                px: 1.25,
                py: 0.75,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.common.white, 0.03)
                    : theme.palette.grey[50],
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Checkbox
                  size="small"
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected && !allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  sx={{ p: 0.5 }}
                  inputProps={{ "aria-label": "Select all" }}
                />
                <Typography variant="body2" fontWeight={700}>
                  Select all
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ·{" "}
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : `${people.length} member${people.length === 1 ? "" : "s"}`}
                </Typography>
              </Stack>
              {selectedCount > 0 && (
                <WtButton
                  size="medium"
                  color="error"
                  variant="contained"
                  onClick={askRemoveSelected}
                  startIcon={<AppIcon name="bi-trash" className="fs-6" />}
                  sx={{
                    flexShrink: 0,
                    textTransform: "none",
                    fontWeight: 700,
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  {removeBtnLabel}
                </WtButton>
              )}
            </Stack>
          )}

          {searchable && query.trim() && visible.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
              No members match “{query.trim()}”.
            </Typography>
          ) : (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                maxHeight: SELECTED_LIST_MAX_HEIGHT,
                overflowY: "auto",
                overflowX: "hidden",
                bgcolor: "background.paper",
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "none"
                    : `inset 0 1px 0 ${alpha(theme.palette.common.black, 0.02)}`,
                "&::-webkit-scrollbar": { width: 8 },
                "&::-webkit-scrollbar-thumb": {
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.text.primary, 0.2),
                },
                scrollbarWidth: "thin",
              }}
            >
              {visible.map((p) => {
                const key = personKey(p);
                return (
                  <PersonChipRow
                    key={key}
                    person={p}
                    onRemove={canRemove ? () => askRemoveOne(p) : undefined}
                    selectable={selectable && canRemove}
                    selected={selectedKeys.has(key)}
                    onToggleSelect={() => toggleSelect(key)}
                  />
                );
              })}
            </Box>
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemove?.length)}
        variant="delete"
        title={
          pendingCount === 1
            ? "Remove member?"
            : pendingIsAll
              ? "Remove all members?"
              : "Remove selected members?"
        }
        message={
          pendingCount === 1
            ? `Are you sure you want to remove from this group? They will no longer be part of this list or future Gift Runs that use it.`
            : pendingIsAll
              ? `Are you sure you want to remove all ${pendingCount} members from this group? Everyone on this list will be cleared and will no longer be included in future Gift Runs that use it.`
              : `Are you sure you want to remove ${pendingCount} selected members from this group? They will no longer be part of this list or future Gift Runs that use it.`
        }
        confirmLabel={"Remove"}
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmPendingRemove}
      />
    </Box>
  );
}

export default function PersonPicker({
  selected,
  onChange,
  baselineSelected,
  baselineLabel = "group",
  hideSelectedPanels = false,
}: PersonPickerProps) {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.allEmployees.list);
  const { ask, dialog: confirmDialog } = useConfirmDialog();
  const [source, setSource] = useState<SourceTab>("CONTACTS");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contacts, setContacts] = useState<PersonRef[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactTotal, setContactTotal] = useState(0);
  const splitExisting = baselineSelected !== undefined;

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (source !== "CONTACTS") return;
    let cancelled = false;
    setLoading(true);
    setContactPage(1);
    getAllClientContacts(
      {
        search: debouncedQuery || undefined,
        page: 1,
        pageSize: CONTACT_PAGE_SIZE,
        sortBy: "fullName",
        sortOrder: "asc",
      },
      true,
    )
      .then((res: any) => {
        if (cancelled) return;
        const body = res?.data ?? res ?? {};
        const rows = ((body.contacts || []) as any[]).filter(isContactCrmActive);
        setContacts(rows.map(contactToPersonRef));
        setContactTotal(Number(body.total ?? rows.length));
      })
      .catch(() => {
        if (!cancelled) {
          setContacts([]);
          setContactTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, debouncedQuery]);

  const loadMoreContacts = () => {
    const next = contactPage + 1;
    setLoadingMore(true);
    getAllClientContacts(
      {
        search: debouncedQuery || undefined,
        page: next,
        pageSize: CONTACT_PAGE_SIZE,
        sortBy: "fullName",
        sortOrder: "asc",
      },
      true,
    )
      .then((res: any) => {
        const body = res?.data ?? res ?? {};
        const rows = ((body.contacts || []) as any[]).filter(isContactCrmActive);
        setContacts((prev) => {
          const seen = new Set(prev.map((p) => p.personId));
          const added = rows
            .map(contactToPersonRef)
            .filter((p) => !seen.has(p.personId));
          return [...prev, ...added];
        });
        setContactPage(next);
        setContactTotal(Number(body.total ?? contactTotal));
      })
      .finally(() => setLoadingMore(false));
  };

  const employeePeople: PersonRef[] = useMemo(
    () =>
      courtesyDeskAssigneeOptions(employees).map((e) => ({
        memberType: "EMPLOYEE" as MemberType,
        personId: e.id,
        fullName: e.name,
        companyName: "Wisetech",
        area: e.area,
        address: e.address,
        phone: e.phone,
        email: e.email,
        avatarUrl: e.avatarUrl,
      })),
    [employees],
  );

  const selectedKeys = useMemo(
    () => new Set(selected.map(personKey)),
    [selected],
  );

  const baselineKeys = useMemo(
    () => new Set((baselineSelected ?? []).map(personKey)),
    [baselineSelected],
  );

  const { existingMembers, newlySelected } = useMemo(() => {
    if (!splitExisting) {
      return { existingMembers: [] as PersonRef[], newlySelected: selected };
    }
    const existing: PersonRef[] = [];
    const added: PersonRef[] = [];
    for (const p of selected) {
      if (baselineKeys.has(personKey(p))) existing.push(p);
      else added.push(p);
    }
    return { existingMembers: existing, newlySelected: added };
  }, [selected, baselineKeys, splitExisting]);

  const filtered = useMemo(() => {
    if (source === "CONTACTS") {
      // Server already filtered; do not re-filter (phone/email matches would disappear).
      return pinNewlySelected(contacts, newlySelected, "CONTACT").sort(
        (a, b) =>
          Number(selectedKeys.has(personKey(b))) -
          Number(selectedKeys.has(personKey(a))),
      );
    }
    const q = query.trim();
    const list = !q
      ? employeePeople
      : employeePeople.filter((p) =>
          matchesQuery(
            [p.fullName, p.companyName, p.area, p.address, p.phone]
              .filter(Boolean)
              .join(" "),
            q,
          ),
        );
    return pinNewlySelected(list, newlySelected, "EMPLOYEE").sort(
      (a, b) =>
        Number(selectedKeys.has(personKey(b))) -
        Number(selectedKeys.has(personKey(a))),
    );
  }, [source, contacts, employeePeople, query, selectedKeys, newlySelected]);

  const hasMoreContacts =
    source === "CONTACTS" && contacts.length < contactTotal;

  const isLockedInPicker = (key: string) =>
    baselineKeys.has(key) && selectedKeys.has(key);

  const toggle = (person: PersonRef) => {
    const key = personKey(person);
    // Baseline members stay locked here (edit them on their owning collection).
    if (isLockedInPicker(key)) return;
    if (selectedKeys.has(key)) {
      onChange(selected.filter((s) => personKey(s) !== key));
      return;
    }
    const add = () =>
      onChange([
        ...selected,
        { ...person, giftQuantity: person.giftQuantity ?? 1 },
      ]);
    if (person.doNotGift) {
      void ask({
        variant: "confirm",
        title: "Do not gift",
        message: `${person.fullName} is marked Do not gift. Add anyway?`,
        confirmLabel: "Add anyway",
        icon: "bi-exclamation-triangle",
      }).then((ok) => {
        if (ok) add();
      });
      return;
    }
    add();
  };

  const selectAllFiltered = () => {
    const map = new Map(selected.map((s) => [personKey(s), s]));
    filtered.forEach((p) => {
      const key = personKey(p);
      if (p.doNotGift || isLockedInPicker(key)) return;
      map.set(key, p);
    });
    onChange(Array.from(map.values()));
  };

  return (
    <>
      <Box>
        {!hideSelectedPanels &&
          (splitExisting ? (
            <MemberListPanel
              people={newlySelected}
              hideWhenEmpty
              selectable
              onRemove={toggle}
            />
          ) : (
            <MemberListPanel
              people={selected}
              hideWhenEmpty
              selectable
              onRemove={toggle}
            />
          ))}

        <Tabs
          value={source}
          onChange={(_, v: SourceTab) => setSource(v)}
          sx={{ mb: 1.5, minHeight: 40 }}
        >
          <Tab
            value="CONTACTS"
            label={
              contactTotal
                ? `Contacts (${contactTotal.toLocaleString()})`
                : "Contacts"
            }
          />
          <Tab
            value="EMPLOYEES"
            label={`Employees (${employeePeople.length})`}
          />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, company, phone, email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5 }}
        />

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 1 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Chip
            size="small"
            label="Select all on this page"
            onClick={selectAllFiltered}
            clickable
            variant="outlined"
            sx={{
              borderColor: alpha(SELECTED_TRIO.c, 0.5),
              color: SELECTED_TRIO.c,
            }}
          />
          {source === "CONTACTS" && contactTotal > 0 && (
            <Typography variant="caption" color="text.secondary">
              Showing {contacts.length.toLocaleString()} of{" "}
              {contactTotal.toLocaleString()}
              {!debouncedQuery ? " — type to search all" : ""}
            </Typography>
          )}
        </Stack>

        {loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box
            sx={{
              maxHeight: 360,
              overflow: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            {filtered.length === 0 ? (
              <Typography sx={{ p: 2 }} color="text.secondary">
                No people match this search.
              </Typography>
            ) : (
              <>
                {filtered.map((p) => {
                  const key = personKey(p);
                  const alreadyInGroup = isLockedInPicker(key);
                  const checked = selectedKeys.has(key);
                  const newlyPicked = checked && !alreadyInGroup;
                  const trio = memberTrio(p.memberType);
                  const lockedTone =
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.light
                      : theme.palette.primary.dark;
                  const rowBg = alreadyInGroup
                    ? alpha(
                        theme.palette.primary.main,
                        theme.palette.mode === "dark" ? 0.2 : 0.08,
                      )
                    : newlyPicked
                      ? alpha(
                          SELECTED_TRIO.c,
                          theme.palette.mode === "dark" ? 0.22 : 0.12,
                        )
                      : "transparent";
                  return (
                    <Stack
                      key={key}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      onClick={() => toggle(p)}
                      sx={{
                        px: 1.25,
                        py: 0.75,
                        cursor: alreadyInGroup ? "default" : "pointer",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: rowBg,
                        borderLeft: newlyPicked
                          ? `3px solid ${SELECTED_TRIO.c}`
                          : alreadyInGroup
                            ? `3px solid ${theme.palette.primary.main}`
                            : "3px solid transparent",
                        "&:hover": {
                          bgcolor: alreadyInGroup
                            ? rowBg
                            : newlyPicked
                              ? rowBg
                              : alpha(trio.c, 0.06),
                        },
                      }}
                    >
                      {alreadyInGroup ? (
                        <Checkbox
                          checked
                          disabled
                          size="small"
                          inputProps={{
                            "aria-label": `Already in ${baselineLabel}`,
                          }}
                          sx={{
                            p: 0.5,
                            "&.Mui-disabled": {
                              opacity: 0.6,
                              filter: "grayscale(1)",
                            },
                          }}
                        />
                      ) : (
                        <Checkbox
                          checked={checked}
                          size="small"
                          tabIndex={-1}
                          sx={{
                            p: 0.5,
                            color: alpha(SELECTED_TRIO.c, 0.6),
                            "&.Mui-checked": { color: SELECTED_TRIO.c },
                          }}
                        />
                      )}
                      <PersonAvatar person={p} size={34} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography fontWeight={600} noWrap>
                            {p.fullName}
                          </Typography>
                          <MemberTypeChip memberType={p.memberType} />
                          {p.doNotGift && (
                            <Chip
                              size="small"
                              color="warning"
                              label="Do not gift"
                              sx={{ height: 20 }}
                            />
                          )}
                        </Stack>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {[p.companyName, p.area, p.phone, p.address]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </Typography>
                      </Box>
                      {alreadyInGroup && (
                        <Chip
                          size="small"
                          icon={<LockOutlinedIcon />}
                          label={`Already in ${baselineLabel}`}
                          sx={{
                            height: 26,
                            flexShrink: 0,
                            fontSize: 11,
                            fontWeight: 800,
                            bgcolor: alpha(
                              theme.palette.primary.main,
                              theme.palette.mode === "dark" ? 0.24 : 0.1,
                            ),
                            color: lockedTone,
                            border: "1px solid",
                            borderColor: alpha(
                              theme.palette.primary.main,
                              0.4,
                            ),
                            "& .MuiChip-icon": {
                              color: lockedTone,
                              fontSize: 15,
                            },
                          }}
                        />
                      )}
                    </Stack>
                  );
                })}
                {hasMoreContacts && (
                  <Box sx={{ p: 1, textAlign: "center" }}>
                    <WtButton
                      size="large"
                      variant="outlined"
                      onClick={loadMoreContacts}
                      disabled={loadingMore}
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </WtButton>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
      {confirmDialog}
    </>
  );
}
