import { memo, useMemo } from 'react';
import {
  Checkbox, Chip, IconButton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { Assignment } from '../types';
import { formatDate } from '../utils/format';
import { PersonCell } from './PersonCell';
import { StatusBadge } from './StatusBadge';
import { ScopeChip } from './ScopeChip';
import { AssignmentTableSkeleton } from './LoadingSkeleton';

interface AssignmentTableProps {
  assignments: Assignment[];
  loading?: boolean;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onOpenMenu: (anchor: HTMLElement, assignment: Assignment) => void;
  onView: (assignment: Assignment) => void;
}

interface RowProps {
  assignment: Assignment;
  selected: boolean;
  onToggleRow: (id: string) => void;
  onOpenMenu: (anchor: HTMLElement, assignment: Assignment) => void;
  onView: (assignment: Assignment) => void;
}

const AssignmentRow = memo(({ assignment, selected, onToggleRow, onOpenMenu, onView }: RowProps) => {
  const a = assignment;
  return (
    <TableRow hover selected={selected} sx={{ '& td': { borderColor: 'divider' } }}>
      <TableCell padding="checkbox">
        <Checkbox
          checked={selected}
          onChange={() => onToggleRow(a.id)}
          inputProps={{ 'aria-label': `Select assignment for ${a.person?.name ?? 'person'}` }}
        />
      </TableCell>
      <TableCell
        sx={{ cursor: 'pointer', minWidth: 200 }}
        onClick={() => onView(a)}
      >
        <PersonCell name={a.person?.name ?? 'Unknown person'} email={a.person?.email} />
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{a.role.name}</Typography>
        {a.role.code && <Typography variant="caption" color="text.secondary">{a.role.code}</Typography>}
      </TableCell>
      <TableCell><Typography variant="body2" noWrap>{a.tenant?.name ?? '—'}</Typography></TableCell>
      <TableCell>
        {a.unit ? (
          <Typography variant="body2" noWrap>{a.unit.name}</Typography>
        ) : (
          <Chip size="small" label="Whole tenant" variant="outlined" sx={{ borderRadius: 1, height: 22 }} />
        )}
      </TableCell>
      <TableCell><ScopeChip scope={a.scope} /></TableCell>
      <TableCell><StatusBadge status={a.status} /></TableCell>
      <TableCell><Typography variant="body2" noWrap>{formatDate(a.effectiveFrom)}</Typography></TableCell>
      <TableCell><Typography variant="body2" noWrap>{formatDate(a.effectiveUntil)}</Typography></TableCell>
      <TableCell><Typography variant="body2" color="text.secondary" noWrap>{formatDate(a.updatedAt)}</Typography></TableCell>
      <TableCell padding="checkbox">
        <Tooltip title="Actions">
          <IconButton
            size="small"
            aria-label={`Actions for ${a.person?.name ?? 'assignment'}`}
            onClick={(e) => onOpenMenu(e.currentTarget, a)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
});
AssignmentRow.displayName = 'AssignmentRow';

const HEADERS = ['Person', 'Role', 'Tenant', 'Unit', 'Scope', 'Status', 'Effective from', 'Effective until', 'Last updated'];

/** The assignment data table — server-paginated, selectable, keyboard-operable. */
export const AssignmentTable = ({
  assignments, loading, selectedIds, onToggleRow, onToggleAll, onOpenMenu, onView,
}: AssignmentTableProps) => {
  const pageIds = useMemo(() => assignments.map((a) => a.id), [assignments]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id)) && !allSelected;

  return (
    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflowX: 'auto' }}>
      <Table stickyHeader size="small" aria-label="Role assignments">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.paper' } }}>
            <TableCell padding="checkbox">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={(e) => onToggleAll(pageIds, e.target.checked)}
                inputProps={{ 'aria-label': 'Select all assignments on this page' }}
              />
            </TableCell>
            {HEADERS.map((h) => <TableCell key={h}>{h}</TableCell>)}
            <TableCell padding="checkbox" aria-label="Actions" />
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <AssignmentTableSkeleton rows={8} columns={11} />
          ) : (
            assignments.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                selected={selectedIds.has(a.id)}
                onToggleRow={onToggleRow}
                onOpenMenu={onOpenMenu}
                onView={onView}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AssignmentTable;
