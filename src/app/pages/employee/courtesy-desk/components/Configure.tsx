import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { ConfigPageLayout, ConfigSectionCard } from '@app/modules/configuration';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import { deleteOccasion, saveOccasion, setStatusColor } from '../store/courtesyDeskStore';
import type { ConfigOption, DeliveryStatus } from '../types';
import { DELIVERY_STATUS_LABELS } from '../types';

export default function Configure() {
  const desk = useCourtesyDesk();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigOption | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');

  const openNew = () => {
    setEditing(null);
    setName('');
    setColor('#2563eb');
    setOpen(true);
  };

  const openEdit = (o: ConfigOption) => {
    setEditing(o);
    setName(o.name);
    setColor(o.color);
    setOpen(true);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id =
      editing?.id ||
      trimmed.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') ||
      `OCC_${Date.now()}`;
    saveOccasion({ id, name: trimmed, color });
    setOpen(false);
  };

  return (
    <>
      <ConfigPageLayout>
        <Stack spacing={2} sx={{ p: { xs: 2, md: 3 } }}>
          <ConfigSectionCard
            title="Occasions"
            description="Used on New Gift Run — pick from the list or add more here."
            icon="bi-calendar-event"
            iconColor="blue"
            primaryAction={{ label: 'Add occasion', icon: 'bi-plus-lg', onClick: openNew, variant: 'primary' }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 1.25,
                mt: 1,
              }}
            >
              {desk.config.occasions.map((o) => (
                <Box
                  key={o.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    p: 1.25,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeft: `3px solid ${o.color}`,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: o.color, flexShrink: 0 }} />
                    <Typography noWrap fontWeight={600}>
                      {o.name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => deleteOccasion(o.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Box>
          </ConfigSectionCard>

          <ConfigSectionCard
            title="Delivery status colours"
            description="Colour coding on Gift Run recipient lists."
            icon="bi-palette"
            iconColor="teal"
          >
            <Stack spacing={1.25} sx={{ mt: 1, maxWidth: 420 }}>
              {(Object.keys(DELIVERY_STATUS_LABELS) as DeliveryStatus[]).map((s) => (
                <Stack key={s} direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: desk.config.statusColors[s],
                    }}
                  />
                  <Typography sx={{ flex: 1 }}>{DELIVERY_STATUS_LABELS[s]}</Typography>
                  <TextField
                    type="color"
                    size="small"
                    value={desk.config.statusColors[s]}
                    onChange={(e) => setStatusColor(s, e.target.value)}
                    sx={{ width: 72 }}
                  />
                </Stack>
              ))}
            </Stack>
          </ConfigSectionCard>
        </Stack>
      </ConfigPageLayout>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editing ? 'Edit occasion' : 'Add occasion'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
            <TextField
              label="Color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <PremiumButton onClick={save}>Save</PremiumButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
