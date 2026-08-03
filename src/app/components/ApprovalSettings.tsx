import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { ColourOption, SingleValue, DropdownIndicator } from '@app/modules/common/inputs/ColorInDropdwon';
import {
  deleteApprovalWorkflowConfig,
  fetchAllEmployeesSelectedData,
  fetchApprovalWorkflowConfigs,
  saveApprovalWorkflowChain,
} from '@services/employee';
import { errorConfirmation, successConfirmation } from '@utils/modal';

type WorkflowType = 'attendance' | 'leave' | 'reimbursement';

interface ApproverOption {
  value: string;
  label: string;
  avatar?: string | null;
}

interface ApprovalSettingsProps {
  employeeId: string;
}

const MODULES: Array<{ key: WorkflowType; label: string }> = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'reimbursement', label: 'Reimbursement' },
];

const emptyChain = (): string[] => ['', '', '', '', ''];

const emptyRecord = (): Record<WorkflowType, string[]> => ({
  attendance: emptyChain(),
  leave: emptyChain(),
  reimbursement: emptyChain(),
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ApprovalSettings: React.FC<ApprovalSettingsProps> = ({ employeeId }) => {
  const [approverOptions, setApproverOptions] = useState<ApproverOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<WorkflowType, boolean>>({
    attendance: false,
    leave: false,
    reimbursement: false,
  });
  const [chains, setChains] = useState<Record<WorkflowType, string[]>>(emptyRecord());
  const [configIds, setConfigIds] = useState<Record<WorkflowType, string[]>>(emptyRecord());
  // What is actually PERSISTED, mirrored from the server on load and after each save.
  // `configIds` can't stand in for this: it stays populated when the user swaps an
  // already-saved approver for another, so it can't tell "saved" from "edited but unsaved".
  const [savedChains, setSavedChains] = useState<Record<WorkflowType, string[]>>(emptyRecord());

  useEffect(() => {
    if (!employeeId) return;
    loadData();
  }, [employeeId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [employeesRes, workflowsRes] = await Promise.all([
        fetchAllEmployeesSelectedData(),
        fetchApprovalWorkflowConfigs(employeeId),
      ]);

      const employeeList: any[] = employeesRes?.data?.employees || employeesRes?.data || [];
      setApproverOptions(
        employeeList
          .filter((emp: any) => emp?.id && emp?.id !== employeeId && emp?.isActive !== false)
          .map((emp: any) => ({
            value: String(emp.id),
            label: `${emp?.users?.firstName || emp?.firstName || ''} ${emp?.users?.lastName || emp?.lastName || ''}`.trim() || String(emp.id),
            avatar: emp.avatar ?? null,
          }))
          .sort((a: ApproverOption, b: ApproverOption) => a.label.localeCompare(b.label)),
      );

      const configs: any[] = workflowsRes?.data || workflowsRes || [];
      const nextChains = emptyRecord();
      const nextIds = emptyRecord();

      configs.forEach((cfg: any) => {
        const type = cfg?.workflowType as WorkflowType;
        if (!type || !nextChains[type]) return;
        const idx = Number(cfg.level) - 1;
        if (idx >= 0 && idx < 5 && cfg?.isActive) {
          nextChains[type][idx] = String(cfg.approverId || '');
          nextIds[type][idx] = String(cfg.id || '');
        }
      });

      setChains(nextChains);
      setConfigIds(nextIds);
      setSavedChains({
        attendance: [...nextChains.attendance],
        leave: [...nextChains.leave],
        reimbursement: [...nextChains.reimbursement],
      });
    } catch (err) {
      console.error('Failed to load approval settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = (type: WorkflowType, idx: number, value: string) => {
    setChains(prev => {
      const updated = { ...prev };
      updated[type] = [...prev[type]];
      updated[type][idx] = value;
      return updated;
    });
  };

  const handleSave = async (type: WorkflowType) => {
    const chain = chains[type];
    if (!chain[0]) {
      errorConfirmation('Level 1 approver is required');
      return;
    }

    const seen = new Set<string>();
    for (let i = 0; i < chain.length; i++) {
      const cur = chain[i];
      const prev = i === 0 ? cur : chain[i - 1];
      if (!prev && cur) {
        errorConfirmation('Approval levels must be contiguous without gaps');
        return;
      }
      if (cur) {
        if (seen.has(cur)) {
          errorConfirmation('Same approver cannot be selected in multiple levels');
          return;
        }
        seen.add(cur);
      }
    }

    setIsSaving(prev => ({ ...prev, [type]: true }));
    try {
      const levels = chain.map((approverId, index) => ({
        level: index + 1,
        approverId: approverId || null,
      }));
      await saveApprovalWorkflowChain(employeeId, type, levels);

      const refreshed = await fetchApprovalWorkflowConfigs(employeeId, type);
      const configs: any[] = refreshed?.data || refreshed || [];
      const ids = emptyChain();
      configs.forEach((cfg: any) => {
        const idx = Number(cfg.level) - 1;
        if (idx >= 0 && idx < 5 && cfg?.isActive) ids[idx] = String(cfg.id || '');
      });
      setConfigIds(prev => ({ ...prev, [type]: ids }));
      setSavedChains(prev => ({ ...prev, [type]: [...chain] }));

      successConfirmation(`${capitalize(type)} approval chain saved`);
    } catch (err: any) {
      errorConfirmation(
        err?.response?.data?.message || err?.response?.data?.detail || 'Failed to save approval settings',
      );
    } finally {
      setIsSaving(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDelete = async (type: WorkflowType) => {
    const ids = configIds[type].filter(Boolean);
    if (!ids.length) {
      setChains(prev => ({ ...prev, [type]: emptyChain() }));
      setSavedChains(prev => ({ ...prev, [type]: emptyChain() }));
      return;
    }

    if (!window.confirm(`Clear all ${type} approval levels? This cannot be undone.`)) return;

    setIsSaving(prev => ({ ...prev, [type]: true }));
    try {
      await Promise.all(ids.map(id => deleteApprovalWorkflowConfig(id)));
      setChains(prev => ({ ...prev, [type]: emptyChain() }));
      setConfigIds(prev => ({ ...prev, [type]: emptyChain() }));
      setSavedChains(prev => ({ ...prev, [type]: emptyChain() }));
      successConfirmation(`${capitalize(type)} approval chain deleted`);
    } catch (err: any) {
      errorConfirmation(
        err?.response?.data?.message || err?.response?.data?.detail || 'Failed to delete approval settings',
      );
    } finally {
      setIsSaving(prev => ({ ...prev, [type]: false }));
    }
  };

  if (isLoading) {
    return <div className="text-muted py-3">Loading approval settings...</div>;
  }

  return (
    <div className="d-flex flex-column gap-4">
      {MODULES.map(({ key, label }) => {
        // Level 1 is the requirement — without it the module has no approver at all.
        // Three states drive the row: nothing chosen, chosen but not yet persisted,
        // and persisted. `handleSave` already rejects an empty Level 1; surfacing it
        // inline means the user sees it before they press Save, not after.
        const isMissing = !chains[key][0];
        const isDirty = chains[key].join('|') !== savedChains[key].join('|');

        return (
        <div key={key} className="border rounded p-4">
          <div className="row g-3 align-items-end">
            {/* Category label */}
            <div className="col-12 col-xl-2 d-flex align-items-center">
              <label className="form-label fw-semibold mb-0">{label}</label>
            </div>

            {/* Level dropdowns */}
            {[0, 1, 2, 3, 4].map(idx => (
              <div key={`${key}-l${idx + 1}`} className="col-12 col-sm-6 col-md-4 col-xl-2">
                <label
                  className={`form-label mb-1 ${idx === 0 ? 'required' : ''}`}
                  style={{ fontSize: '0.8125rem' }}
                >
                  Level {idx + 1}
                </label>
                <Select
                  options={approverOptions}
                  value={approverOptions.find(opt => opt.value === chains[key][idx]) ?? null}
                  onChange={selected => handleLevelChange(key, idx, selected?.value ?? '')}
                  placeholder={idx === 0 ? 'Select approver' : 'N/A'}
                  isClearable
                  isSearchable
                  components={{ Option: ColourOption, SingleValue, DropdownIndicator }}
                  classNamePrefix="react-select"
                  className="react-select-styled"
                />
                {idx === 0 && isMissing && (
                  <div className="text-danger fs-8 mt-1">Level 1 approver is required</div>
                )}
              </div>
            ))}

            {/* Actions */}
            <div className="col-12 d-flex justify-content-between align-items-center gap-2 flex-wrap mt-2">
              <span className="fs-8">
                {isMissing ? (
                  <span className="text-danger">Not configured</span>
                ) : isDirty ? (
                  <span className="text-warning">Unsaved changes — press Save to apply</span>
                ) : (
                  <span className="text-success">Saved</span>
                )}
              </span>
              <span className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm btn-light-danger"
                  onClick={() => handleDelete(key)}
                  disabled={isSaving[key]}
                >
                  Delete Chain
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ backgroundColor: '#1E3A8A', border: 'none' }}
                  onClick={() => handleSave(key)}
                  disabled={isSaving[key]}
                >
                  {isSaving[key] ? 'Saving...' : 'Save'}
                </button>
              </span>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default ApprovalSettings;
