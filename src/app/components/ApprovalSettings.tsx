


import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import { ColourOption, SingleValue, DropdownIndicator } from '@app/modules/common/inputs/ColorInDropdwon';
import { FLOATING_MENU_PROPS } from '@app/modules/common/inputs/selectMenuProps';
import {
  fetchAllEmployeesSelectedData,
  fetchApprovalWorkflowConfigs,
  saveApprovalWorkflowChain,
} from '@services/employee';

type WorkflowType = 'attendance' | 'leave' | 'reimbursement' | 'billing_request';

interface ApproverOption {
  value: string;
  label: string;
  avatar?: string | null;
}

export type ApprovalChains = Record<WorkflowType, string[]>;

interface ApprovalSettingsProps {
  /**
   * The employee these chains belong to. Omit during ONBOARDING — the row does not
   * exist yet, and every endpoint here is keyed by employee id.
   */
  employeeId?: string;
  /**
   * The parent ALWAYS owns the chains and persists them with its own single save —
   * on create once the employee exists, on edit alongside every other field. This
   * component only picks approvers; it never writes.
   */
  value?: ApprovalChains;
  onChange?: (next: ApprovalChains) => void;
  /**
   * Whether to surface "Level 1 approver is required" inline. Defaults to true, which
   * is right for the edit screen — the chains are either configured or they are not,
   * and the user came here to see that.
   *
   * Onboarding passes the field's touched state instead: a blank form the admin has
   * only just scrolled to is not a form they skipped, and greeting them with three red
   * errors before they have done anything reads as broken rather than instructive.
   */
  showErrors?: boolean;
}

const MODULES: Array<{ key: WorkflowType; label: string }> = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'reimbursement', label: 'Reimbursement' },
  // Billing Request approval chain. Same generic framework as every other module —
  // configuring approvers here is all that is needed to route a billing request.
  { key: 'billing_request', label: 'Billing Request' },
];

const emptyChain = (): string[] => ['', '', '', '', ''];

const emptyRecord = (): Record<WorkflowType, string[]> => ({
  attendance: emptyChain(),
  leave: emptyChain(),
  reimbursement: emptyChain(),
  billing_request: emptyChain(),
});

// Read the display name off MODULES rather than capitalizing the key — a snake_case key
// like `billing_request` would otherwise surface as "Billing_request" in toasts.
const capitalize = (s: string) =>
  MODULES.find((m) => m.key === s)?.label ?? s.charAt(0).toUpperCase() + s.slice(1);

export const emptyApprovalChains = (): ApprovalChains => emptyRecord();

/**
 * Saved `ApprovalWorkflowConfig` rows → the flat five-slot chains this form edits.
 *
 * Exported because the chains have to be loadable WITHOUT rendering this component. The
 * edit wizard only mounts the step you are looking at, so the chains used to arrive in
 * Formik purely as a side effect of opening Payroll & Access — and its save gate, which
 * reads those form values, refused every employee whose approvers were configured but
 * whose Approval Settings step had not been visited this session.
 *
 * Ignores workflow types this form does not edit (`conveyance` is in the data).
 */
export const approvalChainsFromConfigs = (configs: any[] | null | undefined): ApprovalChains => {
  const chains = emptyRecord();

  // Callers hand this whatever the endpoint returned, which is `{ data: [...] }` on some
  // paths and the array itself on others — anything that is not a list means no chains.
  (Array.isArray(configs) ? configs : []).forEach((cfg: any) => {
    const type = cfg?.workflowType as WorkflowType;
    if (!type || !chains[type]) return;
    const idx = Number(cfg.level) - 1;
    if (idx >= 0 && idx < 5 && cfg?.isActive) {
      chains[type][idx] = String(cfg.approverId || '');
    }
  });

  return chains;
};

/**
 * Shared rule set for one chain. Exported so the onboarding wizard, which persists
 * these AFTER creating the employee, rejects exactly what the inline Save rejects
 * rather than posting a chain the edit screen would refuse.
 *
 * Returns the problem, or null when the chain is fine.
 */
export const validateApprovalChain = (chain: string[]): string | null => {
  if (!chain[0]) return 'Level 1 approver is required';

  const seen = new Set<string>();
  for (let i = 0; i < chain.length; i++) {
    const cur = chain[i];
    const prev = i === 0 ? cur : chain[i - 1];
    if (!prev && cur) return 'Approval levels must be contiguous without gaps';
    if (cur) {
      if (seen.has(cur)) return 'Same approver cannot be selected in multiple levels';
      seen.add(cur);
    }
  }
  return null;
};

/**
 * Write approval chains for an employee. Shared by every screen that edits them — the
 * onboarding wizard and the App Settings modal — so the two cannot drift on what counts as
 * a valid chain or on which chains get written.
 *
 * Non-fatal by design: a chain that fails is logged and the rest still go. Callers use this
 * after the employee record itself is saved, and a comms/validation hiccup on one workflow
 * must not roll back the whole save.
 *
 * An all-empty chain is skipped rather than posted, so an untouched workflow stays unset
 * instead of being written as a row of nulls.
 */
export const persistApprovalChains = async (
  chains: Partial<ApprovalChains> | null | undefined,
  targetEmployeeId: string,
): Promise<void> => {
  if (!chains || !targetEmployeeId) return;

  // Derived from MODULES, not listed by hand. This helper arrived with three workflow
  // types hardcoded and the branch it merged into had added a fourth
  // (`billing_request`), so a billing chain would have been configured in the UI and
  // then silently not written. Deriving it means adding a workflow stays a one-line
  // change instead of a hunt for every hardcoded list.
  for (const { key: type } of MODULES) {
    const chain: string[] = Array.isArray(chains?.[type]) ? (chains[type] as string[]) : [];
    if (!chain.some(Boolean)) continue;
    if (validateApprovalChain(chain)) continue;

    try {
      await saveApprovalWorkflowChain(
        targetEmployeeId,
        type,
        chain.map((approverId, index) => ({ level: index + 1, approverId: approverId || null })),
      );
    } catch (error) {
      console.error(`Failed to save ${type} approval chain:`, error);
    }
  }
};

const ApprovalSettings: React.FC<ApprovalSettingsProps> = ({
  employeeId,
  value,
  onChange,
  showErrors = true,
}) => {
  const [approverOptions, setApproverOptions] = useState<ApproverOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Which employee's saved chains have already been pushed up to the parent. Guards the
  // one-time seed below so a re-render can never overwrite edits the user has since made.
  const seededFor = useRef<string | null>(null);

  /**
   * Controlled when the parent supplies `onChange` (the wizard, which owns the values in
   * Formik and saves them with the rest of the form). Uncontrolled otherwise.
   *
   * The uncontrolled path is NOT optional: App Settings mounts this with `employeeId` alone.
   * A previous version read only from `value`, so that screen rendered every picker empty and
   * flagged "Level 1 approver is required" for employees who already had approvers configured
   * — the saved chains were pushed to an `onChange` that did not exist and were dropped.
   */
  const controlled = typeof onChange === 'function';
  const [internalChains, setInternalChains] = useState<ApprovalChains>(emptyRecord());
  const chainsInUse: ApprovalChains = controlled ? (value ?? emptyRecord()) : internalChains;

  useEffect(() => {
    // Runs in BOTH modes: even with no employee to load chains for, the approver
    // list still has to be fetched or every dropdown would be empty.
    loadData();
  }, [employeeId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [employeesRes, workflowsRes] = await Promise.all([
        fetchAllEmployeesSelectedData(),
        employeeId ? fetchApprovalWorkflowConfigs(employeeId) : Promise.resolve(null),
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

      const nextChains = approvalChainsFromConfigs(workflowsRes?.data || workflowsRes || []);


      // Uncontrolled: hold the loaded chains ourselves so the pickers actually show them.
      if (!controlled) setInternalChains(nextChains);

      // Controlled: hand the saved chains to the parent form so they render in the pickers
      // and travel with its single save, exactly like create mode. Once per employee —
      // re-seeding would silently discard in-progress edits.
      else if (employeeId && seededFor.current !== employeeId) {
        seededFor.current = employeeId;
        onChange?.(nextChains);
      }
    } catch (err) {
      console.error('Failed to load approval settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = (type: WorkflowType, idx: number, selectedId: string) => {
    const next: ApprovalChains = { ...chainsInUse, [type]: [...chainsInUse[type]] };
    next[type][idx] = selectedId;
    if (controlled) onChange?.(next);
    else setInternalChains(next);
  };

  if (isLoading) {
    return <div className="text-muted py-3">Loading approval settings...</div>;
  }

  return (
    <div className="d-flex flex-column gap-4">
      {MODULES.map(({ key, label }) => {
        // Level 1 is the requirement — without it the module has no approver at all.
        // Surfaced inline so the user sees it while filling the row, not when the
        // wizard's save is refused.
        const isMissing = !chainsInUse[key][0];

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
                  {...FLOATING_MENU_PROPS}
                  options={approverOptions}
                  value={approverOptions.find(opt => opt.value === chainsInUse[key][idx]) ?? null}
                  onChange={selected => handleLevelChange(key, idx, selected?.value ?? '')}
                  placeholder={idx === 0 ? 'Select approver' : 'N/A'}
                  isClearable
                  isSearchable
                  components={{ Option: ColourOption, SingleValue, DropdownIndicator }}
                  classNamePrefix="react-select"
                  className="react-select-styled"
                />
                {idx === 0 && isMissing && showErrors && (
                  // `data-required-error` is what the wizard scrolls to when Continue is
                  // blocked here — this section's requirement is structural, so there is
                  // no single invalid input for it to find instead.
                  <div className="text-danger fs-8 mt-1" data-required-error>
                    Level 1 approver is required
                  </div>
                )}
              </div>
            ))}

            {/* No per-row Save/Delete: these chains are part of the form and are written
                by the wizard's single save, like every other field on it. Level 1 is
                mandatory for all three, so a "Delete Chain" here could only ever produce
                a state that same save refuses. */}
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default ApprovalSettings;
