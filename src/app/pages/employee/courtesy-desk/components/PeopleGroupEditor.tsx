import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { TRIO } from '@app/modules/common/components/ui/patterns';
import { FormSectionHead } from '@app/pages/employee/tasks/components/primitives';
import { GIFT_MANAGEMENT_BASE } from '../giftPaths';
import PersonPicker from './PersonPicker';
import { DriveCreateModal } from './DriveCreate';
import { getGroup, saveGroup } from '../store/courtesyDeskStore';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import type { PersonRef } from '../types';

export default function PeopleGroupEditor() {
  useCourtesyDesk();
  const theme = useTheme();
  const { groupId } = useParams<{ groupId: string }>();
  const isNew = !groupId || groupId === 'new';
  const existing = !isNew ? getGroup(groupId) : undefined;
  const navigate = useNavigate();

  const [name, setName] = useState(existing?.name || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [members, setMembers] = useState<PersonRef[]>(existing?.members || []);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [giftRunModalOpen, setGiftRunModalOpen] = useState(false);

  useEffect(() => {
    const g = !isNew && groupId ? getGroup(groupId) : undefined;
    setName(g?.name || '');
    setNotes(g?.notes || '');
    setMembers(g?.members || []);
    setError('');
    setSavedMsg('');
  }, [groupId, isNew]);

  const counts = useMemo(() => {
    const contacts = members.filter((m) => m.memberType === 'CONTACT').length;
    const employees = members.filter((m) => m.memberType === 'EMPLOYEE').length;
    return { contacts, employees };
  }, [members]);

  if (!isNew && !existing) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Group not found.</Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            startIcon={<AppIcon name="bi-arrow-left" />}
            onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`)}
          >
            Back to People Groups
          </Button>
        </Box>
      </Box>
    );
  }

  const onSave = () => {
    setError('');
    setSavedMsg('');
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    if (!members.length) {
      setError('Select at least one person.');
      return;
    }
    const saved = saveGroup({
      id: isNew ? undefined : existing!.id,
      name,
      notes,
      members,
    });
    setSavedMsg(isNew ? 'Group created.' : 'Group updated.');
    navigate(`${GIFT_MANAGEMENT_BASE}/groups/${saved.id}`);
  };

  const summaryChip = (label: string, count: number, trio: (typeof TRIO)['blue']) => (
    <Chip
      label={`${count} ${label}`}
      sx={{
        fontWeight: 700,
        bgcolor: alpha(trio.c, theme.palette.mode === 'dark' ? 0.22 : 0.12),
        color: trio.c,
        border: `1px solid ${alpha(trio.c, 0.35)}`,
      }}
    />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1040 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap spacing={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {isNew ? 'New People Group' : 'Update People Group'}
          </Typography>
          <Typography color="text.secondary">
            Mix Contacts and Employees. Selected people stay pinned on top.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<AppIcon name="bi-arrow-left" />}
            onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`)}
          >
            Back
          </Button>
          <PremiumButton icon="bi-check-lg" onClick={onSave}>
            {isNew ? 'Save Group' : 'Update Group'}
          </PremiumButton>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {savedMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {savedMsg}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5, borderRadius: 2 }}>
        <FormSectionHead icon="bi-card-text" title="Group details" hint="Name and optional notes for this reusable list." tone="blue" />
        <Stack spacing={2}>
          <TextField
            label="Group name"
            placeholder="e.g. Reza Peoples"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Notes (optional)"
            placeholder="e.g. Partners only"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {summaryChip('selected', members.length, TRIO.green)}
            {summaryChip('contacts', counts.contacts, TRIO.blue)}
            {summaryChip('employees', counts.employees, TRIO.cyan)}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(TRIO.green.c, theme.palette.mode === 'dark' ? 0.22 : 0.12),
              color: TRIO.green.c,
              border: `1px solid ${alpha(TRIO.green.c, 0.3)}`,
              flexShrink: 0,
            }}
          >
            <AppIcon name="bi-person-plus" className="fs-4" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Add people</Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Search contacts or employees — selected list scrolls; green = added.
            </Typography>
          </Box>
        </Stack>
        <PersonPicker selected={members} onChange={setMembers} />
      </Paper>

      {!isNew && (
        <Box sx={{ mt: 3 }}>
          <PremiumButton onClick={() => setGiftRunModalOpen(true)}>
            Start Gift Run from this group
          </PremiumButton>
        </Box>
      )}

      {!isNew && existing && (
        <DriveCreateModal
          open={giftRunModalOpen}
          onClose={() => setGiftRunModalOpen(false)}
          presetGroupId={existing.id}
        />
      )}
    </Box>
  );
}
