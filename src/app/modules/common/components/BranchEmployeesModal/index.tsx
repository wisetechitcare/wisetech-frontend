import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Typography, CircularProgress, alpha } from '@mui/material';
import { fetchEmployeesByBranch } from '@services/employee';
import { getAvatar } from '@utils/avatar';
import { GlassDialog, GlassHeader, ToneChip } from '@app/modules/common/components/ui';
import SmartAvatar from '@app/modules/common/components/SmartAvatar';
import { IconUsers, IconBranch, IconChevron } from '@app/modules/common/components/icons/OrgIcons';

/**
 * Employees in one branch.
 *
 * Rows open the employee profile — this used to be a static roster with no
 * drill-in, so operators saw a name and had to hunt through Employees to act.
 */

interface EmpRow {
  id: string;
  avatar?: string;
  gender?: number | string;
  employeeCode?: string;
  isActive?: boolean;
  companyEmailId?: string;
  users?: { firstName?: string; lastName?: string; personalEmailId?: string };
  designations?: { id: string; role?: string };
  departments?: { id: string; name?: string };
}

interface Props {
  show: boolean;
  branchId?: string;
  branchName?: string;
  onClose: () => void;
}

export default function BranchEmployeesModal({ show, branchId, branchName, onClose }: Props) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !branchId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchEmployeesByBranch(branchId);
        // Show only active members in this branch list (exclude inactive employees).
        if (!cancelled && !res.hasError) {
          setEmployees((res.data?.employees ?? []).filter((emp: EmpRow) => emp.isActive !== false));
        }
      } catch { /* surfaced as empty */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [show, branchId]);

  function openEmployee(empId: string) {
    onClose();
    navigate(`/employees/${empId}`);
  }

  return (
    <GlassDialog
      open={show} onClose={onClose} maxWidth="md" fullWidth
      header={
        <GlassHeader
          title={`${branchName || 'Branch'} — Employees`}
          subtitle={loading ? 'Loading…' : `${employees.length} employee${employees.length !== 1 ? 's' : ''} · click a row to open`}
          icon={<IconBranch size={22} />}
          onClose={onClose}
        />
      }
    >
      <Box sx={{ bgcolor: 'background.default', p: { xs: 1.5, sm: 2.5 }, maxHeight: '64vh', overflowY: 'auto' }}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={26} /></Stack>
        ) : employees.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>
            <Box sx={{ mb: 1.25, color: 'text.disabled' }}><IconUsers size={34} /></Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.secondary' }}>
              No employees in this branch yet
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>
            {employees.map(emp => {
              const name = `${emp.users?.firstName ?? ''} ${emp.users?.lastName ?? ''}`.trim() || 'Unnamed';
              const avatarUrl = getAvatar(emp.avatar || '', Number(emp.gender) === 1 ? 1 : Number(emp.gender) === 0 ? 0 : 2);
              return (
                <Stack
                  key={emp.id}
                  component="button"
                  type="button"
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  onClick={() => openEmployee(emp.id)}
                  aria-label={`Open ${name}`}
                  sx={{
                    width: '100%', textAlign: 'left', font: 'inherit',
                    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                    borderRadius: '10px', px: 1.75, py: 1.25, cursor: 'pointer',
                    transition: 'background-color .15s ease, border-color .15s ease, box-shadow .15s ease',
                    '&:hover': {
                      borderColor: 'primary.light',
                      bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.06),
                      boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.12)}`,
                    },
                    '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
                  }}
                >
                  <SmartAvatar imageUrl={avatarUrl} name={name} id={emp.id} size={38} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: 'text.primary' }}>{name}</Typography>
                      {emp.employeeCode && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, flexShrink: 0 }}>
                          {emp.employeeCode}
                        </Typography>
                      )}
                      {emp.isActive === false && <ToneChip dense tone="danger" label="Inactive" />}
                    </Stack>
                    <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {emp.designations?.role || '—'}{emp.departments?.name ? ` · ${emp.departments.name}` : ''}
                    </Typography>
                  </Box>
                  {(emp.companyEmailId || emp.users?.personalEmailId) && (
                    <Typography
                      noWrap
                      sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 220, display: { xs: 'none', md: 'block' } }}
                    >
                      {emp.companyEmailId || emp.users?.personalEmailId}
                    </Typography>
                  )}
                  <Box sx={{ color: 'text.disabled', display: 'grid', placeItems: 'center', flexShrink: 0 }} aria-hidden>
                    <IconChevron size={16} />
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
    </GlassDialog>
  );
}
