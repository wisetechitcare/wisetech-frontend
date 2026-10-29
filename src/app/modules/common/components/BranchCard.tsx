import { Card, Box, Stack, Typography, Divider } from '@mui/material';
import { Button } from '@/ds/ui/button';
import { KTIcon } from '@metronic/helpers';
import { T } from '@app/modules/common/components/ui/tokens';
import { WtTooltip } from '@app/modules/common/components/ui';
import ActionIconButton from '@app/modules/common/components/ui/ActionIconButton';

/** One treatment for both drill-in buttons, defined once so they cannot drift apart. */
export interface BranchCardProps {
  branch: any;
  isAdmin: boolean;
  /** Whether the current user can promote / edit / delete this branch. */
  canManage: boolean;
  onViewEmployees: () => void;
  onManageDevices: () => void;
  onPromote: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Premium branch summary card (MUI) — brand-accented surface with an identity
 * tile, address, and a clear action zone (employees + devices, plus admin
 * controls). Presentational + reusable: all behavior is injected via callbacks.
 * Typography + palette come from the shared design tokens so it stays on-theme.
 */
export default function BranchCard({
  branch, isAdmin, canManage, onViewEmployees, onManageDevices, onPromote, onEdit, onDelete,
}: BranchCardProps) {
  const employees = branch?._count?.Employees ?? 0;

  const canOpen = isAdmin && canManage;

  return (
    <Card
      variant="outlined"
      onClick={canOpen ? onEdit : undefined}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      aria-label={canOpen ? `Edit branch ${branch?.name ?? ''}` : undefined}
      onKeyDown={canOpen ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(); }
      } : undefined}
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: `${T.radius.md}px`, borderLeft: 5, borderLeftColor: T.color.brand, overflow: 'hidden',
        fontFamily: T.font.family,
        cursor: canOpen ? 'pointer' : 'default',
        // No hardcoded background. The white-to-near-white gradient that stood here
        // painted the card white on a dark page — the identical bug already fixed on
        // the biometric stat tile. `Card variant="outlined"` resolves background.paper
        // for whichever theme is active, which is the whole point of using it.
        transition: 'box-shadow .2s ease, transform .2s ease, border-color .2s ease',
        '&:hover': { boxShadow: T.shadow.cardHover, transform: 'translateY(-3px)', borderColor: T.color.brandRing },
        '&:focus-visible': { outline: 2, outlineColor: T.color.brand, outlineOffset: 2 },
      }}
    >
      {/* Identity */}
      <Stack direction="row" spacing={1.75} sx={{ p: 2.25, pb: 1.75, alignItems: 'flex-start' }}>
        <Box sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: `${T.radius.md}px`, display: 'grid', placeItems: 'center', bgcolor: T.color.brandSoft, color: T.color.brand, border: `1px solid ${T.color.brandRing}` }}>
          <KTIcon iconName="bank" className="fs-2" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {/* A branch name is CONTENT, so it keeps its own casing — it is not a
              region heading and must not be uppercased. */}
          <Typography sx={{ fontFamily: T.font.family, fontWeight: 700, fontSize: 17, color: 'text.primary', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {branch?.name}
          </Typography>
          {/* Clamped to two lines, so the full address needs somewhere to live —
              otherwise the only way to read a long one is to open the edit form. */}
          <WtTooltip title={branch?.address ?? ''}>
            <Typography
              component="div"
              sx={{ fontFamily: T.font.family, fontSize: 13, color: 'text.secondary', mt: 0.6, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {branch?.address ?? ''}
            </Typography>
          </WtTooltip>
          {canOpen && (
            <Typography sx={{ fontFamily: T.font.family, fontSize: 11.5, color: T.color.brand, fontWeight: 600, mt: 0.75 }}>
              Click to edit
            </Typography>
          )}
        </Box>
      </Stack>

      <Box sx={{ flex: 1 }} />
      <Divider sx={{ mx: 2.25, borderColor: T.color.line }} />

      {/* Actions — stopPropagation so Employees / Devices / admin icons stay distinct from card→edit. */}
      <Stack
        direction="row"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        sx={{ p: 2.25, pt: 1.75, alignItems: 'center', justifyContent: 'space-between', gap: 1.25, flexWrap: 'wrap' }}
      >
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button size="sm" variant="outline" onClick={onViewEmployees}>
            <span data-icon="inline-start" className="inline-flex"><KTIcon iconName="people" className="fs-5" /></span>
            {employees} {employees === 1 ? 'Employee' : 'Employees'}
          </Button>
          <Button size="sm" variant="outline" onClick={onManageDevices}>
            <span data-icon="inline-start" className="inline-flex"><KTIcon iconName="fingerprint-scanning" className="fs-5" /></span>
            Devices
          </Button>
        </Stack>

        {canOpen && (
          <Stack direction="row" spacing={0.75}>
            <ActionIconButton
              iconName="arrow-up-right"
              title="Promote to sub-organization"
              tone="brand"
              onClick={onPromote}
            />
            <ActionIconButton iconName="pencil" title="Edit branch" onClick={onEdit} />
            <ActionIconButton
              iconName="trash"
              title="Delete branch"
              tone="danger"
              onClick={onDelete}
            />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
