import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, GitBranch, Users } from 'lucide-react';
import { Item, ItemActions, ItemGroup } from '@/ds/ui/item';
import { Spinner } from '@/ds/ui/spinner';
import { EmptyState } from '@/ds/patterns/empty-state';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { PersonCell } from '@/ds/patterns/person';
import { fetchEmployeesByBranch } from '@services/employee';

/**
 * Employees in one branch — a read-only Form Dialog (one Close button).
 *
 * Each row is a link to the employee profile — this used to be a static roster with no
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

  const count = employees.length;

  return (
    <FormDialog
      open={show}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={`${branchName || 'Branch'} — Employees`}
      description={loading ? 'Loading…' : `${count} employee${count !== 1 ? 's' : ''} · open one to see the profile`}
      icon={<GitBranch aria-hidden />}
      tone="cyan"
      size="lg"
    >
      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Spinner className="size-5" aria-label="Loading employees" /> Loading employees…
        </p>
      ) : count === 0 ? (
        <EmptyState
          size="sm"
          icon={<Users aria-hidden />}
          title="No employees in this branch yet"
          description="Assign people to this branch from Employees, then reopen this list."
        />
      ) : (
        <ItemGroup className="gap-2">
          {employees.map((emp) => {
            const name = `${emp.users?.firstName ?? ''} ${emp.users?.lastName ?? ''}`.trim() || 'Unnamed';
            const role = [emp.designations?.role, emp.departments?.name].filter(Boolean).join(' · ');
            const email = emp.companyEmailId || emp.users?.personalEmailId;
            return (
              <Item
                key={emp.id}
                variant="outline"
                size="sm"
                render={<Link to={`/employees/${emp.id}`} onClick={onClose} aria-label={`Open ${name}`} />}
              >
                <PersonCell
                  name={name}
                  code={emp.employeeCode}
                  subtitle={role || undefined}
                  avatarUrl={emp.avatar}
                  inactive={emp.isActive === false}
                  className="flex-1"
                />
                <ItemActions className="text-xs text-muted-foreground">
                  {email && <span className="max-w-56 truncate max-md:hidden">{email}</span>}
                  <ChevronRight className="size-4" aria-hidden />
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      )}
    </FormDialog>
  );
}
