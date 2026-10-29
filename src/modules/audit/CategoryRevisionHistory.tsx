import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Collapse, Skeleton, Typography, type Theme } from '@mui/material';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { AuditApi, AuditChangeSet, AuditEntityType, AuditFieldChange } from './audit.service';
import { fullDateTime } from './time';
import { formatDate } from '@utils/dateFormats';

/**
 * How a collection row's figures moved over its revisions, shown where the data lives.
 *
 * Reads the same `AuditApi.timeline` as the Audit tab, keeps only the changes whose
 * `fieldName` starts with `fieldPrefix` (e.g. 'commercials'), and folds them per row:
 *
 *   Rate (MEP)   Originally ₹7  →  R1 ₹0  →  R4 ₹20  · Current
 *
 * so a client can see what it was, what it became, and what it is now — not a feed of
 * revisions to piece together.
 *
 * Needs the classifier's `<Field> (<Row>)` labels (plain collection diffs). A row that
 * was added or removed is a single event, not a field chain.
 */

interface Props {
  type: AuditEntityType;
  id?: string;
  /** `fieldName` prefix to keep, e.g. 'commercials'. */
  fieldPrefix: string;
  /** Narrow layout for a sidebar. */
  compact?: boolean;
  /** Rows shown before "Show all". */
  initialCount?: number;
}

const FETCH_LIMIT = 100;
const EMPTY = '—';

interface Step {
  rev: number;
  by: string;
  at: string;
  value: string;
}
interface FieldTrail {
  label: string;
  /** Value before the first recorded change. */
  original: string;
  steps: Step[];
}
interface RowTrail {
  row: string;
  lastRev: number;
  fields: Map<string, FieldTrail>;
  events: Array<{ rev: number; kind: 'ADDED' | 'REMOVED'; text: string; by: string; at: string }>;
}

const actorName = (cs: AuditChangeSet) =>
  [cs.changedByFirstName, cs.changedByLastName].filter(Boolean).join(' ') || 'System';

/** "Rate (MEP)" → { field: "Rate", row: "MEP" } — the row is the LAST parenthesised group. */
const splitLabel = (label: string): { field: string; row: string } | null => {
  const m = /^(.*)\s\(([^()]*)\)$/.exec(label.trim());
  return m ? { field: m[1], row: m[2] } : null;
};

function buildTrails(changeSets: AuditChangeSet[], prefix: string): RowTrail[] {
  const rows = new Map<string, RowTrail>();
  // Oldest first, so each field's steps read in the order they happened.
  const ordered = [...changeSets].sort((a, b) => a.revisionNumber - b.revisionNumber);

  for (const cs of ordered) {
    for (const c of cs.changes ?? ([] as AuditFieldChange[])) {
      if (!c.fieldName.startsWith(prefix)) continue;
      const parts = splitLabel(c.fieldLabel);
      if (!parts) continue;
      const row: RowTrail = rows.get(parts.row) ?? { row: parts.row, lastRev: 0, fields: new Map(), events: [] };
      row.lastRev = Math.max(row.lastRev, cs.revisionNumber);
      const by = actorName(cs);

      if (c.changeType === 'ADDED' || c.changeType === 'REMOVED') {
        row.events.push({
          rev: cs.revisionNumber,
          kind: c.changeType,
          text: c.changeType === 'ADDED' ? c.newValueFormatted : c.oldValueFormatted,
          by,
          at: cs.changedAt,
        });
      } else {
        const trail = row.fields.get(parts.field) ?? { label: parts.field, original: c.oldValueFormatted || EMPTY, steps: [] };
        trail.steps.push({ rev: cs.revisionNumber, by, at: cs.changedAt, value: c.newValueFormatted || EMPTY });
        row.fields.set(parts.field, trail);
      }
      rows.set(parts.row, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.lastRev - a.lastRev);
}

const cellSx = { px: 1.5, py: 1, fontSize: 12.5, borderBottom: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap' } as const;
const headSx = { ...cellSx, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'background.paper', verticalAlign: 'bottom' } as const;
// Explicit pair rather than the theme's success.light/dark, which rendered dark-on-dark.
const nowBg = (t: Theme) => (t.palette.mode === 'dark' ? 'rgba(74,222,128,0.16)' : '#DCFCE7');
const nowFg = (t: Theme) => (t.palette.mode === 'dark' ? '#86EFAC' : '#166534');

/** One work area as a grid: a row per figure, a column per moment — Originally, each revision that touched it, Now. */
const RowBlock: React.FC<{ r: RowTrail }> = ({ r }) => {
  const trails = [...r.fields.values()];
  const meta = new Map<number, { by: string; at: string }>();
  trails.forEach((t) => t.steps.forEach((s) => meta.set(s.rev, { by: s.by, at: s.at })));
  const revs = [...meta.keys()].sort((a, b) => a - b);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 2, py: 1.25, bgcolor: 'action.hover', borderBottom: trails.length || r.events.length ? '1px solid' : 0, borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{r.row}</Typography>
        {r.events.map((e) => (
          <Box
            key={`${e.kind}-${e.rev}`}
            title={`${e.by} · ${fullDateTime(e.at)}`}
            sx={(t) => ({
              px: 1, py: 0.25, borderRadius: '999px', fontSize: 11, fontWeight: 700,
              bgcolor: e.kind === 'ADDED' ? nowBg(t) : t.palette.mode === 'dark' ? 'rgba(248,113,113,0.16)' : '#FEE2E2',
              color: e.kind === 'ADDED' ? nowFg(t) : t.palette.mode === 'dark' ? '#FCA5A5' : '#991B1B',
            })}
          >
            {e.kind === 'ADDED' ? 'Added' : 'Removed'} in R{e.rev}
          </Box>
        ))}
      </Box>

      {r.events.some((e) => e.text) && (
        <Typography sx={{ px: 2, py: 1, fontSize: 12, color: 'text.secondary', borderBottom: trails.length ? '1px solid' : 0, borderColor: 'divider' }}>
          {r.events.find((e) => e.text)?.text}
        </Typography>
      )}

      {trails.length > 0 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Box component="th" sx={{ ...headSx, textAlign: 'left' }}>Figure</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'left' }}>Originally</Box>
                {revs.map((n) => (
                  <Box component="th" key={n} sx={{ ...headSx, textAlign: 'left' }} title={`${meta.get(n)?.by} · ${fullDateTime(meta.get(n)?.at)}`}>
                    R{n}
                    <Box component="span" sx={{ ml: 0.75, fontSize: 10.5, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>·&nbsp;
                      {formatDate(meta.get(n)?.at)}
                    </Box>
                  </Box>
                ))}
                <Box component="th" sx={(t) => ({ ...headSx, textAlign: 'left', color: nowFg(t), bgcolor: nowBg(t) })}>Now</Box>
              </tr>
            </thead>
            <tbody>
              {trails.map((t) => (
                <tr key={t.label}>
                  <Box component="td" sx={{ ...cellSx, fontWeight: 600 }}>{t.label}</Box>
                  <Box component="td" sx={{ ...cellSx, color: 'text.secondary' }}>{t.original}</Box>
                  {revs.map((n) => {
                    const s = t.steps.find((x) => x.rev === n);
                    return (
                      <Box component="td" key={n} sx={{ ...cellSx, fontWeight: s ? 600 : 400, color: s ? 'text.primary' : 'text.disabled' }}>
                        {s ? s.value : '·'}
                      </Box>
                    );
                  })}
                  <Box component="td" sx={(th) => ({ ...cellSx, fontWeight: 700, color: nowFg(th), bgcolor: nowBg(th) })}>
                    {t.steps[t.steps.length - 1].value}
                  </Box>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Box>
  );
};

/**
 * Narrow layout (the form's summary sidebar): one dropdown per work area, and inside it the
 * revisions newest first, each listing only what THAT revision changed (was → now). Nothing
 * repeats: a revision tag appears once, not once per figure.
 */
const CompactRow: React.FC<{ r: RowTrail }> = ({ r }) => {
  const [open, setOpen] = useState(true);

  const revisions = useMemo(() => {
    const byRev = new Map<number, { rev: number; by: string; at: string; items: Array<{ label: string; from: string; to: string }> }>();
    for (const t of r.fields.values()) {
      let prev = t.original;
      for (const s of t.steps) {
        const g = byRev.get(s.rev) ?? { rev: s.rev, by: s.by, at: s.at, items: [] };
        g.items.push({ label: t.label, from: prev, to: s.value });
        byRev.set(s.rev, g);
        prev = s.value;
      }
    }
    return [...byRev.values()].sort((a, b) => b.rev - a.rev);
  }, [r]);

  const latest = Math.max(r.lastRev, 0);
  const added = r.events.find((e) => e.kind === 'ADDED');
  const removed = r.events.find((e) => e.kind === 'REMOVED');

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, width: '100%', textAlign: 'left', cursor: 'pointer',
          border: 0, outline: 'none', bgcolor: open ? 'action.hover' : 'transparent', color: 'text.primary', px: 1.5, py: 1,
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus-visible': { boxShadow: (t) => `inset 0 0 0 2px ${t.palette.primary.main}55` },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap title={r.row} sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{r.row}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
            {removed ? `Removed in R${removed.rev}` : added && !revisions.length ? `Added in R${added.rev}` : `Last changed R${latest}`}
          </Typography>
        </Box>
        {added && (
          <Box sx={(t) => ({ px: 0.875, py: 0.125, borderRadius: '999px', fontSize: 10.5, fontWeight: 700, bgcolor: nowBg(t), color: nowFg(t), whiteSpace: 'nowrap' })} title={`${added.by} · ${fullDateTime(added.at)}`}>
            Added · R{added.rev}
          </Box>
        )}
        {removed && (
          <Box sx={(t) => ({ px: 0.875, py: 0.125, borderRadius: '999px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', bgcolor: t.palette.mode === 'dark' ? 'rgba(248,113,113,0.16)' : '#FEE2E2', color: t.palette.mode === 'dark' ? '#FCA5A5' : '#991B1B' })}>
            Removed · R{removed.rev}
          </Box>
        )}
        <AppIcon name="bi-chevron-down" className="fs-7" aria-hidden style={{ flexShrink: 0, transition: 'transform .2s ease', transform: open ? 'rotate(180deg)' : 'none' }} />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {added?.text && (
            <Typography sx={{ px: 1.5, py: 1, fontSize: 11.5, color: 'text.secondary', borderBottom: revisions.length ? '1px solid' : 0, borderColor: 'divider' }}>
              {added.text}
            </Typography>
          )}
          {[...r.fields.values()].map((t, fi) => {
            const steps: Array<{ key: string; tag: string; sub?: string; value: string; kind: 'old' | 'mid' | 'now'; title?: string }> = [
              { key: 'orig', tag: 'Originally', value: t.original, kind: 'old' },
              ...t.steps.map((s, i) => ({
                key: String(s.rev),
                tag: `R${s.rev}`,
                sub: formatDate(s.at),
                value: s.value,
                kind: (i === t.steps.length - 1 ? 'now' : 'mid') as 'now' | 'mid',
                title: `${s.by} · ${fullDateTime(s.at)}`,
              })),
            ];
            return (
              <Box key={t.label} sx={{ px: 1.5, pt: 1, pb: 1.25, borderTop: fi || added?.text ? '1px solid' : 0, borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.75 }}>
                  {t.label}
                </Typography>
                <Box sx={{ position: 'relative', pl: 2 }}>
                  <Box sx={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 2, bgcolor: 'divider' }} aria-hidden />
                  {steps.map((s) => (
                    <Box
                      key={s.key}
                      title={s.title}
                      sx={(th) => ({
                        position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1,
                        px: 1, py: 0.5, mb: 0.25, borderRadius: '6px',
                        bgcolor: s.kind === 'now' ? nowBg(th) : 'transparent',
                      })}
                    >
                      <Box
                        sx={(th) => ({
                          position: 'absolute', left: -16, top: 11, width: 10, height: 10, borderRadius: '50%',
                          bgcolor: s.kind === 'now' ? nowFg(th) : 'background.paper',
                          border: '2px solid', borderColor: s.kind === 'now' ? nowFg(th) : 'divider',
                        })}
                        aria-hidden
                      />
                      <Typography component="span" sx={(th) => ({ fontSize: 11, fontWeight: 600, color: s.kind === 'now' ? nowFg(th) : 'text.secondary', whiteSpace: 'nowrap' })}>
                        {s.tag}
                        {s.sub && <Box component="span" sx={{ fontWeight: 400, opacity: 0.8 }}> · {s.sub}</Box>}
                        {s.kind === 'now' && ' · Now'}
                      </Typography>
                      <Typography
                        component="span"
                        sx={(th) => ({
                          fontSize: 12.5, textAlign: 'right', wordBreak: 'break-word',
                          fontWeight: s.kind === 'now' ? 700 : 500,
                          color: s.kind === 'now' ? nowFg(th) : s.kind === 'old' ? 'text.secondary' : 'text.primary',
                          textDecoration: s.kind === 'old' ? 'line-through' : 'none',
                        })}
                      >
                        {s.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
};

const CategoryRevisionHistory: React.FC<Props> = ({ type, id, fieldPrefix, initialCount = 3, compact = false }) => {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(false); // closed until asked for — it's reference, not the task

  const { data, isLoading } = useQuery({
    queryKey: ['audit-row-trail', type, id, fieldPrefix],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => AuditApi.timeline(type, id as string, { limit: FETCH_LIMIT }),
  });

  const trails = useMemo(() => buildTrails(data?.changeSets ?? [], fieldPrefix), [data, fieldPrefix]);

  // Nothing to say is nothing to show: no empty card on a lead that was never revised.
  if (!id || (!compact && !isLoading && trails.length === 0)) return null;

  const visible = showAll ? trails : trails.slice(0, initialCount);

  const latestRev = trails.reduce((m, r) => Math.max(m, r.lastRev), 0);

  // Sidebar: no outer dropdown — the work areas ARE the dropdowns.
  if (compact) {
    return (
      <Box>
        {isLoading ? (
          <Skeleton variant="rounded" height={48} />
        ) : trails.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
            No commercial changes yet. Once this lead is saved as a revision, what each figure was and what it became will appear here.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {trails.map((r) => (
              <CompactRow key={r.row} r={r} />
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', textAlign: 'left', cursor: 'pointer',
          border: 0, bgcolor: 'transparent', color: 'text.primary', px: 1, py: 0.75, borderRadius: '10px',
          outline: 'none',
          '&:hover': { bgcolor: 'action.hover' },
          // A thin ring for keyboard users only; the browser's heavy default showed on every click.
          '&:focus-visible': { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}55` },
        }}
      >
        <AppIcon name="bi-clock-history" aria-hidden />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>Revision trail</Typography>
          {!isLoading && (
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3 }}>
              {trails.length} work area{trails.length === 1 ? '' : 's'} changed · latest R{latestRev}
            </Typography>
          )}
        </Box>
        <AppIcon
          name="bi-chevron-down"
          className="fs-7"
          aria-hidden
          style={{ flexShrink: 0, transition: 'transform .2s ease', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ pt: 1.5 }}>
          {isLoading ? (
            <Skeleton variant="rounded" height={72} />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {visible.map((r) => (
                <RowBlock key={r.row} r={r} />
              ))}
              {trails.length > initialCount && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  sx={{ alignSelf: 'flex-start', border: 0, bgcolor: 'transparent', color: 'primary.main', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', p: 0 }}
                >
                  {showAll ? 'Show fewer' : `Show all ${trails.length} work areas`}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default CategoryRevisionHistory;
