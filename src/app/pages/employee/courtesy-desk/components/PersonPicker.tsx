import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { getAllClientContacts } from "@services/companies";
import { initialsOf } from "@app/modules/common/components/EmployeeIdentityCell";
import { TRIO, type Trio } from "@app/modules/common/components/ui/patterns";
import type { MemberType, PersonRef } from "../types";

type SourceTab = "CONTACTS" | "EMPLOYEES";

/** ~15 compact rows visible before scroll */
const SELECTED_LIST_MAX_HEIGHT = 480;

/** Same page size as ContactPicker — server searches; we do not ship 6k rows. */
const CONTACT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 250;

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
}

function matchesQuery(haystack: string, q: string) {
  return haystack.toLowerCase().includes(q.toLowerCase());
}

function personKey(p: Pick<PersonRef, "memberType" | "personId">) {
  return `${p.memberType}:${p.personId}`;
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

export default function PersonPicker({
  selected,
  onChange,
}: PersonPickerProps) {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.allEmployees.list);
  const [source, setSource] = useState<SourceTab>("CONTACTS");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contacts, setContacts] = useState<PersonRef[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactTotal, setContactTotal] = useState(0);

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
        const rows = (body.contacts || []) as any[];
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
        const rows = (body.contacts || []) as any[];
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
      employees
        .filter((e) => e.isActive !== false)
        .map((e) => ({
          memberType: "EMPLOYEE" as MemberType,
          personId: String(e.employeeId),
          fullName: e.employeeName || "Unnamed",
          companyName: "Wisetech",
          area: "Office",
          address: "",
          avatarUrl: e.avatar || "",
        })),
    [employees],
  );

  const selectedKeys = useMemo(
    () => new Set(selected.map(personKey)),
    [selected],
  );

  const filtered = useMemo(() => {
    if (source === "CONTACTS") {
      // Server already filtered; do not re-filter (phone/email matches would disappear).
      return [...contacts].sort(
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
    return [...list].sort(
      (a, b) =>
        Number(selectedKeys.has(personKey(b))) -
        Number(selectedKeys.has(personKey(a))),
    );
  }, [source, contacts, employeePeople, query, selectedKeys]);

  const hasMoreContacts =
    source === "CONTACTS" && contacts.length < contactTotal;

  const toggle = (person: PersonRef) => {
    const key = personKey(person);
    if (selectedKeys.has(key)) {
      onChange(selected.filter((s) => personKey(s) !== key));
      return;
    }
    if (person.doNotGift) {
      const ok = window.confirm(
        `${person.fullName} is marked Do not gift. Add anyway?`,
      );
      if (!ok) return;
    }
    onChange([
      ...selected,
      { ...person, giftQuantity: person.giftQuantity ?? 1 },
    ]);
  };

  const selectAllFiltered = () => {
    const map = new Map(selected.map((s) => [personKey(s), s]));
    filtered.forEach((p) => {
      if (!p.doNotGift) map.set(personKey(p), p);
    });
    onChange(Array.from(map.values()));
  };

  const selectedBorder = alpha(SELECTED_TRIO.c, 0.45);
  const selectedBg = alpha(
    SELECTED_TRIO.c,
    theme.palette.mode === "dark" ? 0.12 : 0.06,
  );

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: `1px solid ${selectedBorder}`,
          bgcolor: selectedBg,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 0.75, px: 0.25 }}
        >
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: SELECTED_TRIO.c }}
          >
            Selected ({selected.length})
          </Typography>
          {selected.length > 0 && (
            <Chip
              size="small"
              label="Clear all"
              onClick={() => onChange([])}
              clickable
              variant="outlined"
              sx={{
                borderColor: alpha(SELECTED_TRIO.c, 0.5),
                color: SELECTED_TRIO.c,
                height: 24,
              }}
            />
          )}
        </Stack>
        {selected.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 0.25 }}>
            No one selected yet — search and tick people below.
          </Typography>
        ) : (
          <>
            {selected.length > 12 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5, px: 0.25 }}
              >
                Scroll to see all {selected.length} selected
              </Typography>
            )}
            <Box
              sx={{
                maxHeight: SELECTED_LIST_MAX_HEIGHT,
                overflowY: "auto",
                pr: 0.5,
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.text.primary, 0.2),
                },
              }}
            >
              <Stack spacing={0.5}>
                {selected.map((p) => (
                  <Stack
                    key={personKey(p)}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.25,
                      bgcolor: alpha(
                        SELECTED_TRIO.c,
                        theme.palette.mode === "dark" ? 0.2 : 0.1,
                      ),
                      border: `1px solid ${alpha(SELECTED_TRIO.c, 0.28)}`,
                    }}
                  >
                    <PersonAvatar person={p} size={28} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        flexWrap="nowrap"
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          noWrap
                          sx={{ minWidth: 0 }}
                        >
                          {p.fullName}
                        </Typography>
                        <MemberTypeChip memberType={p.memberType} />
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        display="block"
                      >
                        {[p.companyName, p.area].filter(Boolean).join(" · ") ||
                          "—"}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => toggle(p)}
                      aria-label="Remove"
                      sx={{ color: "text.secondary" }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </>
        )}
      </Box>

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
        <Tab value="EMPLOYEES" label={`Employees (${employeePeople.length})`} />
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
                const checked = selectedKeys.has(key);
                const trio = memberTrio(p.memberType);
                const rowBg = checked
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
                      cursor: "pointer",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: rowBg,
                      borderLeft: checked
                        ? `3px solid ${SELECTED_TRIO.c}`
                        : "3px solid transparent",
                      "&:hover": {
                        bgcolor: checked ? rowBg : alpha(trio.c, 0.06),
                      },
                    }}
                  >
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
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {[p.companyName, p.area, p.phone, p.address]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
              {hasMoreContacts && (
                <Box sx={{ p: 1, textAlign: "center" }}>
                  <Button
                    size="large"
                    variant="outlined"
                    onClick={loadMoreContacts}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
