import { Card, Box, Stack, Typography, Button, IconButton, Tooltip, Divider } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { T } from '@app/modules/common/components/ui/tokens';

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

  // Larger, tactile admin action buttons (tinted ~40px hit-targets) so edit/delete
  // aren't cramped micro-icons on any screen.
  const actionBtnSx = (tone: string) => ({
    width: 40, height: 40, borderRadius: '10px', color: tone,
    bgcolor: `${tone}1A`, border: `1px solid ${tone}3D`,
    transition: 'background-color .15s, border-color .15s',
    '&:hover': { bgcolor: `${tone}30`, borderColor: `${tone}66` },
  });

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: `${T.radius.md}px`, borderLeft: 5, borderLeftColor: T.color.brand, overflow: 'hidden',
        fontFamily: T.font.family,
        background: 'linear-gradient(180deg, #ffffff 0%, #FCFDFF 100%)',
        transition: 'box-shadow .2s ease, transform .2s ease, border-color .2s ease',
        '&:hover': { boxShadow: T.shadow.cardHover, transform: 'translateY(-3px)', borderColor: T.color.brandRing },
      }}
    >
      {/* Identity */}
      <Stack direction="row" spacing={1.75} sx={{ p: 2.25, pb: 1.75, alignItems: 'flex-start' }}>
        <Box sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: `${T.radius.md}px`, display: 'grid', placeItems: 'center', bgcolor: T.color.brandSoft, color: T.color.brand, border: `1px solid ${T.color.brandRing}` }}>
          <KTIcon iconName="bank" className="fs-2" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontFamily: T.font.family, fontWeight: 700, fontSize: 17, color: T.color.ink, lineHeight: 1.3, wordBreak: 'break-word' }}>
            {branch?.name}
          </Typography>
          <Typography
            component="div"
            sx={{ fontFamily: T.font.family, fontSize: 13, color: T.color.inkSoft, mt: 0.6, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            dangerouslySetInnerHTML={{ __html: branch?.address ?? '' }}
          />
        </Box>
      </Stack>

      <Box sx={{ flex: 1 }} />
      <Divider sx={{ mx: 2.25, borderColor: T.color.line }} />

      {/* Actions */}
      <Stack direction="row" sx={{ p: 2.25, pt: 1.75, alignItems: 'center', justifyContent: 'space-between', gap: 1.25, flexWrap: 'wrap' }}>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small" variant="outlined" onClick={onViewEmployees}
            startIcon={<KTIcon iconName="people" className="fs-5" />}
            sx={{
              fontFamily: T.font.family, textTransform: 'none', fontWeight: 600, fontSize: 13, borderRadius: `${T.radius.sm}px`,
              color: T.color.brand, borderColor: T.color.brandRing, px: 1.5,
              '&:hover': { borderColor: T.color.brand, bgcolor: T.color.brandSoft },
            }}
          >
            {employees} {employees === 1 ? 'Employee' : 'Employees'}
          </Button>
          <Button
            size="small" variant="outlined" onClick={onManageDevices}
            startIcon={<KTIcon iconName="fingerprint-scanning" className="fs-5" />}
            sx={{
              fontFamily: T.font.family, textTransform: 'none', fontWeight: 600, fontSize: 13, borderRadius: `${T.radius.sm}px`,
              color: T.color.warning, borderColor: `${T.color.warning}59`, px: 1.5,
              '&:hover': { borderColor: T.color.warning, bgcolor: T.color.warningSoft },
            }}
          >
            Devices
          </Button>
        </Stack>

        {isAdmin && canManage && (
          <Stack direction="row" spacing={0.75}>
            <Tooltip title="Promote to sub-organization">
              <IconButton sx={actionBtnSx(T.color.brand)} onClick={onPromote}><KTIcon iconName="arrow-up-right" className="fs-4" /></IconButton>
            </Tooltip>
            <Tooltip title="Edit branch">
              <IconButton sx={actionBtnSx(T.color.indigo)} onClick={onEdit}><KTIcon iconName="pencil" className="fs-4" /></IconButton>
            </Tooltip>
            <Tooltip title="Delete branch">
              <IconButton sx={actionBtnSx(T.color.danger)} onClick={onDelete}><KTIcon iconName="trash" className="fs-4" /></IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
