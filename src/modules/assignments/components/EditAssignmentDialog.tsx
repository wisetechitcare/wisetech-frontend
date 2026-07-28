import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Switch, Typography,
} from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { useUpdateAssignment } from '../hooks/useAssignments';
import { errorMessage } from '../utils/format';
import type { Assignment, AssignmentScope, RoleOption, UnitOption, UpdateAssignmentPayload } from '../types';
import { AssignmentDateField, RolePicker, ScopeSelect, UnitSelect } from './PickerFields';

interface EditAssignmentDialogProps {
  open: boolean;
  assignment: Assignment | null;
  onClose: () => void;
  onSaved?: (userId: string) => void;
}

/** Edit an existing assignment — role, unit, scope and the effective window. */
export const EditAssignmentDialog = ({ open, assignment, onClose, onSaved }: EditAssignmentDialogProps) => {
  const [role, setRole] = useState<RoleOption | null>(null);
  const [unitId, setUnitId] = useState('');
  const [scope, setScope] = useState<AssignmentScope>('tenant');
  const [advanced, setAdvanced] = useState(false);
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [until, setUntil] = useState<Dayjs | null>(null);

  const update = useUpdateAssignment();

  useEffect(() => {
    if (open && assignment) {
      setRole({ id: assignment.role.id, name: assignment.role.name, code: assignment.role.code, level: assignment.role.level });
      setUnitId(assignment.organizationalUnitId ?? '');
      setScope(assignment.scope);
      setAdvanced(false);
      setFrom(assignment.effectiveFrom ? dayjs(assignment.effectiveFrom) : null);
      setUntil(assignment.effectiveUntil ? dayjs(assignment.effectiveUntil) : null);
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignment]);

  const dateError = useMemo(
    () => (from && until && until.isBefore(from, 'day') ? 'End date cannot be before the start date.' : null),
    [from, until],
  );

  const canSubmit = !!assignment && !!role && !dateError && !update.isPending;

  const onUnitChange = (next: UnitOption | null) => {
    setUnitId(next?.id ?? '');
  };

  const submit = async () => {
    if (!canSubmit || !assignment || !role) return;
    const payload: UpdateAssignmentPayload = {
      roleId: role.id,
      organizationalUnitId: unitId || null,
      scope,
      effectiveFrom: from ? from.toISOString() : null,
      effectiveUntil: until ? until.toISOString() : null,
    };
    try {
      const updated = await update.mutateAsync({ id: assignment.id, payload });
      onSaved?.(updated.userId);
      onClose();
    } catch {
      // surfaced inline below
    }
  };

  return (
    <Dialog
      open={open}
      onClose={update.isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
      aria-labelledby="edit-assignment-title"
    >
      <DialogTitle id="edit-assignment-title" sx={{ fontWeight: 700 }}>Edit assignment</DialogTitle>
      <DialogContent>
        {assignment && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Person &amp; tenant (fixed)</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip size="small" label={assignment.person?.name ?? 'Unknown person'} sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: 'action.hover' }} />
              {assignment.tenant && <Chip size="small" label={assignment.tenant.name} sx={{ borderRadius: 1.5, bgcolor: 'action.hover' }} />}
            </Box>
          </Box>
        )}

        {update.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorMessage(update.error)}</Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <RolePicker value={role} onChange={setRole} disabled={update.isPending} />
          <UnitSelect tenantId={assignment?.tenantId} value={unitId} onChange={onUnitChange} disabled={update.isPending} />

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <AssignmentDateField label="Start date" value={from} onChange={setFrom} disabled={update.isPending} />
            <AssignmentDateField label="End date" value={until} onChange={setUntil} disabled={update.isPending} minDate={from ?? undefined} helperText="Blank = no expiry" />
          </Box>
          {dateError && <Alert severity="warning" sx={{ borderRadius: 2 }}>{dateError}</Alert>}

          <FormControlLabel
            control={<Switch checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />}
            label={<Typography variant="body2">Advanced: change scope</Typography>}
          />
          <Collapse in={advanced} unmountOnExit>
            <ScopeSelect value={scope} hasUnit={!!unitId} disabled={update.isPending} onChange={setScope} />
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={update.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={!canSubmit} sx={{ textTransform: 'none', borderRadius: 2 }}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditAssignmentDialog;
