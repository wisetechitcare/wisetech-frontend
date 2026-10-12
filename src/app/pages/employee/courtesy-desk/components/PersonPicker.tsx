import { useEffect, useMemo, useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@redux/store';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { getAllClientContacts } from '@services/companies';
import type { MemberType, PersonRef } from '../types';

type SourceTab = 'CONTACTS' | 'EMPLOYEES';

interface PersonPickerProps {
  selected: PersonRef[];
  onChange: (next: PersonRef[]) => void;
}

function matchesQuery(haystack: string, q: string) {
  return haystack.toLowerCase().includes(q.toLowerCase());
}

function personKey(p: Pick<PersonRef, 'memberType' | 'personId'>) {
  return `${p.memberType}:${p.personId}`;
}

export default function PersonPicker({ selected, onChange }: PersonPickerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.allEmployees.list);
  const [source, setSource] = useState<SourceTab>('CONTACTS');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<PersonRef[]>([]);

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllClientContacts({}, true)
      .then((res) => {
        if (cancelled) return;
        const rows = (res?.data?.contacts || res?.contacts || []) as any[];
        setContacts(
          rows.map((c) => ({
            memberType: 'CONTACT' as MemberType,
            personId: String(c.id),
            fullName: c.fullName || c.name || 'Unnamed',
            companyName: c.company?.companyName || c.companyName || '',
            area: c.area || c.city || '',
            address: c.address || '',
            phone: c.phone || '',
            email: c.email || '',
            doNotGift: Boolean(c.doNotGift),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const employeePeople: PersonRef[] = useMemo(
    () =>
      employees
        .filter((e) => e.isActive !== false)
        .map((e) => ({
          memberType: 'EMPLOYEE' as MemberType,
          personId: String(e.employeeId),
          fullName: e.employeeName || 'Unnamed',
          companyName: 'Wisetech',
          area: 'Office',
          address: '',
        })),
    [employees]
  );

  const selectedKeys = useMemo(() => new Set(selected.map(personKey)), [selected]);

  const filtered = useMemo(() => {
    const pool = source === 'CONTACTS' ? contacts : employeePeople;
    const q = query.trim();
    const list = !q
      ? pool
      : pool.filter((p) =>
          matchesQuery(
            [p.fullName, p.companyName, p.area, p.address, p.phone].filter(Boolean).join(' '),
            q
          )
        );
    // selected always float to top within current source results
    return [...list]
      .sort((a, b) => Number(selectedKeys.has(personKey(b))) - Number(selectedKeys.has(personKey(a))))
      .slice(0, 120);
  }, [source, contacts, employeePeople, query, selectedKeys]);

  const toggle = (person: PersonRef) => {
    const key = personKey(person);
    if (selectedKeys.has(key)) {
      onChange(selected.filter((s) => personKey(s) !== key));
      return;
    }
    if (person.doNotGift) {
      const ok = window.confirm(`${person.fullName} is marked Do not gift. Add anyway?`);
      if (!ok) return;
    }
    onChange([...selected, person]);
  };

  const selectAllFiltered = () => {
    const map = new Map(selected.map((s) => [personKey(s), s]));
    filtered.forEach((p) => {
      if (!p.doNotGift) map.set(personKey(p), p);
    });
    onChange(Array.from(map.values()));
  };

  return (
    <Box>
      {/* Always show selected people on top */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={700}>Selected people ({selected.length})</Typography>
          {selected.length > 0 && (
            <Chip size="small" label="Clear all" onClick={() => onChange([])} clickable />
          )}
        </Stack>
        {selected.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No one selected yet — search and tick people below.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {selected.map((p) => (
              <Stack
                key={personKey(p)}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600} noWrap>
                      {p.fullName}
                    </Typography>
                    <Chip
                      size="small"
                      label={p.memberType === 'CONTACT' ? 'Contact' : 'Employee'}
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {[p.companyName, p.area, p.phone, p.address].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => toggle(p)} aria-label="Remove">
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      <Tabs value={source} onChange={(_, v: SourceTab) => setSource(v)} sx={{ mb: 1.5, minHeight: 40 }}>
        <Tab value="CONTACTS" label={`Contacts (${contacts.length})`} />
        <Tab value="EMPLOYEES" label={`Employees (${employeePeople.length})`} />
      </Tabs>

      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, company, area, address, phone…"
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

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Chip size="small" label="Select all matching" onClick={selectAllFiltered} clickable />
      </Stack>

      {loading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box
          sx={{
            maxHeight: 360,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          {filtered.length === 0 ? (
            <Typography sx={{ p: 2 }} color="text.secondary">
              No people match this search.
            </Typography>
          ) : (
            filtered.map((p) => {
              const key = personKey(p);
              const checked = selectedKeys.has(key);
              return (
                <Stack
                  key={key}
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  onClick={() => toggle(p)}
                  sx={{
                    px: 1.5,
                    py: 1,
                    cursor: 'pointer',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: checked ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox checked={checked} size="small" tabIndex={-1} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600} noWrap>
                        {p.fullName}
                      </Typography>
                      <Chip
                        size="small"
                        label={p.memberType === 'CONTACT' ? 'Contact' : 'Employee'}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                      {p.doNotGift && (
                        <Chip size="small" color="warning" label="Do not gift" sx={{ height: 20 }} />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {[p.companyName, p.area, p.phone, p.address].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  </Box>
                </Stack>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}
