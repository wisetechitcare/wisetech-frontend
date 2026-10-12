import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { WtDateField } from '@app/modules/common/components/ui';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import { createDrive, listGroups } from '../store/courtesyDeskStore';
import { GIFT_RUN_LABEL } from '../types';

export default function DriveCreate() {
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const groups = listGroups();
  const occasions = desk.config.occasions;
  const presetGroup = params.get('groupId') || groups[0]?.id || '';

  const [groupId, setGroupId] = useState(presetGroup);
  const [title, setTitle] = useState('');
  const [occasionType, setOccasionType] = useState(occasions[0]?.id || '');
  const [giftItem, setGiftItem] = useState('Perfume');
  const [driveDate, setDriveDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  const onCreate = () => {
    setError('');
    try {
      if (!groupId) throw new Error('Choose a People Group.');
      if (!title.trim()) throw new Error(`${GIFT_RUN_LABEL} title is required.`);
      if (!giftItem.trim()) throw new Error('Gift item is required.');
      if (!occasionType) throw new Error('Choose an occasion (add new ones under Configure).');
      const drive = createDrive({
        title,
        occasionType,
        giftItem,
        driveDate,
        sourceGroupId: groupId,
      });
      navigate(`/courtesy-desk/drives/${drive.id}`);
    } catch (e: any) {
      setError(e?.message || `Could not create ${GIFT_RUN_LABEL.toLowerCase()}.`);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          New {GIFT_RUN_LABEL}
        </Typography>
        <Typography color="text.secondary">
          People come from the group by default. Add occasions under Configure.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!groups.length ? (
        <Alert severity="info">
          Create a People Group first, then start a {GIFT_RUN_LABEL}.
          <Box sx={{ mt: 1 }}>
            <PremiumButton onClick={() => navigate('/courtesy-desk/groups/new')}>New People Group</PremiumButton>
          </Box>
        </Alert>
      ) : (
        <Stack spacing={2}>
          <TextField
            select
            label="People Group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            fullWidth
          >
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name} ({g.members.length})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Occasion"
            value={occasionType}
            onChange={(e) => setOccasionType(e.target.value)}
            fullWidth
          >
            {occasions.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: o.color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{o.name}</span>
                </Stack>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Gift item"
            value={giftItem}
            onChange={(e) => setGiftItem(e.target.value)}
            placeholder="Perfume / Khajur / Sweets / Welcome Kit"
            fullWidth
          />

          <TextField
            label={`${GIFT_RUN_LABEL} title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Perfume for Reza Peoples"
            fullWidth
          />

          <WtDateField
            label="Date"
            value={driveDate}
            onChange={(v) => setDriveDate(v || '')}
            fullWidth
          />

          {selectedGroup && (
            <Alert severity="success">
              Will include <strong>{selectedGroup.members.length}</strong> people from{' '}
              <strong>{selectedGroup.name}</strong> as Pending.
            </Alert>
          )}

          <Stack direction="row" spacing={1}>
            <Button startIcon={<AppIcon name="bi-arrow-left" />} onClick={() => navigate('/courtesy-desk/drives')}>
              Back
            </Button>
            <PremiumButton icon="bi-check-lg" onClick={onCreate}>
              Create {GIFT_RUN_LABEL}
            </PremiumButton>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
