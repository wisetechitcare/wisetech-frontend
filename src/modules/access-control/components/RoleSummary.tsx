import { Alert, Box, Card, CardContent, Chip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import type { RoleSummary as RoleSummaryData } from '../types';

/**
 * Human-readable capability summary. Business language only — this component
 * must never render a permission key. The backend already returns friendly
 * labels + reach words, so the UI just presents them.
 */
export const RoleSummary = ({ summary }: { summary: RoleSummaryData }) => {
  if (summary.fullAccess) {
    return (
      <Alert severity="info" icon={<VerifiedUserOutlinedIcon />} sx={{ borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Full access</Typography>
        <Typography variant="body2">This role has full access to every area of the platform.</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>This role can</Typography>
          {summary.can.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No access has been granted yet.</Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {summary.can.map((c) => (
                <Box component="li" key={c.module} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon fontSize="small" color="success" aria-hidden="true" />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    <strong>{c.capability ?? 'Access'}</strong> {c.label}
                  </Typography>
                  <Chip size="small" label={c.reachLabel} sx={{ borderRadius: 1.5, fontWeight: 600 }} />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>This role cannot access</Typography>
          {summary.cannot.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nothing is restricted for this role.</Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {summary.cannot.map((c) => (
                <Box component="li" key={c.module} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RemoveCircleOutlineIcon fontSize="small" sx={{ color: 'text.disabled' }} aria-hidden="true" />
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default RoleSummary;
