import { ReactNode } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton,
  Skeleton, Stack, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { useAssignment } from '../hooks/useAssignments';
import { formatDate, formatDateTime } from '../utils/format';
import type { Assignment } from '../types';
import { PersonCell } from './PersonCell';
import { StatusBadge } from './StatusBadge';
import { ScopeChip } from './ScopeChip';
import { ErrorState } from './ErrorState';

interface AssignmentDetailsDialogProps {
  open: boolean;
  assignmentId: string | null;
  /** Row data already in hand — shown instantly while the full record loads. */
  fallback?: Assignment | null;
  onClose: () => void;
  onEdit: (assignment: Assignment) => void;
  onViewEffective: (userId: string) => void;
  onViewHistory: (userId: string) => void;
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 1, alignItems: 'flex-start' }}>
    <Typography variant="body2" color="text.secondary" sx={{ width: 130, flexShrink: 0, fontWeight: 600 }}>
      {label}
    </Typography>
    <Box sx={{ minWidth: 0, flexGrow: 1 }}>{children}</Box>
  </Box>
);

/** Read-only full view of one assignment, with quick actions. */
export const AssignmentDetailsDialog = ({
  open, assignmentId, fallback, onClose, onEdit, onViewEffective, onViewHistory,
}: AssignmentDetailsDialogProps) => {
  const { data, isLoading, isError, refetch } = useAssignment(open ? assignmentId ?? undefined : undefined);
  const assignment = data ?? fallback ?? null;
  const loading = isLoading && !fallback;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }} aria-labelledby="assignment-details-title">
      <DialogTitle id="assignment-details-title" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        Assignment details
        <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {isError && !assignment ? (
          <ErrorState title="We couldn't load this assignment" onRetry={() => refetch()} />
        ) : loading || !assignment ? (
          <Stack spacing={1.5} sx={{ py: 1 }}>
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} variant="text" height={28} />)}
          </Stack>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1 }}>
              <PersonCell name={assignment.person?.name ?? 'Unknown person'} email={assignment.person?.email} size={44} />
              <StatusBadge status={assignment.status} />
            </Box>
            <Divider sx={{ my: 1 }} />

            <Row label="Role">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {assignment.role.name}{assignment.role.code ? ` · ${assignment.role.code}` : ''}
              </Typography>
            </Row>
            <Row label="Tenant"><Typography variant="body2">{assignment.tenant?.name ?? '—'}</Typography></Row>
            <Row label="Unit"><Typography variant="body2">{assignment.unit?.name ?? 'Whole tenant'}</Typography></Row>
            <Row label="Scope"><ScopeChip scope={assignment.scope} /></Row>
            <Row label="Effective from"><Typography variant="body2">{formatDate(assignment.effectiveFrom)}</Typography></Row>
            <Row label="Effective until"><Typography variant="body2">{formatDate(assignment.effectiveUntil)}</Typography></Row>
            <Row label="Assigned by"><Typography variant="body2">{assignment.assignedBy ?? '—'}</Typography></Row>
            <Divider sx={{ my: 1 }} />
            <Row label="Created"><Typography variant="body2" color="text.secondary">{formatDateTime(assignment.createdAt)}</Typography></Row>
            <Row label="Last updated"><Typography variant="body2" color="text.secondary">{formatDateTime(assignment.updatedAt)}</Typography></Row>

            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(assignment)} sx={{ textTransform: 'none', borderRadius: 2 }}>Edit</Button>
              <Tooltip title="See everything this person can and cannot access">
                <Button size="small" variant="outlined" startIcon={<AccountTreeOutlinedIcon />} onClick={() => onViewEffective(assignment.userId)} sx={{ textTransform: 'none', borderRadius: 2 }}>Effective access</Button>
              </Tooltip>
              <Button size="small" variant="outlined" startIcon={<HistoryToggleOffOutlinedIcon />} onClick={() => onViewHistory(assignment.userId)} sx={{ textTransform: 'none', borderRadius: 2 }}>History</Button>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignmentDetailsDialog;
