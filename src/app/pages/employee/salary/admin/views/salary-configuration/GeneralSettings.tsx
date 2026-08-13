import { safeJsonParse } from '@utils/safeJson';
import { fetchAllEmployeesSelectedData, updateEmployee } from '@services/employee';
import React, { useState, useEffect } from 'react';
import { EmployeeSelectionDialog } from '@app/modules/common/components/EmployeeSelectionDialog';
import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';
import { TRIO } from '@app/modules/common/components/ui/tw';
import { getAvatar } from '@utils/avatar';
import { fetchConfiguration, updateConfigurationById, createNewConfiguration } from '@services/company';
import { EXCLUDE_FROM_LATE_ATTENDANCE, PAYMENT_MODE } from '@constants/configurations-key';
import { successConfirmation } from '@utils/modal';
import { fetchCheckinDeadlineOverrides, saveCheckinDeadlineOverrides, ICheckinDeadlineSaveItem } from '@services/employee';

const HHMM_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** Convert a company "Check-in time" (e.g. "10:00 AM" or "10:00") to 24h "HH:MM", else "". */
const to24hDefault = (t?: string | null): string => {
  if (!t) return '';
  const s = String(t).trim();
  if (HHMM_24H.test(s)) return s;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s);
  if (!m) return '';
  let h = Number(m[1]);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};

// Employee Interface
interface IEmployee {
  id: string;
  name: string;
  designation: string;
  avatar: string;
  gender: number;
}

// Transform API response to IEmployee format
const transformEmployeeData = (apiData: any): IEmployee[] => {
  if (!apiData?.data?.employees) {
    console.warn('No employee data received');
    return [];
  }

  return apiData.data.employees
    .filter((emp: any) => emp.isActive !== false)
    .map((emp: any) => ({
      id: emp.id || '',
      name: emp.users
        ? `${emp.users.firstName || ''} ${emp.users.lastName || ''}`.trim()
        : 'Unknown',
      designation: emp.designations?.role || 'N/A',
      avatar: getAvatar(emp.avatar || null, emp.gender ?? 0),
      gender: emp.gender ?? 0,
    }));
};

function GeneralSettings() {
  const [paymentMode, setPaymentMode] = useState<'Hour Based' | 'Day Based'>('Hour Based');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [configurationId, setConfigurationId] = useState<string>('');
  const [paymentModeConfigurationId, setPaymentModeConfigurationId] = useState<string>('');
  // Custom check-in deadlines (bulk): { employeeId: "HH:MM" }.
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [companyCheckinTime, setCompanyCheckinTime] = useState<string | null>(null);
  // Draft selections while a dialog is open (committed on Save, discarded on close).
  const [tempExcludeIds, setTempExcludeIds] = useState<string[]>([]);
  const [tempDeadlines, setTempDeadlines] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoadingEmployees(true);

        // Fetch both in parallel for better performance
        const [employeesResponse, configResponse, paymentModeResponse, deadlineResponse] = await Promise.all([
          fetchAllEmployeesSelectedData().catch(err => ({ statusCode: 500, data: { employees: [] } })),
          fetchConfiguration(EXCLUDE_FROM_LATE_ATTENDANCE).catch(err => null),
          fetchConfiguration(PAYMENT_MODE).catch(err => null),
          fetchCheckinDeadlineOverrides().catch(() => null),
        ]);

        // Custom check-in deadlines → { employeeId: "HH:MM" }
        if (deadlineResponse) {
          setCompanyCheckinTime(deadlineResponse.companyCheckinTime ?? null);
          const map: Record<string, string> = {};
          (deadlineResponse.overrides || []).forEach((o) => { map[o.employeeId] = o.deadline; });
          setDeadlines(map);
        }

        // Process employees
        if (employeesResponse.statusCode === 200) {
          const transformedEmployees = transformEmployeeData(employeesResponse);
          console.log("transformedEmployees:: ", transformedEmployees);
          setEmployees(transformedEmployees);
        }

        // Process excluded employee IDs
        if (configResponse?.data?.configuration) {
          const configurationComplete = safeJsonParse(
            configResponse.data.configuration.configuration || '{}'
          );
          console.log("configurationComplete:: ", configurationComplete);
          
          console.log("configResponse:: ", configResponse);
          const configurationId = configResponse?.data?.configuration?.id;
          setConfigurationId(configurationId);
          const employeeIdsList = configurationComplete || [];
          
          console.log("employeeIdsList:: ", employeeIdsList);

          if (Array.isArray(employeeIdsList)) {
            setSelectedEmployeeIds(employeeIdsList);
          }
        }

        console.log("paymentModeResponse:: ",paymentModeResponse);
        const selectedPaymentMode = typeof paymentModeResponse?.data?.configuration?.configuration === 'string' ? safeJsonParse(paymentModeResponse?.data?.configuration?.configuration) : paymentModeResponse?.data?.configuration?.configuration;
        console.log("selectedPaymentMode:: ",selectedPaymentMode);
        setPaymentMode(selectedPaymentMode);
        setPaymentModeConfigurationId(paymentModeResponse?.data?.configuration?.id);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        // Set defaults on error
        setEmployees([]);
        setSelectedEmployeeIds([]);
      } finally {
        setLoadingEmployees(false);
      }
    }

    fetchAllData();
  }, []);

  const handleSaveEmployees = async (selectedIds: string[]) => {
    setSelectedEmployeeIds(selectedIds);
    const payload = {
      module: EXCLUDE_FROM_LATE_ATTENDANCE,
      configuration: selectedIds
    };
    if (configurationId) {
      await updateConfigurationById(configurationId, payload);
    } else {
      const res = await createNewConfiguration(payload);
      setConfigurationId(res?.data?.configuration?.id);
    }
    successConfirmation("Excluded from late attendance deduction updated successfully");
    fetchConfiguration(EXCLUDE_FROM_LATE_ATTENDANCE)
    setShowModal(false);
  };

  const handleSaveDeadlines = async (next: Record<string, string>) => {
    // Diff against the loaded state: present → upsert (enabled), removed → clear (disabled).
    const items: ICheckinDeadlineSaveItem[] = [];
    Object.entries(next).forEach(([employeeId, deadline]) =>
      items.push({ employeeId, enabled: true, deadline }));
    Object.keys(deadlines).forEach((employeeId) => {
      if (!(employeeId in next)) items.push({ employeeId, enabled: false, deadline: null });
    });
    if (items.length > 0) await saveCheckinDeadlineOverrides(items);
    setDeadlines(next);
    successConfirmation("Custom check-in deadlines updated successfully");
    setShowDeadlineModal(false);
  };



  const handleSubmitPaymentMode = async () => {
    const payload = {
      module: PAYMENT_MODE,
      configuration: [paymentMode]
    };
    if (paymentModeConfigurationId) {
      await updateConfigurationById(paymentModeConfigurationId, payload);
    } else {
      const res = await createNewConfiguration(payload);
      setPaymentModeConfigurationId(res?.data?.configuration?.id);
    }
    successConfirmation("Payment mode updated successfully");
    fetchConfiguration(PAYMENT_MODE)
  };
  

  const rowBase: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '18px 20px 18px 24px',
    backgroundColor: '#fff',
    border: '1px solid #E8EAF0',
    borderRadius: '14px',
    boxShadow: '0 2px 8px rgba(24,28,50,0.05)',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>

      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #EEF3FC 0%, #fff8f8 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(30, 58, 138,0.1)',
        marginBottom: '2px',
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #3B5BA9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(30, 58, 138,0.25)', flexShrink: 0,
        }}>
          <i className="bi bi-gear-fill" style={{ fontSize: '15px', color: '#fff' }} />
        </div>
        <div>
          <h2 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: '16px', color: '#181C32', margin: 0, letterSpacing: '-0.2px' }}>
            General Settings
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#A1A5B7', margin: 0, fontWeight: 400 }}>
            Payroll settings applied across all employees.
          </p>
        </div>
      </div>

      {/* Payment Mode row */}
      <div
        className="sc-settings-row"
        style={rowBase}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(24,28,50,0.09)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#d1d5e0';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(24,28,50,0.05)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#E8EAF0';
        }}
      >
        {/* Left accent */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '3px', background: 'linear-gradient(to bottom, #1E3A8A, #172554)', borderRadius: '14px 0 0 14px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingLeft: '6px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #EEF3FC 0%, #fce8e8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1E3A8A', fontSize: '19px',
            boxShadow: '0 2px 10px rgba(30, 58, 138,0.12)', flexShrink: 0,
            border: '1px solid rgba(30, 58, 138,0.08)',
          }}>
            <i className="bi bi-wallet2"></i>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14.5px', color: '#181C32', margin: 0 }}>
                Payment Mode
              </h3>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                backgroundColor: '#EEF3FC', color: '#1E3A8A',
                border: '1px solid rgba(30, 58, 138,0.15)',
                borderRadius: '99px', padding: '2px 8px', letterSpacing: '0.3px',
              }}>
                PAYROLL
              </span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', color: '#A1A5B7', margin: '3px 0 0 0', lineHeight: 1.5 }}>
              Select the base payment structure for all employees
            </p>
          </div>
        </div>

        <div className="sc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as 'Hour Based' | 'Day Based')}
            style={{
              padding: '9px 14px',
              borderRadius: '9px',
              border: '1px solid #E1E3EA',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              color: '#374151',
              minWidth: '160px',
              outline: 'none',
              backgroundColor: '#fafbfc',
              cursor: 'pointer',
              appearance: 'auto' as any,
              boxShadow: '0 1px 3px rgba(24,28,50,0.04)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138,0.08)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(24,28,50,0.04)'; }}
          >
            <option value="Hour Based">Hour Based</option>
            <option value="Day Based">Day Based</option>
          </select>
          <button
            onClick={handleSubmitPaymentMode}
            style={{
              backgroundColor: '#1E3A8A',
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              padding: '9px 20px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 3px 10px rgba(30, 58, 138,0.2)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap' as const,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 14px rgba(30, 58, 138,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(30, 58, 138,0.2)'; }}
          >
            <i className="bi bi-check-lg" style={{ fontSize: '14px' }}></i> Save
          </button>
        </div>
      </div>

      {/* Excluded employees row */}
      <div
        className="sc-settings-row"
        style={rowBase}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(24,28,50,0.09)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#d1d5e0';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(24,28,50,0.05)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#E8EAF0';
        }}
      >
        {/* Left accent */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '3px', background: 'linear-gradient(to bottom, #0085db, #3aa3e8)', borderRadius: '14px 0 0 14px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingLeft: '6px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #e1f0fa 0%, #cce4f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0085db', fontSize: '19px',
            boxShadow: '0 2px 10px rgba(0,133,219,0.12)', flexShrink: 0,
            border: '1px solid rgba(0,133,219,0.08)',
          }}>
            <i className="bi bi-person-x"></i>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14.5px', color: '#181C32', margin: 0 }}>
                Excluded from Late Attendance Deduction
              </h3>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                backgroundColor: '#e1f0fa', color: '#0085db',
                border: '1px solid rgba(0,133,219,0.15)',
                borderRadius: '99px', padding: '2px 8px', letterSpacing: '0.3px',
              }}>
                ATTENDANCE
              </span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', color: '#A1A5B7', margin: '3px 0 0 0', lineHeight: 1.5 }}>
              Manage employees exempt from late attendance penalties
            </p>
          </div>
        </div>

        <div className="sc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {selectedEmployeeIds.length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              backgroundColor: '#EEF3FC',
              border: '1px solid rgba(30, 58, 138,0.18)',
              color: '#1E3A8A',
              borderRadius: '9px',
              padding: '7px 13px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: '0 1px 4px rgba(30, 58, 138,0.08)',
            }}>
              <span style={{ fontSize: '15px', lineHeight: 1 }}>{selectedEmployeeIds.length}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#3B5BA9' }}>Selected</span>
            </div>
          )}
          <button
            onClick={() => { setTempExcludeIds(selectedEmployeeIds); setShowModal(true); }}
            style={{
              backgroundColor: '#fff',
              border: '1px solid #E1E3EA',
              borderRadius: '9px',
              cursor: 'pointer',
              padding: '9px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              color: '#374151',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 4px rgba(24,28,50,0.05)',
              whiteSpace: 'nowrap' as const,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0085db'; e.currentTarget.style.color = '#0085db'; e.currentTarget.style.backgroundColor = '#f0f8ff'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,133,219,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(24,28,50,0.05)'; }}
          >
            Configure <i className="bi bi-arrow-right" style={{ fontSize: '13px' }}></i>
          </button>
        </div>
      </div>

      {/* Custom check-in deadlines row */}
      <div
        className="sc-settings-row"
        style={rowBase}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(24,28,50,0.09)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#d1d5e0';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(24,28,50,0.05)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#E8EAF0';
        }}
      >
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '3px', background: 'linear-gradient(to bottom, #7239EA, #9B6FF0)', borderRadius: '14px 0 0 14px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingLeft: '6px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f0e9fc 0%, #e3d5f8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#7239EA', fontSize: '19px',
            boxShadow: '0 2px 10px rgba(114,57,234,0.12)', flexShrink: 0,
            border: '1px solid rgba(114,57,234,0.08)',
          }}>
            <i className="bi bi-clock-history"></i>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14.5px', color: '#181C32', margin: 0 }}>
                Custom Check-in Deadlines
              </h3>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                backgroundColor: '#f0e9fc', color: '#7239EA',
                border: '1px solid rgba(114,57,234,0.15)',
                borderRadius: '99px', padding: '2px 8px', letterSpacing: '0.3px',
              }}>
                ATTENDANCE
              </span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', color: '#A1A5B7', margin: '3px 0 0 0', lineHeight: 1.5 }}>
              Give selected employees a personal on-time cutoff (applies to attendance, salary &amp; KPI)
            </p>
          </div>
        </div>

        <div className="sc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {Object.keys(deadlines).length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              backgroundColor: '#f0e9fc',
              border: '1px solid rgba(114,57,234,0.18)',
              color: '#7239EA',
              borderRadius: '9px', padding: '7px 13px',
              fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '15px', lineHeight: 1 }}>{Object.keys(deadlines).length}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#9B6FF0' }}>Custom</span>
            </div>
          )}
          <button
            onClick={() => { setTempDeadlines(deadlines); setShowDeadlineModal(true); }}
            style={{
              backgroundColor: '#fff', border: '1px solid #E1E3EA', borderRadius: '9px', cursor: 'pointer',
              padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#374151',
              transition: 'all 0.15s ease', boxShadow: '0 1px 4px rgba(24,28,50,0.05)', whiteSpace: 'nowrap' as const,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7239EA'; e.currentTarget.style.color = '#7239EA'; e.currentTarget.style.backgroundColor = '#f7f3fe'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#fff'; }}
          >
            Configure <i className="bi bi-arrow-right" style={{ fontSize: '13px' }}></i>
          </button>
        </div>
      </div>

      {/* Exclude-from-late — plain multi-select */}
      <EmployeeSelectionDialog
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Exclude from late attendance deduction"
        subtitle="Selected employees are exempt from the late-attendance salary deduction"
        icon="profile-circle"
        tone="cyan"
        employees={employees}
        selectedIds={tempExcludeIds}
        onToggle={(id) =>
          setTempExcludeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        onSave={() => handleSaveEmployees(tempExcludeIds)}
        footerNote="Excluded employees are never marked late in payroll."
      />

      {/* Custom check-in deadlines — per-employee time value */}
      <EmployeeSelectionDialog
        open={showDeadlineModal}
        onClose={() => setShowDeadlineModal(false)}
        title="Custom check-in deadlines"
        subtitle="Give selected employees a personal on-time cutoff"
        icon="time"
        tone="purple"
        employees={employees}
        selectedIds={Object.keys(tempDeadlines)}
        onToggle={(id) =>
          setTempDeadlines((prev) => {
            if (id in prev) { const { [id]: _omit, ...rest } = prev; return rest; }
            return { ...prev, [id]: to24hDefault(companyCheckinTime) };
          })
        }
        renderTrailing={(emp) => {
          const val = tempDeadlines[emp.id] || '';
          return (
            <TimeWheelField
              value={val}
              onChange={(v) => setTempDeadlines((prev) => ({ ...prev, [emp.id]: v }))}
              tone={TRIO.purple}
              invalid={!HHMM_24H.test(val)}
              fullWidth={false}
            />
          );
        }}
        saveDisabled={Object.keys(tempDeadlines).some((id) => !HHMM_24H.test(tempDeadlines[id] || ''))}
        onSave={() => handleSaveDeadlines(tempDeadlines)}
        footerNote="Check-in at/before the time = on-time; after = late."
      />
    </div>
  );
}

export default GeneralSettings;