import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { WtButton, WtSwitch } from '@app/modules/common/components/ui';
import {
  createCompanyAgendaCategory,
  createCompanyMeetingPurpose,
  getCompanyAgendaCategories,
  getCompanyMeetingPurposes,
  updateCompanyAgendaCategory,
  updateCompanyMeetingPurpose,
} from '@services/meetingAgendaMom';
import { MeetingsAppearancePanel } from '../../calendar/views/CalendarConfigure';

/**
 * Meetings → Configure: calendar appearance (moved from Calendar → Configure → Meetings),
 * agenda categories, and configurable meeting purposes.
 */
export default function MeetingsConfigureTab() {
  const [categories, setCategories] = useState<any[]>([]);
  const [purposes, setPurposes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [purposeName, setPurposeName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [cats, purps] = await Promise.all([
      getCompanyAgendaCategories(),
      getCompanyMeetingPurposes(),
    ]);
    setCategories(cats.categories || []);
    setPurposes(purps.purposes || []);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Could not load configuration');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addCategory = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCompanyAgendaCategory({ name: name.trim() });
      setName('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not create category');
    } finally {
      setBusy(false);
    }
  };

  const toggleCategory = async (cat: any) => {
    setBusy(true);
    try {
      await updateCompanyAgendaCategory(cat.id, { isActive: !cat.isActive });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not update category');
    } finally {
      setBusy(false);
    }
  };

  const addPurpose = async () => {
    if (!purposeName.trim()) return;
    setBusy(true);
    try {
      await createCompanyMeetingPurpose({ name: purposeName.trim() });
      setPurposeName('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not create purpose');
    } finally {
      setBusy(false);
    }
  };

  const togglePurpose = async (purpose: any) => {
    setBusy(true);
    try {
      await updateCompanyMeetingPurpose(purpose.id, { isActive: !purpose.isActive });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not update purpose');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box className="px-lg-0 px-2 pt-4" sx={{ pb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Meetings on the calendar
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Visibility, half-day colours, status colours and related calendar appearance for meetings.
      </Typography>
      <Box sx={{ mb: 4 }}>
        <MeetingsAppearancePanel />
      </Box>

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Agenda categories
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Company-specific headings for Minutes of Meeting.
      </Typography>

      {loading ? (
        <CircularProgress size={24} sx={{ mb: 3 }} />
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2, maxWidth: 720 }}>
            <TextField
              size="small"
              label="New category"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <WtButton size="small" disabled={busy || !name.trim()} onClick={addCategory}>
              Add
            </WtButton>
          </Stack>

          <Stack spacing={1} sx={{ mb: 4, maxWidth: 720 }}>
            {categories.map((cat) => (
              <Box
                key={cat.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Typography>
                  {cat.name}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {' '}
                    · order {cat.sortOrder}
                  </Typography>
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                  <WtSwitch
                    checked={!!cat.isActive}
                    disabled={busy}
                    onChange={() => toggleCategory(cat)}
                    size="sm"
                  />
                </Stack>
              </Box>
            ))}
          </Stack>

          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Meeting purposes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Used on meeting detail. Title remains the separate calendar/list name.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 2, maxWidth: 720 }}>
            <TextField
              size="small"
              label="New purpose"
              fullWidth
              value={purposeName}
              onChange={(e) => setPurposeName(e.target.value)}
            />
            <WtButton size="small" disabled={busy || !purposeName.trim()} onClick={addPurpose}>
              Add
            </WtButton>
          </Stack>

          <Stack spacing={1} sx={{ maxWidth: 720 }}>
            {purposes.map((purpose) => (
              <Box
                key={purpose.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Typography>
                  {purpose.name}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {' '}
                    · order {purpose.sortOrder}
                    {purpose.requiresOther ? ' · needs details' : ''}
                  </Typography>
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                  <WtSwitch
                    checked={!!purpose.isActive}
                    disabled={busy}
                    onChange={() => togglePurpose(purpose)}
                    size="sm"
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
