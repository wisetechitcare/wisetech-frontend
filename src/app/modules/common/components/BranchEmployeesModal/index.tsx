import { useEffect, useState } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { fetchEmployeesByBranch } from '@services/employee';
import { getAvatar } from '@utils/avatar';
import { GlassDialog, GlassHeader, ToneChip } from '@app/modules/common/components/ui';
import SmartAvatar from '@app/modules/common/components/SmartAvatar';
import { IconUsers, IconBranch } from '@app/modules/common/components/icons/OrgIcons';

/**
 * Employees in one branch.
 *
 * ON THE KIT, AND THAT IS A BUG FIX, NOT A REPAINT. This was a react-bootstrap
 * Modal, and its parent (the Branches dialog) has moved to the kit's MUI dialog.
 * Bootstrap and MUI keep separate stacking levels — Bootstrap's modal sits below
 * MUI's — so this one opened BEHIND the dialog that launched it and could not be
 * read or dismissed. Two dialog systems in one app is what produces that class of
 * defect; the fix is to have one.
 *
 * Everything else here was hand-rolled too: an inline <style> block, a local
 * eight-colour palette, its own close button, a Bootstrap spinner class, and an
 * avatar assembled from an <img> plus a fallback.
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

  return (
    <GlassDialog
      open={show} onClose={onClose} maxWidth="md" fullWidth
      header={
        <GlassHeader
          title={`${branchName || 'Branch'} — Employees`}
          subtitle={loading ? 'Loading…' : `${employees.length} employee${employees.length !== 1 ? 's' : ''}`}
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
                  key={emp.id} direction="row" spacing={1.5} alignItems="center"
                  sx={{
                    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                    borderRadius: '10px', px: 1.75, py: 1.25,
                  }}
                >
                  {/* SmartAvatar owns the image-plus-initials fallback — this file
                      had its own <img> in a bordered circle with no fallback. */}
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
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
    </GlassDialog>
  );
}
