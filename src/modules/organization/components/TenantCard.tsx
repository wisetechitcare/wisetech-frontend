import { memo } from 'react';
import { Avatar, Box, Card, CardContent, Divider, Typography } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { StatusBadge } from './StatusBadge';
import { formatDate, initials, pluralize } from '../utils/format';
import type { Tenant } from '../types';

interface TenantCardProps {
  tenant: Tenant;
  /** Active-unit count, when the list endpoint provides it (optional — may be absent on the list row). */
  activeUnits?: number;
  onOpen: (id: string) => void;
}

/**
 * Enterprise tenant card. The whole card is an activatable element (click /
 * Enter / Space) so keyboard users reach the organization without hunting for a
 * link. Memoized — the grid re-renders on every filter change.
 */
export const TenantCard = memo(({ tenant, activeUnits, onOpen }: TenantCardProps) => (
  <Card
    role="button"
    tabIndex={0}
    aria-label={`${tenant.name}. Slug ${tenant.slug}. Status ${tenant.status}. Open organization.`}
    onClick={() => onOpen(tenant.id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(tenant.id); }
    }}
    variant="outlined"
    sx={{
      borderRadius: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      transition: 'box-shadow .18s ease, transform .18s ease, border-color .18s ease',
      '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', borderColor: 'primary.light' },
      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
    }}
  >
    <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Avatar
          variant="rounded"
          aria-hidden="true"
          sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontWeight: 700, fontSize: 15, borderRadius: 2 }}
        >
          {initials(tenant.name)}
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap title={tenant.name}>
            {tenant.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>/{tenant.slug}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        <StatusBadge status={tenant.status} />
      </Box>
    </CardContent>

    <Divider />
    <Box sx={{ px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
        <AccountTreeOutlinedIcon fontSize="small" aria-hidden="true" />
        <Typography variant="caption">
          {activeUnits === undefined ? 'View organization' : pluralize(activeUnits, 'active unit')}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">Updated {formatDate(tenant.updatedAt)}</Typography>
    </Box>
  </Card>
));
TenantCard.displayName = 'TenantCard';

export default TenantCard;
