import { Card, Box, Stack, Typography, Button, IconButton, Tooltip, Divider } from '@mui/material';
import { KTIcon } from '@metronic/helpers';

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
 */
export default function BranchCard({
  branch, isAdmin, canManage, onViewEmployees, onManageDevices, onPromote, onEdit, onDelete,
}: BranchCardProps) {
  const employees = branch?._count?.Employees ?? 0;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: 2, borderLeft: 5, borderLeftColor: 'primary.main', overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #FCFDFF 100%)',
        transition: 'box-shadow .2s ease, transform .2s ease, border-color .2s ease',
        '&:hover': { boxShadow: '0 10px 28px rgba(16,24,40,0.10)', transform: 'translateY(-3px)', borderColor: 'rgba(30,58,138,0.35)' },
      }}
    >
      {/* Identity */}
      <Stack direction="row" spacing={1.5} sx={{ p: 2, pb: 1.5, alignItems: 'flex-start' }}>
        <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main', border: '1px solid rgba(30,58,138,0.18)' }}>
          <KTIcon iconName="bank" className="fs-2" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 750, fontSize: 16, color: 'text.primary', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {branch?.name}
          </Typography>
          <Typography
            component="div"
            sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            dangerouslySetInnerHTML={{ __html: branch?.address ?? '' }}
          />
        </Box>
      </Stack>

      <Box sx={{ flex: 1 }} />
      <Divider sx={{ mx: 2 }} />

      {/* Actions */}
      <Stack direction="row" sx={{ p: 2, pt: 1.5, alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small" variant="outlined" color="primary" onClick={onViewEmployees}
            startIcon={<KTIcon iconName="people" className="fs-6" />}
          >
            {employees} {employees === 1 ? 'Employee' : 'Employees'}
          </Button>
          <Button
            size="small" variant="outlined" color="warning" onClick={onManageDevices}
            startIcon={<KTIcon iconName="fingerprint-scanning" className="fs-6" />}
          >
            Devices
          </Button>
        </Stack>

        {isAdmin && canManage && (
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Promote to sub-organization">
              <IconButton size="small" color="primary" onClick={onPromote}><KTIcon iconName="arrow-up-right" className="fs-5" /></IconButton>
            </Tooltip>
            <Tooltip title="Edit branch">
              <IconButton size="small" color="primary" onClick={onEdit}><KTIcon iconName="pencil" className="fs-5" /></IconButton>
            </Tooltip>
            <Tooltip title="Delete branch">
              <IconButton size="small" color="error" onClick={onDelete}><KTIcon iconName="trash" className="fs-5" /></IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
