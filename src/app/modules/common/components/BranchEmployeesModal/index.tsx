import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { fetchEmployeesByBranch } from '@services/employee';
import { getAvatar } from '@utils/avatar';
import { IconUsers, IconBranch, IconClose } from '@app/modules/common/components/icons/OrgIcons';

const C = { brand: '#9D4141', brandSoft: '#FBEEEE', brandBorder: '#EBD2D2', ink: '#1F2430', inkSoft: '#5A6172', inkFaint: '#98A0B0', line: '#ECEEF3', panel: '#F7F8FA' };

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
    <Modal show={show} onHide={onClose} centered size="lg" contentClassName="branch-emp-modal-content">
      <style>{`.branch-emp-modal-content{border:none;border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(8,10,18,.4);}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${C.line}`, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EAF1FB', border: '1px solid #D5E3F6', display: 'grid', placeItems: 'center', color: '#3B6FB0' }}><IconBranch size={19} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>{branchName || 'Branch'} — Employees</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 1 }}>{loading ? 'Loading…' : `${employees.length} employee${employees.length !== 1 ? 's' : ''}`}</div>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', color: C.inkSoft, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><IconClose size={16} /></button>
      </div>

      {/* Body */}
      <div style={{ background: C.panel, padding: '16px 20px', maxHeight: '64vh', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: C.inkFaint }}>
            <div className="spinner-border" style={{ color: C.brand, width: 26, height: 26 }} />
          </div>
        ) : employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '44px 20px', color: C.inkFaint }}>
            <div style={{ display: 'inline-flex', marginBottom: 10, color: '#C7CDDA' }}><IconUsers size={34} /></div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.inkSoft }}>No employees in this branch yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {employees.map(emp => {
              const name = `${emp.users?.firstName ?? ''} ${emp.users?.lastName ?? ''}`.trim() || 'Unnamed';
              const avatarUrl = getAvatar(emp.avatar || '', Number(emp.gender) === 1 ? 1 : Number(emp.gender) === 0 ? 0 : 2);
              return (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.line}`, background: '#f3f4f6' }}>
                    {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      {emp.employeeCode && <span style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600 }}>{emp.employeeCode}</span>}
                      {emp.isActive === false && <span style={{ fontSize: 10, fontWeight: 700, color: '#D14343', background: '#FFF1F1', border: '1px solid #F3C7C7', borderRadius: 999, padding: '1px 7px' }}>Inactive</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.designations?.role || '—'}{emp.departments?.name ? ` · ${emp.departments.name}` : ''}
                    </div>
                  </div>
                  {(emp.companyEmailId || emp.users?.personalEmailId) && (
                    <span style={{ fontSize: 12, color: C.inkSoft, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="d-none d-md-block">
                      {emp.companyEmailId || emp.users?.personalEmailId}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
