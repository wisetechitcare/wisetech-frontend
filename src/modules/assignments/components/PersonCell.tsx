import { memo } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import { initials } from '../utils/format';

interface PersonCellProps {
  name: string;
  email?: string | null;
  avatar?: string | null;
  size?: number;
}

/** Person identity block — avatar (initials fallback) + name + email. */
export const PersonCell = memo(({ name, email, avatar, size = 36 }: PersonCellProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
    <Avatar
      src={avatar ?? undefined}
      sx={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 700, bgcolor: 'primary.light' }}
    >
      {initials(name)}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{name}</Typography>
      {email && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{email}</Typography>}
    </Box>
  </Box>
));
PersonCell.displayName = 'PersonCell';

export default PersonCell;
