import { memo } from 'react';
import { Avatar, Box, Card, CardContent, Chip, Divider, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useState, MouseEvent } from 'react';
import { StatusBadge } from './StatusBadge';
import { formatDate, initials, pluralize } from '../utils/format';
import type { RoleListItem } from '../types';

interface RoleCardProps {
  role: RoleListItem;
  onOpen: (id: string) => void;
}

// Single shared card height for the whole grid (rem, so it scales with the root
// font size rather than being a fixed pixel value). Comfortably fits the fixed
// card anatomy: header + 2-line description + badges + one chip row + footer.
const CARD_MIN_HEIGHT = '15rem';

/**
 * Enterprise role card. Whole card is an activatable element (click / Enter /
 * Space) so keyboard users reach the details page without hunting for a link.
 * Memoized — the grid re-renders on every filter change.
 */
export const RoleCard = memo(({ role, onOpen }: RoleCardProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const openMenu = (e: MouseEvent<HTMLElement>) => { e.stopPropagation(); setAnchor(e.currentTarget); };
  const closeMenu = (e?: MouseEvent<HTMLElement>) => { e?.stopPropagation(); setAnchor(null); };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${role.name}. ${pluralize(role.userCount, 'user')}. Status ${role.status}. Open details.`}
      onClick={() => onOpen(role.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(role.id); }
      }}
      variant="outlined"
      sx={{
        borderRadius: 3,
        height: '100%',
        // One shared minimum height (rem → scales with the root font, not a fixed
        // pixel) so every card is the same size regardless of its content. The
        // description/chips clamps keep content within this, so cards never exceed it.
        minHeight: CARD_MIN_HEIGHT,
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
            {initials(role.name)}
          </Avatar>

          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap title={role.name}>
              {role.name}
            </Typography>
          </Box>

          <IconButton
            size="small"
            aria-label={`Actions for ${role.name}`}
            aria-haspopup="menu"
            onClick={openMenu}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            // Reserve two lines (relative to font size, not a fixed px) so every
            // card's description block is the same height; break long unbreakable
            // strings so they clamp instead of overflowing the card.
            minHeight: '2.75em', overflowWrap: 'anywhere', wordBreak: 'break-word',
          }}
        >
          {role.description}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <StatusBadge kind={role.status === 'archived' ? 'archived' : 'published'} />
          {role.isSystem && <StatusBadge kind="system" />}
          {role.hasDraft && <StatusBadge kind="draft" />}
        </Box>

        {role.topCategories.length > 0 && (
          // Single row (no wrap) so the chips never add a variable second line —
          // keeps every card's body the same height; overflow is clipped.
          <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 0.5, overflow: 'hidden', mt: 'auto' }}>
            {role.topCategories.map((c) => (
              <Chip key={c} label={c} size="small" sx={{ borderRadius: 1.5, bgcolor: 'action.hover', fontWeight: 500, flexShrink: 0 }} />
            ))}
          </Box>
        )}
      </CardContent>

      <Divider />
      <Box sx={{ px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
          <PeopleAltOutlinedIcon fontSize="small" aria-hidden="true" />
          <Typography variant="caption">{pluralize(role.userCount, 'user')}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">Updated {formatDate(role.updatedAt)}</Typography>
      </Box>

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => closeMenu()} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={(e) => { closeMenu(e); onOpen(role.id); }}>
          <VisibilityOutlinedIcon fontSize="small" style={{ marginRight: 8 }} /> View
        </MenuItem>
        <Tooltip title="Available in a later release" placement="left">
          <span>
            <MenuItem disabled><ContentCopyOutlinedIcon fontSize="small" style={{ marginRight: 8 }} /> Clone</MenuItem>
          </span>
        </Tooltip>
        <Tooltip title="Available in a later release" placement="left">
          <span>
            <MenuItem disabled><Inventory2OutlinedIcon fontSize="small" style={{ marginRight: 8 }} /> Archive</MenuItem>
          </span>
        </Tooltip>
      </Menu>
    </Card>
  );
});
RoleCard.displayName = 'RoleCard';

export default RoleCard;
