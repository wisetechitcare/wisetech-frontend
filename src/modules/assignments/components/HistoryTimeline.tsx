import { Avatar, Box, Chip, Typography } from '@mui/material';
import type { HistoryEntry, JsonRecord } from '../types';
import { actionLabel, actionTone } from '../utils/labels';
import { formatDateTime, initials } from '../utils/format';

const TONE_COLOR: Record<ReturnType<typeof actionTone>, string> = {
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
  info: 'info.main',
};

/** Render a scalar JSON value as a short string. */
const asText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/** Compact old → new diff across the union of keys present in either object. */
const buildDiff = (oldValue: JsonRecord | null, newValue: JsonRecord | null): { key: string; from: string; to: string }[] => {
  if (!oldValue && !newValue) return [];
  const keys = new Set<string>([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]);
  const rows: { key: string; from: string; to: string }[] = [];
  keys.forEach((key) => {
    const from = asText(oldValue?.[key]);
    const to = asText(newValue?.[key]);
    if (from !== to) rows.push({ key, from, to });
  });
  return rows;
};

const humanizeKey = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const TimelineItem = ({ entry, last }: { entry: HistoryEntry; last: boolean }) => {
  const tone = actionTone(entry.action);
  const diff = buildDiff(entry.oldValue, entry.newValue);

  return (
    <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
      {/* Rail */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Box aria-hidden="true" sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: TONE_COLOR[tone], mt: 0.5, boxShadow: (t) => `0 0 0 3px ${t.palette.background.paper}` }} />
        {!last && <Box aria-hidden="true" sx={{ flexGrow: 1, width: 2, bgcolor: 'divider', my: 0.5 }} />}
      </Box>

      {/* Content */}
      <Box sx={{ pb: last ? 0 : 3, minWidth: 0, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{actionLabel(entry.action)}</Typography>
          <Typography variant="caption" color="text.secondary">{formatDateTime(entry.at)}</Typography>
        </Box>

        {entry.actor && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            <Avatar src={entry.actor.avatar ?? undefined} sx={{ width: 20, height: 20, fontSize: 10 }}>
              {initials(entry.actor.name)}
            </Avatar>
            <Typography variant="caption" color="text.secondary">by {entry.actor.name}</Typography>
          </Box>
        )}

        {diff.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {diff.map((d) => (
              <Box key={d.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 90 }}>{humanizeKey(d.key)}</Typography>
                <Chip size="small" variant="outlined" label={d.from} sx={{ borderRadius: 1, height: 20, textDecoration: 'line-through', opacity: 0.7 }} />
                <Box aria-hidden="true" component="span" sx={{ color: 'text.disabled' }}>→</Box>
                <Chip size="small" color="primary" variant="outlined" label={d.to} sx={{ borderRadius: 1, height: 20 }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

/** Vertical audit timeline of assignment history entries (newest first). */
export const HistoryTimeline = ({ entries }: { entries: HistoryEntry[] }) => (
  <Box sx={{ mt: 1 }}>
    {entries.map((entry, i) => (
      <TimelineItem key={entry.id} entry={entry} last={i === entries.length - 1} />
    ))}
  </Box>
);

export default HistoryTimeline;
