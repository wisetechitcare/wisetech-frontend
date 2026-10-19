import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { getMeetingsWorkspaceSummary } from '@services/meetingAgendaMom';

type MomRow = {
  meetingId: string;
  title: string;
  documentNo?: string | null;
  revision?: number;
  status?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  updatedAt?: string | Date | null;
};

type MeetingOpt = { id: string; label: string; search: string };

/**
 * MoM hub — drafts and finalized listed up front (same source as Overview counts).
 * Meeting search stays as a secondary way to open any meeting's MoM workspace.
 */
export default function MeetingsMomHubTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<MomRow[]>([]);
  const [finalized, setFinalized] = useState<MomRow[]>([]);
  const [pickerOptions, setPickerOptions] = useState<MeetingOpt[]>([]);
  const [pickedId, setPickedId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMeetingsWorkspaceSummary();
        if (cancelled) return;
        const s = res.summary || {};
        setDrafts(s.momDrafts || []);
        setFinalized(s.momFinalized || []);
        const all = [
          ...(s.upcoming || []),
          ...(s.recentCompleted || []),
          ...(s.withoutAgenda || []),
          ...(s.momDrafts || []).map((d: MomRow) => ({
            id: d.meetingId,
            title: d.title,
            startDate: d.startDate,
          })),
        ];
        const seen = new Set<string>();
        const opts: MeetingOpt[] = [];
        for (const m of all) {
          const id = String(m.id || m.meetingId || '');
          if (!id || seen.has(id)) continue;
          seen.add(id);
          const when = m.startDate ? dayjs(m.startDate).format('DD MMM YYYY') : '';
          const title = m.title || 'Meeting';
          opts.push({
            id,
            label: when ? `${title} · ${when}` : title,
            search: `${title} ${when}`.toLowerCase(),
          });
        }
        setPickerOptions(opts.sort((a, b) => a.label.localeCompare(b.label)));
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || 'Could not load Minutes of Meeting');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const picked = useMemo(
    () => pickerOptions.find((o) => o.id === pickedId) ?? null,
    [pickerOptions, pickedId],
  );

  const openMom = (meetingId: string) => {
    navigate(`/employees/meetings/agenda?meeting=${meetingId}&panel=mom`);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box className="px-lg-0 px-2 pt-4" sx={{ pb: 4, maxWidth: 960, width: '100%', minWidth: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drafts and finalized minutes for meetings you can access. Open a row to continue on the
        meeting detail page.
      </Typography>

      <Section
        title={`Drafts (${drafts.length})`}
        empty="No MoM drafts."
        rows={drafts.map((d) => (
          <MomCard key={d.meetingId} row={d} badge="Draft" onOpen={() => openMom(d.meetingId)} />
        ))}
      />

      <Section
        title={`Finalized (${finalized.length})`}
        empty="No finalized MoMs yet."
        rows={finalized.map((d) => (
          <MomCard
            key={d.meetingId}
            row={d}
            badge="Final"
            onOpen={() => openMom(d.meetingId)}
          />
        ))}
      />

      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Open another meeting
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Autocomplete
            size="small"
            sx={{ minWidth: 280, flex: 1 }}
            options={pickerOptions}
            value={picked}
            onChange={(_, next) => setPickedId(next?.id || '')}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(opts, { inputValue }) => {
              const words = inputValue.toLowerCase().split(/\s+/).filter(Boolean);
              return words.length
                ? opts.filter((o) => words.every((w) => o.search.includes(w)))
                : opts;
            }}
            renderInput={(params) => (
              <TextField {...params} label="Meeting" placeholder="Search meetings…" />
            )}
          />
          <Button
            variant="contained"
            disabled={!pickedId}
            onClick={() => pickedId && openMom(pickedId)}
          >
            Open MoM workspace
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function Section({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: ReactNode[];
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {!rows.length ? (
        <Typography variant="body2" color="text.secondary">
          {empty}
        </Typography>
      ) : (
        <Stack spacing={1}>{rows}</Stack>
      )}
    </Box>
  );
}

function MomCard({
  row,
  badge,
  onOpen,
}: {
  row: MomRow;
  badge: string;
  onOpen: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography fontWeight={700} noWrap>
          {row.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {row.documentNo || '—'}
          {' · '}
          Rev. {String(row.revision ?? 0).padStart(2, '0')}
          {row.startDate ? ` · ${dayjs(row.startDate).format('DD MMM YYYY')}` : ''}
        </Typography>
      </Box>
      <Box
        component="span"
        sx={{
          px: 1,
          py: 0.35,
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          bgcolor: badge === 'Draft' ? 'info.50' : 'success.50',
          color: badge === 'Draft' ? 'info.dark' : 'success.dark',
          border: '1px solid',
          borderColor: badge === 'Draft' ? 'info.100' : 'success.100',
        }}
      >
        {badge}
      </Box>
      <Button size="small" variant="outlined" onClick={onOpen}>
        Open
      </Button>
    </Box>
  );
}
