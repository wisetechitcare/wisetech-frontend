import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, Chip, Divider,
  Stack, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoNotDisturbAltOutlinedIcon from '@mui/icons-material/DoNotDisturbAltOutlined';
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import { useEffectiveAccess } from '../hooks/useAssignments';
import { PersonCell } from '../components/PersonCell';
import { StatusBadge } from '../components/StatusBadge';
import { ScopeChip } from '../components/ScopeChip';
import { StatCard } from '../components/StatCard';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { CardListSkeleton, StatsSkeleton } from '../components/LoadingSkeleton';
import { formatDate } from '../utils/format';
import type { CanArea, CannotArea, EffectiveAssignment } from '../types';

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{children}</Typography>
);

const AssignmentChipCard = ({ a }: { a: EffectiveAssignment }) => (
  <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
        {a.role}{a.roleCode ? ` · ${a.roleCode}` : ''}
      </Typography>
      <StatusBadge status={a.status} />
    </Box>
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
      <ScopeChip scope={a.scope} />
      {a.unit && <Chip size="small" variant="outlined" label={a.unit} sx={{ borderRadius: 1.5 }} />}
      {a.tenant && <Chip size="small" variant="outlined" label={a.tenant} sx={{ borderRadius: 1.5 }} />}
    </Stack>
    <Typography variant="caption" color="text.secondary">
      {formatDate(a.effectiveFrom)} → {a.effectiveUntil ? formatDate(a.effectiveUntil) : 'no expiry'}
    </Typography>
  </Card>
);

const CanAreaRow = ({ area }: { area: CanArea }) => (
  <Accordion
    disableGutters
    elevation={0}
    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, '&:before': { display: 'none' }, overflow: 'hidden' }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-label={`Why ${area.label} is granted`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        <CheckCircleOutlineIcon fontSize="small" color="success" aria-hidden="true" />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{area.label}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{area.reasonGranted}</Typography>
        </Box>
      </Box>
    </AccordionSummary>
    <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Why this is granted
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {area.grantedBy.map((g) => (
          <Box key={g.assignmentId} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <LockOpenOutlinedIcon fontSize="small" color="action" sx={{ mt: 0.25 }} aria-hidden="true" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">{g.reason}</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                <Chip size="small" label={g.role} sx={{ borderRadius: 1, height: 22 }} />
                <ScopeChip scope={g.scope} />
                {g.unit && <Chip size="small" variant="outlined" label={g.unit} sx={{ borderRadius: 1, height: 22 }} />}
                {g.reachLabel && <Chip size="small" variant="outlined" label={g.reachLabel} sx={{ borderRadius: 1, height: 22 }} />}
              </Stack>
            </Box>
          </Box>
        ))}
      </Stack>
    </AccordionDetails>
  </Accordion>
);

const CannotAreaRow = ({ area }: { area: CannotArea }) => (
  <Card variant="outlined" sx={{ borderRadius: 3, p: 1.75, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
    <DoNotDisturbAltOutlinedIcon fontSize="small" color="disabled" sx={{ mt: 0.25 }} aria-hidden="true" />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{area.label}</Typography>
      <Typography variant="caption" color="text.secondary">{area.reasonDenied}</Typography>
    </Box>
  </Card>
);

/** Effective Access — answers "why does this person have this access?" visually. */
export const EffectiveAccessPage = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, isFetching, refetch } = useEffectiveAccess(personId);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Button
        onClick={() => navigate('/access-control/assignments')}
        startIcon={<ArrowBackIcon />}
        sx={{ textTransform: 'none', mb: 2 }}
      >
        Back to assignments
      </Button>

      {isLoading ? (
        <Stack spacing={3}>
          <StatsSkeleton />
          <CardListSkeleton count={4} />
        </Stack>
      ) : isError || !data ? (
        <ErrorState title="We couldn't load effective access" onRetry={() => refetch()} isRetrying={isFetching} />
      ) : (
        <>
          {/* Person header */}
          <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <PersonCell name={data.person.name} email={data.person.email} size={52} />
            <Button
              variant="outlined"
              startIcon={<HistoryToggleOffOutlinedIcon />}
              onClick={() => navigate(`/access-control/assignments/history/${data.person.id}`)}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              View history
            </Button>
          </Card>

          {/* Summary tiles */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <StatCard label="Active" value={data.summary.activeAssignments} hint="active assignments" icon={<AssignmentIndOutlinedIcon />} />
            <StatCard label="Total" value={data.summary.totalAssignments} hint="assignments" icon={<AssignmentIndOutlinedIcon />} />
            <StatCard label="Can access" value={data.summary.areasGranted} hint="business areas" tone="success" icon={<LockOpenOutlinedIcon />} />
            <StatCard label="Cannot access" value={data.summary.areasDenied} hint="business areas" tone="error" icon={<LockOutlinedIcon />} />
          </Box>

          {/* Assignments */}
          <Box sx={{ mb: 3 }}>
            <SectionTitle>Assignments</SectionTitle>
            {data.assignments.length === 0 ? (
              <EmptyState variant="no-data" title="No assignments" description="This person has no role assignments." />
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                {data.assignments.map((a) => <AssignmentChipCard key={a.id} a={a} />)}
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Can / Cannot */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 3, alignItems: 'start' }}>
            <Box>
              <SectionTitle>Can access ({data.can.length})</SectionTitle>
              {data.can.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No business areas are granted.</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {data.can.map((area) => <CanAreaRow key={area.module} area={area} />)}
                </Stack>
              )}
            </Box>
            <Box>
              <SectionTitle>Cannot access ({data.cannot.length})</SectionTitle>
              {data.cannot.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No areas are explicitly denied.</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {data.cannot.map((area) => <CannotAreaRow key={area.module} area={area} />)}
                </Stack>
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default EffectiveAccessPage;
