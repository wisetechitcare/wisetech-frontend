/**
 * Access Control — Audit Logs.
 *
 * The ONE read-only place to inspect access-governance changes: role & permission
 * changes, assignments/removals, overrides & resets, expirations, etc. Reuses the
 * existing RBAC audit API (`getRbacAuditLogs`) and the assignment module's
 * `HistoryTimeline` (which already renders actor · action · time · old→new diff) —
 * no second timeline, no editing, no fabricated events.
 *
 * The API filters by targetType/actorId; date/action/target/search are applied
 * client-side over the fetched window. The shared AccessScopeContext is consumed
 * for context (RBAC events are keyed by employee/role, not org-tagged, so org-level
 * narrowing is surfaced honestly rather than fabricated).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Chip, CircularProgress, InputAdornment, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getRbacAuditLogs } from '@services/employeeAccess';
import { HistoryTimeline } from '@modules/assignments/components/HistoryTimeline';
import type { HistoryEntry, JsonRecord } from '@modules/assignments/types';
import { AREA_LABELS } from '@utils/accessAreas';
import { useAccessScope } from '../scope/AccessScopeContext';

// ── Value humanizers ──────────────────────────────────────────────────────────
// Audit rows store raw permission keys (`settings.employeeLevel`) and internal
// level codes (`blocked`). Translate them to the SAME business labels the rest of
// Access Control shows, so the timeline reads in plain language.

const LEVEL_LABELS: Record<string, string> = {
  blocked: 'Blocked',
  view: 'View only',
  edit: 'Can edit',
  default: 'Inherit from role',
  none: 'No access',
  allow: 'Allowed',
  deny: 'Denied',
};

/** Humanize the trailing segment of a dotted key as a fallback (no known label). */
const humanizeSegment = (s: string): string =>
  (s.split('.').pop() ?? s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** A module/section key → its business label (falls back to a humanized segment). */
const moduleLabel = (key: string): string => AREA_LABELS[key] ?? humanizeSegment(key);
const levelLabel = (v: string): string => LEVEL_LABELS[v.toLowerCase()] ?? humanizeSegment(v);

const MODULE_FIELDS = new Set(['section', 'resource', 'module']);
const MODULE_LIST_FIELDS = new Set(['resources', 'sections', 'modules']);

/** Translate the values of known permission fields into business language. */
const prettifyRecord = (rec: JsonRecord | null): JsonRecord | null => {
  if (!rec) return rec;
  const out: JsonRecord = {};
  for (const [k, v] of Object.entries(rec)) {
    if (MODULE_LIST_FIELDS.has(k)) {
      const list = Array.isArray(v) ? v : String(v ?? '').split(',');
      out[k] = list.map((x) => moduleLabel(String(x).trim())).filter(Boolean).join(', ');
    } else if (MODULE_FIELDS.has(k) && typeof v === 'string') {
      out[k] = moduleLabel(v);
    } else if (k === 'level' && typeof v === 'string') {
      out[k] = levelLabel(v);
    } else if (k === 'permission' && typeof v === 'string' && v.includes('→')) {
      const [mod, lvl] = v.split('→');
      out[k] = `${moduleLabel(mod.trim())} → ${levelLabel(lvl.trim())}`;
    } else {
      out[k] = v as JsonRecord[string];
    }
  }
  return out;
};

/** Raw RBAC audit row as returned by GET /api/audit/rbac. */
interface RbacLog {
  id: string;
  actorId: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  permissionKey: string | null;
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  createdAt: string;
}

const parse = (v: unknown): unknown => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
};
const toRecord = (v: unknown): JsonRecord | null => {
  const p = parse(v);
  if (p == null) return null;
  if (typeof p === 'object' && !Array.isArray(p)) return p as JsonRecord;
  return { value: Array.isArray(p) ? p.join(', ') : String(p) } as JsonRecord;
};

/** Adapt an RBAC log into the shared HistoryEntry shape the timeline renders. */
const adapt = (log: RbacLog): HistoryEntry => {
  const meta = (parse(log.metadata) as JsonRecord) ?? {};
  let oldValue = toRecord(log.oldValue);
  let newValue = toRecord(log.newValue);
  // When there is no explicit value change, surface the metadata so the event is
  // still meaningful (e.g. an assignment's role/scope, or the target).
  if (!oldValue && !newValue) {
    const base: JsonRecord = { ...meta };
    if (log.targetType) base.target = `${log.targetType}${log.targetId ? `: ${log.targetId}` : ''}`;
    if (log.permissionKey) base.permission = log.permissionKey;
    newValue = Object.keys(base).length ? base : null;
  }
  return {
    id: log.id,
    action: log.action,
    at: log.createdAt,
    actor: log.actorName ? { name: log.actorName, avatar: log.actorAvatar ?? null } : null,
    oldValue: prettifyRecord(oldValue),
    newValue: prettifyRecord(newValue),
    metadata: meta,
  };
};

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState<RbacLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [target, setTarget] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { labels } = useAccessScope();

  const scopePath = [labels.organization, labels.subOrganization, labels.branch, labels.department].filter(Boolean).join(' › ');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRbacAuditLogs({ limit: 500 })
      .then((rows: RbacLog[]) => { if (alive) setLogs(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const actionTypes = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromT = from ? new Date(from).getTime() : null;
    const toT = to ? new Date(to).getTime() + 86_400_000 : null; // inclusive end-of-day
    return logs.filter((l) => {
      if (action !== 'all' && l.action !== action) return false;
      if (target !== 'all' && (l.targetType ?? '') !== target) return false;
      const t = new Date(l.createdAt).getTime();
      if (fromT && t < fromT) return false;
      if (toT && t > toT) return false;
      if (term) {
        const hay = `${l.action} ${l.actorName ?? ''} ${l.targetType ?? ''} ${l.targetId ?? ''} ${l.permissionKey ?? ''} ${JSON.stringify(l.oldValue ?? '')} ${JSON.stringify(l.newValue ?? '')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [logs, search, action, target, from, to]);

  const entries = useMemo(() => filtered.map(adapt), [filtered]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>Audit Logs</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Read-only history of access-governance changes — who changed what, when, and how.
        {scopePath ? ` · Scope: ${scopePath}` : ''}
      </Typography>

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField
          size="small" placeholder="Search actor, role, permission…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField select size="small" label="Action" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">All actions</MenuItem>
          {actionTypes.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Target" value={target} onChange={(e) => setTarget(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="all">All targets</MenuItem>
          <MenuItem value="employee">Employee</MenuItem>
          <MenuItem value="role">Role</MenuItem>
          <MenuItem value="tenant">Tenant</MenuItem>
          <MenuItem value="organizational_unit">Org unit</MenuItem>
        </TextField>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
      ) : error ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>Could not load audit logs.</Typography>
      ) : entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>No audit events match the current filters.</Typography>
      ) : (
        <>
          <Chip size="small" variant="outlined" label={`${entries.length} event${entries.length === 1 ? '' : 's'}`} sx={{ mb: 2 }} />
          <HistoryTimeline entries={entries} />
        </>
      )}
    </Box>
  );
};

export default AuditLogsPage;
