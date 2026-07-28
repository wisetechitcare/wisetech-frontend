import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Switch, Typography,
} from '@mui/material';
import type { Dayjs } from 'dayjs';
import { useCreateAssignment } from '../hooks/useAssignments';
import { errorMessage } from '../utils/format';
import type { AssignmentScope, CreateAssignmentPayload, PersonOption, RoleOption, UnitOption } from '../types';
import {
  AssignmentDateField, PersonPicker, RolePicker, ScopeSelect, TenantSelect, UnitSelect,
} from './PickerFields';

interface CreateAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (userId: string) => void;
}

/** Scope defaults exactly like the backend: unit chosen → subtree, else tenant. */
const deriveScope = (hasUnit: boolean): AssignmentScope => (hasUnit ? 'unit_subtree' : 'tenant');

/** Assign a role to a person. Person → Role → Tenant → Unit → Scope → dates. */
export const CreateAssignmentDialog = ({ open, onClose, onCreated }: CreateAssignmentDialogProps) => {
  const [person, setPerson] = useState<PersonOption | null>(null);
  const [role, setRole] = useState<RoleOption | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [unit, setUnit] = useState<UnitOption | null>(null);
  const [scope, setScope] = useState<AssignmentScope>('tenant');
  const [scopeTouched, setScopeTouched] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [until, setUntil] = useState<Dayjs | null>(null);

  const create = useCreateAssignment();

  useEffect(() => {
    if (open) {
      setPerson(null); setRole(null); setTenantId(''); setUnit(null);
      setScope('tenant'); setScopeTouched(false); setAdvanced(false);
      setFrom(null); setUntil(null);
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-derive scope from the unit choice until the user overrides it manually.
  useEffect(() => {
    if (!scopeTouched) setScope(deriveScope(!!unit));
  }, [unit, scopeTouched]);

  // Changing the tenant clears any unit selected under the previous tenant.
  const onTenantChange = (id: string) => {
    setTenantId(id);
    setUnit(null);
  };

  const dateError = useMemo(
    () => (from && until && until.isBefore(from, 'day') ? 'End date cannot be before the start date.' : null),
    [from, until],
  );

  const canSubmit = !!person && !!role && !!tenantId && !dateError && !create.isPending;

  const submit = async () => {
    if (!canSubmit || !person || !role) return;
    const payload: CreateAssignmentPayload = {
      userId: person.id,
      roleId: role.id,
      tenantId,
      organizationalUnitId: unit?.id ?? null,
      scope,
      effectiveFrom: from ? from.toISOString() : undefined,
      effectiveUntil: until ? until.toISOString() : undefined,
    };
    try {
      const created = await create.mutateAsync(payload);
      onCreated?.(created.userId);
      onClose();
    } catch {
      // surfaced inline below
    }
  };

  return (
    <Dialog
      open={open}
      onClose={create.isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
      aria-labelledby="create-assignment-title"
    >
      <DialogTitle id="create-assignment-title" sx={{ fontWeight: 700 }}>New assignment</DialogTitle>
      <DialogContent>
        {create.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorMessage(create.error)}</Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <PersonPicker value={person} onChange={setPerson} disabled={create.isPending} />
          <RolePicker value={role} onChange={setRole} disabled={create.isPending} />
          <TenantSelect value={tenantId} onChange={onTenantChange} required disabled={create.isPending} />
          <UnitSelect tenantId={tenantId} value={unit?.id ?? ''} onChange={setUnit} disabled={create.isPending} />

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <AssignmentDateField
              label="Start date"
              value={from}
              onChange={setFrom}
              disabled={create.isPending}
              helperText="Defaults to now if left blank"
            />
            <AssignmentDateField
              label="End date"
              value={until}
              onChange={setUntil}
              disabled={create.isPending}
              minDate={from ?? undefined}
              helperText="Leave blank for no expiry"
            />
          </Box>
          {dateError && <Alert severity="warning" sx={{ borderRadius: 2 }}>{dateError}</Alert>}

          <FormControlLabel
            control={<Switch checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />}
            label={<Typography variant="body2">Advanced: choose scope manually</Typography>}
          />
          <Collapse in={advanced} unmountOnExit>
            <ScopeSelect
              value={scope}
              hasUnit={!!unit}
              disabled={create.isPending}
              onChange={(s) => { setScope(s); setScopeTouched(true); }}
            />
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={create.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={!canSubmit} sx={{ textTransform: 'none', borderRadius: 2 }}>
          {create.isPending ? 'Assigning…' : 'Create assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateAssignmentDialog;
