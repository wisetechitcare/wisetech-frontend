import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Card, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { useAssignmentHistory } from '../hooks/useAssignments';
import { HistoryTimeline } from '../components/HistoryTimeline';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { CardListSkeleton } from '../components/LoadingSkeleton';

/** Assignment History — a vertical audit timeline of everything that changed. */
export const AssignmentHistoryPage = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, isFetching, refetch } = useAssignmentHistory(personId, 100);

  const entries = data?.history ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 820, mx: 'auto' }}>
      <Button
        onClick={() => navigate('/access-control/assignments')}
        startIcon={<ArrowBackIcon />}
        sx={{ textTransform: 'none', mb: 2 }}
      >
        Back to assignments
      </Button>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Assignment history</Typography>
          <Typography variant="body2" color="text.secondary">Every change to this person's role assignments</Typography>
        </Box>
        {personId && (
          <Button
            variant="outlined"
            startIcon={<AccountTreeOutlinedIcon />}
            onClick={() => navigate(`/access-control/assignments/effective/${personId}`)}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Effective access
          </Button>
        )}
      </Box>

      {isLoading ? (
        <CardListSkeleton count={5} />
      ) : isError || !data ? (
        <ErrorState title="We couldn't load the history" onRetry={() => refetch()} isRetrying={isFetching} />
      ) : entries.length === 0 ? (
        <EmptyState variant="no-data" title="No history yet" description="Changes to this person's assignments will appear here." />
      ) : (
        <Card variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
          <HistoryTimeline entries={entries} />
        </Card>
      )}
    </Box>
  );
};

export default AssignmentHistoryPage;
