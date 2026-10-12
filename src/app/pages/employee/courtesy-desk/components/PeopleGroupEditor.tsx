import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import PersonPicker from './PersonPicker';
import { getGroup, saveGroup } from '../store/courtesyDeskStore';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import type { PersonRef } from '../types';

export default function PeopleGroupEditor() {
  useCourtesyDesk();
  const { groupId } = useParams<{ groupId: string }>();
  const isNew = !groupId || groupId === 'new';
  const existing = !isNew ? getGroup(groupId) : undefined;
  const navigate = useNavigate();

  const [name, setName] = useState(existing?.name || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [members, setMembers] = useState<PersonRef[]>(existing?.members || []);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

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
          <Button startIcon={<AppIcon name="bi-arrow-left" />} onClick={() => navigate('/courtesy-desk/people-groups')}>
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
    navigate(`/courtesy-desk/groups/${saved.id}`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960 }}>
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
          <Button startIcon={<AppIcon name="bi-arrow-left" />} onClick={() => navigate('/courtesy-desk/people-groups')}>
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

      <Stack spacing={2} sx={{ mb: 3 }}>
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
        <Stack direction="row" spacing={1}>
          <Chip label={`${members.length} selected`} color="primary" variant="outlined" />
          <Chip label={`${counts.contacts} contacts`} />
          <Chip label={`${counts.employees} employees`} />
        </Stack>
      </Stack>

      <Typography fontWeight={700} sx={{ mb: 1 }}>
        Add people
      </Typography>
      <PersonPicker selected={members} onChange={setMembers} />

      {!isNew && (
        <Box sx={{ mt: 3 }}>
          <PremiumButton onClick={() => navigate(`/courtesy-desk/drives/new?groupId=${existing!.id}`)}>
            Start Gift Run from this group
          </PremiumButton>
        </Box>
      )}
    </Box>
  );
}
