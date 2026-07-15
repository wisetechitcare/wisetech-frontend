import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, Switch, Chip, Skeleton, Tooltip,
  IconButton, TextField, InputAdornment, ToggleButtonGroup, ToggleButton,
  Drawer,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import SeedIcon from '@mui/icons-material/AutoFixHigh';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import {
  deductionMasterService,
  PayrollComponent,
  ComponentAuditEntry,
  ComponentVersion,
  DependencyMap,
} from '@modules/payroll/services/payrollService';
import { successConfirmation } from '@utils/modal';
import Swal from 'sweetalert2';

// ── Constants ──────────────────────────────────────────────────────────────────

const EARNING_CATEGORIES   = ['Earning', 'Allowance', 'Benefit'];
const DEDUCTION_CATEGORIES = ['Attendance Deduction', 'Government Deduction'];

const SALARY_BREAKDOWN_MAP: Record<string, string> = {
  'Earning':              'Work Earnings',
  'Allowance':            'Allowances & Benefits',
  'Benefit':              'Allowances & Benefits',
  'Attendance Deduction': 'Attendance Adjustments',
  'Government Deduction': 'Gov. & Payroll Deductions',
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Earning':              { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  'Allowance':            { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'Benefit':              { bg: '#ede9fe', color: '#4c1d95', border: '#c4b5fd' },
  'Attendance Deduction': { bg: '#fff7ed', color: '#92400e', border: '#fed7aa' },
  'Government Deduction': { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
};

const DIRECTION_COLORS: Record<string, { color: string; label: string }> = {
  DEBIT:  { color: '#dc2626', label: 'Debit (−)' },
  CREDIT: { color: '#16a34a', label: 'Credit (+)' },
};

const CALC_TYPE_LABELS: Record<string, string> = {
  FIXED:          'Fixed ₹',
  PERCENTAGE:     '% Based',
  HOURLY:         'Hourly',
  DAILY:          'Daily',
  WEEKLY:         'Weekly',
  MONTHLY:        'Monthly',
  YEARLY:         'Yearly',
  PER_ATTENDANCE: 'Per Attendance',
  ONE_TIME:       'One Time',
};

const APPLY_DURATION_LABELS: Record<string, { label: string; desc: string }> = {
  ALL_TIME:     { label: 'All Time',    desc: 'Applied every month, indefinitely' },
  ONE_MONTH:    { label: '1 Month',     desc: 'Applied once for a single month' },
  ONE_YEAR:     { label: '1 Year',      desc: 'Applied for one full financial year' },
  ONE_TIME:     { label: 'One-Time',    desc: 'Applied exactly once then stops' },
  CUSTOM_RANGE: { label: 'Custom Range', desc: 'Applied for a specific date range' },
};

const AUDIT_EVENT_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  CREATED:            { bg: '#d1fae5', color: '#065f46', icon: 'bi-plus-circle' },
  UPDATED:            { bg: '#dbeafe', color: '#1e40af', icon: 'bi-pencil' },
  VERSION_CREATED:    { bg: '#ede9fe', color: '#4c1d95', icon: 'bi-layers' },
  DELETED:            { bg: '#fee2e2', color: '#991b1b', icon: 'bi-trash' },
  RESTORED:           { bg: '#d1fae5', color: '#065f46', icon: 'bi-arrow-counterclockwise' },
  ACTIVATED:          { bg: '#d1fae5', color: '#065f46', icon: 'bi-toggle-on' },
  DEACTIVATED:        { bg: '#fef3c7', color: '#92400e', icon: 'bi-toggle-off' },
  ONBOARDING_TOGGLED: { bg: '#f0f9ff', color: '#0369a1', icon: 'bi-mortarboard' },
  SEEDED:             { bg: '#faf5ff', color: '#7e22ce', icon: 'bi-magic' },
  CLONED:             { bg: '#f0fdf4', color: '#15803d', icon: 'bi-copy' },
};

const KEY_ACCENT: Record<string, string> = {
  providentFund:    '#2563eb', professionalTax: '#7c3aed',
  professionalFees: '#d97706', tds2:            '#0891b2',
  basicSalary:      '#15803d', totalWorkingTime: '#0369a1',
  overTime:         '#d97706', lateCheckins:    '#dc2626',
  earlyCheckout:    '#dc2626', unpaidLeave:     '#dc2626',
  halfDay:          '#dc2626', missedPunch:     '#dc2626',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function slugify(str: string) {
  return str.trim().toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isBaseDate(iso?: string | null): boolean {
  if (!iso) return true;
  return new Date(iso).getFullYear() <= 1970;
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const date = new Date(val);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(2);
  return String(val);
}

function getReadableFieldName(field: string): string {
  const map: Record<string, string> = {
    displayName: 'Display Name',
    shortCode: 'Short Code',
    description: 'Description',
    category: 'Category',
    direction: 'Direction',
    calculationType: 'Calculation Type',
    applyDuration: 'Apply Duration',
    defaultAmount: 'Default Amount',
    defaultPercentage: 'Default Percentage (%)',
    isActive: 'Status',
    isSystem: 'System Component',
    enableInOnboarding: 'Enable in Onboarding',
    effectiveFrom: 'Effective From',
    effectiveTo: 'Effective To',
    sortOrder: 'Sort Order',
    createdBy: 'Created By',
    key: 'Component Key',
  };
  return map[field] || field.replace(/([A-Z])/g, ' $1').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatChangeDetails(oldVal: any, newVal: any): string {
  if (!oldVal || !newVal) return '';
  const skip = new Set(['updatedAt', 'createdAt', 'id', 'companyId', 'updatedBy']);
  const parts: string[] = [];
  for (const k of Object.keys(newVal)) {
    if (skip.has(k)) continue;
    const ov = oldVal[k];
    const nv = newVal[k];
    if (String(ov) !== String(nv)) {
      const fieldName = getReadableFieldName(k);
      const oldFormatted = formatValue(ov);
      const newFormatted = formatValue(nv);
      parts.push(`${fieldName}: ${oldFormatted} → ${newFormatted}`);
    }
  }
  return parts.join('; ') || 'No visible changes';
}

// ── Form State ─────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  key:              '',
  displayName:      '',
  shortCode:        '',
  description:      '',
  category:         'Allowance',
  direction:        'CREDIT',
  calculationType:  'FIXED',
  enableInOnboarding: false,
  applyDuration:    'ALL_TIME',
  defaultAmount:    '',
  defaultPercentage: '',
  sortOrder:        '0',
  dependsOnKey:     '',
  applyScope:       'all' as 'all' | 'from',
  applyFromMonth:   currentYearMonth(),
  applyToMonth:     currentYearMonth(),
};
type FormState = typeof INITIAL_FORM;

// ── Create / Edit Modal ────────────────────────────────────────────────────────

function ComponentFormModal({
  open, item, onClose, onSave, defaultCategory, allDeps, allItems,
}: {
  open: boolean;
  item: PayrollComponent | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  defaultCategory: string;
  allDeps: DependencyMap;
  allItems: PayrollComponent[];
}) {
  const isEdit = !!item;
  const [form, setForm]   = useState<FormState>({ ...INITIAL_FORM, category: defaultCategory });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const categoryOptions = [...EARNING_CATEGORIES, ...DEDUCTION_CATEGORIES];

  useEffect(() => {
    if (open) {
      setErr('');
      setForm(item ? {
        key:               item.key,
        displayName:       item.displayName,
        shortCode:         item.shortCode || '',
        description:       item.description || '',
        category:          item.category || defaultCategory,
        direction:         item.direction || 'CREDIT',
        calculationType:   item.calculationType || 'FIXED',
        enableInOnboarding: item.enableInOnboarding ?? false,
        applyDuration:     item.applyDuration || 'ALL_TIME',
        defaultAmount:     item.defaultAmount != null ? String(item.defaultAmount) : '',
        defaultPercentage: item.defaultPercentage != null ? String(item.defaultPercentage) : '',
        sortOrder:         String(item.sortOrder ?? 0),
        dependsOnKey:      allDeps[item.id]?.dependsOnKey || '',
        applyScope:        'all',
        applyFromMonth:    currentYearMonth(),
        applyToMonth:      currentYearMonth(),
      } : { ...INITIAL_FORM, category: defaultCategory });
    }
  }, [open, item, defaultCategory]);

  const isPercentBased = form.calculationType === 'PERCENTAGE';
  const isAmountBased  = ['FIXED', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'ONE_TIME'].includes(form.calculationType);

  const handleDisplayNameChange = (val: string) => {
    setForm(f => ({
      ...f,
      displayName: val,
      ...(!isEdit ? { key: slugify(val) } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) { setErr('Component name is required'); return; }
    if (!isEdit && !form.key.trim()) { setErr('Key is required'); return; }
    setSaving(true);
    try {
      let effectiveFrom: string | undefined;
      let effectiveTo:   string | undefined;

      // Set dates for both add and edit modes (ISO-8601 format)
      if (form.applyDuration === 'ALL_TIME') {
        if (isEdit && form.applyScope === 'from' && form.applyFromMonth) {
          effectiveFrom = new Date(`${form.applyFromMonth}-01`).toISOString();
        }
      } else if (form.applyDuration === 'ONE_MONTH') {
        // Apply only for the selected month
        if (form.applyFromMonth) {
          effectiveFrom = new Date(`${form.applyFromMonth}-01`).toISOString();
          // Set end date to last day of the month
          const [year, month] = form.applyFromMonth.split('-');
          const lastDay = new Date(Number(year), Number(month), 0).getDate();
          effectiveTo = new Date(`${form.applyFromMonth}-${lastDay}`).toISOString();
        }
      } else if (form.applyDuration === 'ONE_TIME') {
        if (form.applyFromMonth) effectiveFrom = new Date(`${form.applyFromMonth}-01`).toISOString();
      } else if (form.applyDuration === 'ONE_YEAR') {
        // Apply for 12 months from the selected month
        if (form.applyFromMonth) {
          effectiveFrom = new Date(`${form.applyFromMonth}-01`).toISOString();
          // Set end date to last day of month, 12 months later
          const [year, month] = form.applyFromMonth.split('-');
          const endYear = Number(year) + (Number(month) === 12 ? 1 : 0);
          const endMonth = Number(month) === 12 ? '01' : String(Number(month) + 1).padStart(2, '0');
          const lastDay = new Date(endYear, Number(endMonth), 0).getDate();
          effectiveTo = new Date(`${endYear}-${endMonth}-${lastDay}`).toISOString();
        }
      } else if (form.applyDuration === 'CUSTOM_RANGE') {
        if (form.applyFromMonth) effectiveFrom = new Date(`${form.applyFromMonth}-01`).toISOString();
        if (form.applyToMonth) {
          // Set end date to last day of the selected end month
          const [year, month] = form.applyToMonth.split('-');
          const lastDay = new Date(Number(year), Number(month), 0).getDate();
          effectiveTo = new Date(`${form.applyToMonth}-${lastDay}`).toISOString();
        }
      }

      await onSave({
        key:               form.key || slugify(form.displayName),
        displayName:       form.displayName,
        shortCode:         form.shortCode || undefined,
        description:       form.description || undefined,
        category:          form.category,
        direction:         form.direction,
        calculationType:   form.calculationType,
        enableInOnboarding: form.enableInOnboarding,
        applyDuration:     form.applyDuration,
        sortOrder:         Number(form.sortOrder) || 0,
        defaultAmount:     isAmountBased && form.defaultAmount !== '' ? Number(form.defaultAmount) : null,
        defaultPercentage: isPercentBased && form.defaultPercentage !== '' ? Number(form.defaultPercentage) : null,
        dependsOnKey:      isPercentBased ? form.dependsOnKey : '',
        ...(effectiveFrom ? { effectiveFrom } : {}),
        ...(effectiveTo   ? { effectiveTo }   : {}),
      });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const existingEffectiveFrom = item?.effectiveFrom;
  const existingEffectiveTo   = item?.effectiveTo;

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow-lg">
          <div className="modal-header border-0 pb-0 px-6 pt-5">
            <h5 className="modal-title fw-bold fs-5 text-gray-900">
              {isEdit ? 'Edit Component' : 'Add Component'}
            </h5>
            <button className="btn btn-icon btn-sm btn-light ms-auto" onClick={onClose}>
              <i className="bi bi-x fs-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body px-6 py-5">
              {err && <div className="alert alert-danger py-2 mb-4">{err}</div>}

              {/* Current effective date info banner for edit mode */}
              {isEdit && (
                <div className="alert py-2 mb-4 d-flex align-items-center gap-2"
                  style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
                  <i className="bi bi-info-circle text-primary" />
                  <span className="fs-8 text-gray-700">
                    Current effective: <strong>
                      {isBaseDate(existingEffectiveFrom) ? 'All time (base record)' : formatDate(existingEffectiveFrom)}
                    </strong>
                    {existingEffectiveTo && (
                      <> → expires <strong>{formatDate(existingEffectiveTo)}</strong></>
                    )}
                  </span>
                </div>
              )}

              <div className="row g-4">
                {/* Name + Short Code */}
                <div className="col-md-7">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">
                    Component Name <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control form-control-sm"
                    value={form.displayName}
                    onChange={e => handleDisplayNameChange(e.target.value)}
                    placeholder="e.g. Internet Allowance"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Short Code</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.shortCode}
                    onChange={e => setForm(f => ({ ...f, shortCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. INT"
                    maxLength={10}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">
                    <Tooltip title="Display order in lists (lower = shown first)" placement="top">
                      <span style={{ cursor: 'help', borderBottom: '1px dashed #94a3b8' }}>Order</span>
                    </Tooltip>
                  </label>
                  <input
                    className="form-control form-control-sm"
                    type="number" min="0" step="1"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                {/* Internal Key — create only */}
                {!isEdit && (
                  <div className="col-12">
                    <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">
                      Internal Key <span className="text-muted fs-8">(auto-generated, fixed after save)</span>
                    </label>
                    <input
                      className="form-control form-control-sm font-monospace text-muted"
                      value={form.key}
                      onChange={e => setForm(f => ({ ...f, key: slugify(e.target.value) }))}
                      placeholder="auto_generated_key"
                    />
                  </div>
                )}

                {/* Category + Direction + Calc Type */}
                <div className="col-md-5">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Category</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {categoryOptions.map(c => <option key={c}>{c}</option>)}
                  </select>
                  {SALARY_BREAKDOWN_MAP[form.category] && (
                    <div className="text-muted fs-8 mt-1">
                      Shows in: <strong>{SALARY_BREAKDOWN_MAP[form.category]}</strong>
                    </div>
                  )}
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Direction</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.direction}
                    onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                  >
                    <option value="CREDIT">Credit (+)</option>
                    <option value="DEBIT">Debit (−)</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Calculation Type</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.calculationType}
                    onChange={e => setForm(f => ({ ...f, calculationType: e.target.value }))}
                  >
                    <option value="FIXED">Fixed Amount (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="HOURLY">Hourly Rate</option>
                    <option value="DAILY">Daily Rate</option>
                    <option value="WEEKLY">Weekly Rate</option>
                    <option value="MONTHLY">Monthly Rate</option>
                    <option value="YEARLY">Yearly Rate</option>
                    <option value="PER_ATTENDANCE">Per Attendance</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>

                {/* Default value fields */}
                {isAmountBased && (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Default Amount (₹)</label>
                    <input
                      className="form-control form-control-sm"
                      type="number" min="0" step="0.01"
                      value={form.defaultAmount}
                      onChange={e => setForm(f => ({ ...f, defaultAmount: e.target.value }))}
                      placeholder="e.g. 500"
                    />
                  </div>
                )}
                {isPercentBased && (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Default Percentage (%)</label>
                    <input
                      className="form-control form-control-sm"
                      type="number" min="0" max="100" step="0.01"
                      value={form.defaultPercentage}
                      onChange={e => setForm(f => ({ ...f, defaultPercentage: e.target.value }))}
                      placeholder="e.g. 12"
                    />
                  </div>
                )}

                {/* Dependency picker — only for PERCENTAGE type */}
                {isPercentBased && (
                  <div className="col-12">
                    <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">
                      Percentage Of
                      <span className="text-muted fs-8 ms-1">(optional — links this component's value to another)</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={form.dependsOnKey}
                      onChange={e => setForm(f => ({ ...f, dependsOnKey: e.target.value }))}
                    >
                      <option value="">— None (standalone percentage) —</option>
                      {allItems
                        .filter(c => c.id !== item?.id && c.isActive)
                        .sort((a, b) => a.displayName.localeCompare(b.displayName))
                        .map(c => (
                          <option key={c.id} value={c.key}>{c.displayName}</option>
                        ))
                      }
                    </select>
                    {form.dependsOnKey && form.defaultPercentage && (
                      <div className="mt-2 px-2 py-1 rounded-2 fs-8 fw-semibold"
                        style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', fontFamily: 'monospace' }}>
                        <i className="bi bi-calculator me-1" />
                        {form.displayName || '(component)'} = {form.defaultPercentage}% of {allItems.find(c => c.key === form.dependsOnKey)?.displayName || form.dependsOnKey}
                      </div>
                    )}
                  </div>
                )}

                {/* Apply Duration */}
                <div className={isAmountBased || isPercentBased ? 'col-md-6' : 'col-md-8'}>
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Apply Duration</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.applyDuration}
                    onChange={e => setForm(f => ({ ...f, applyDuration: e.target.value }))}
                  >
                    <option value="ALL_TIME">All Time — Every month, indefinitely</option>
                    <option value="ONE_MONTH">1 Month — Applied once for a single month</option>
                    <option value="ONE_YEAR">1 Year — Applied for one full financial year</option>
                    <option value="ONE_TIME">One-Time — Applied exactly once then stops</option>
                    <option value="CUSTOM_RANGE">Custom Range — Applied for a specific date range</option>
                  </select>
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of this component"
                  />
                </div>

                {/* Onboarding toggle */}
                <div className="col-12">
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3"
                    style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}>
                    <div className="flex-grow-1">
                      <div className="fw-semibold text-gray-800 fs-7">Show in Employee Onboarding</div>
                      <div className="text-muted fs-8">
                        Admin can configure this per employee during onboarding / employee edit.
                      </div>
                    </div>
                    <div className="form-check form-switch form-check-custom form-check-solid">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        style={{ width: '3rem', height: '1.5rem', cursor: 'pointer' }}
                        checked={form.enableInOnboarding}
                        onChange={e => setForm(f => ({ ...f, enableInOnboarding: e.target.checked }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Effective date scope */}
                {form.applyDuration !== 'ALL_TIME' && (
                  <div className="col-12">
                    <div className="p-3 rounded-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <div className="fw-semibold text-gray-800 fs-7 mb-2">
                        <i className="bi bi-calendar-range me-1" />
                        {isEdit ? 'When should this change take effect?' : 'When should this apply?'}
                      </div>

                      {form.applyDuration === 'ALL_TIME' && (
                        <div className="d-flex flex-column gap-2">
                          <label className="d-flex align-items-center gap-2 cursor-pointer">
                            <input type="radio" name="applyScope" value="all"
                              checked={form.applyScope === 'all'}
                              onChange={() => setForm(f => ({ ...f, applyScope: 'all' }))}
                            />
                            <span className="fs-7 text-gray-700">All months (updates base record — history included)</span>
                          </label>
                          <label className="d-flex align-items-start gap-2 cursor-pointer">
                            <input type="radio" name="applyScope" value="from"
                              checked={form.applyScope === 'from'}
                              onChange={() => setForm(f => ({ ...f, applyScope: 'from' }))}
                              style={{ marginTop: 3 }}
                            />
                            <div>
                              <div className="fs-7 text-gray-700 mb-1">
                                Apply from a specific month onwards (creates new version; old months unchanged)
                              </div>
                              {form.applyScope === 'from' && (
                                <input type="month" className="form-control form-control-sm"
                                  style={{ maxWidth: 200 }}
                                  value={form.applyFromMonth}
                                  onChange={e => setForm(f => ({ ...f, applyFromMonth: e.target.value }))}
                                />
                              )}
                            </div>
                          </label>
                        </div>
                      )}

                      {(form.applyDuration === 'ONE_MONTH' || form.applyDuration === 'ONE_TIME') && (
                        <div>
                          <div className="fs-7 text-gray-700 mb-2">
                            {form.applyDuration === 'ONE_MONTH' ? 'Which month should this apply to?' : 'Which month should this be applied in?'}
                          </div>
                          <input type="month" className="form-control form-control-sm"
                            style={{ maxWidth: 200 }}
                            value={form.applyFromMonth}
                            onChange={e => setForm(f => ({ ...f, applyFromMonth: e.target.value }))}
                          />
                        </div>
                      )}

                      {form.applyDuration === 'ONE_YEAR' && (
                        <div>
                          <div className="fs-7 text-gray-700 mb-2">
                            Starting from which month? <span className="text-muted">(applies for 12 months)</span>
                          </div>
                          <input type="month" className="form-control form-control-sm"
                            style={{ maxWidth: 200 }}
                            value={form.applyFromMonth}
                            onChange={e => setForm(f => ({ ...f, applyFromMonth: e.target.value }))}
                          />
                        </div>
                      )}

                      {form.applyDuration === 'CUSTOM_RANGE' && (
                        <div className="d-flex align-items-end gap-3 flex-wrap">
                          <div>
                            <div className="fs-7 text-gray-700 mb-1">Start month</div>
                            <input type="month" className="form-control form-control-sm"
                              style={{ maxWidth: 200 }}
                              value={form.applyFromMonth}
                              onChange={e => setForm(f => ({ ...f, applyFromMonth: e.target.value }))}
                            />
                          </div>
                          <div className="fs-6 text-muted pb-1">→</div>
                          <div>
                            <div className="fs-7 text-gray-700 mb-1">End month</div>
                            <input type="month" className="form-control form-control-sm"
                              style={{ maxWidth: 200 }}
                              min={form.applyFromMonth}
                              value={form.applyToMonth}
                              onChange={e => setForm(f => ({ ...f, applyToMonth: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-0 px-6 pb-5 gap-2">
              <button type="button" className="btn btn-sm btn-secondary rounded-3" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm rounded-3 text-white"
                style={{ background: '#1E3A8A' }}
                disabled={saving}
              >
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Component'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Clone Modal ────────────────────────────────────────────────────────────────

function CloneModal({
  open, item, onClose, onClone,
}: {
  open: boolean;
  item: PayrollComponent | null;
  onClose: () => void;
  onClone: (newKey: string, newDisplayName: string) => Promise<void>;
}) {
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newKey, setNewKey]                 = useState('');
  const [saving, setSaving]                 = useState(false);
  const [err, setErr]                       = useState('');

  useEffect(() => {
    if (open && item) {
      const name = `${item.displayName} (Copy)`;
      setNewDisplayName(name);
      setNewKey(slugify(name));
      setErr('');
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newDisplayName.trim()) { setErr('Both fields are required'); return; }
    setSaving(true);
    try {
      await onClone(newKey.trim(), newDisplayName.trim());
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to clone');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1070 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
        <div className="modal-content border-0 rounded-4 shadow-lg">
          <div className="modal-header border-0 pb-0 px-5 pt-5">
            <h5 className="modal-title fw-bold fs-6 text-gray-900 d-flex align-items-center gap-2">
              <ContentCopyIcon fontSize="small" sx={{ color: '#1E3A8A' }} />
              Clone Component
            </h5>
            <button className="btn btn-icon btn-sm btn-light ms-auto" onClick={onClose}>
              <i className="bi bi-x fs-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body px-5 py-4">
              {err && <div className="alert alert-danger py-2 mb-3">{err}</div>}
              <div className="text-muted fs-8 mb-3">
                Cloning <strong>{item?.displayName}</strong>. Provide a new name and key for the copy.
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">
                  New Component Name <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control form-control-sm"
                  value={newDisplayName}
                  onChange={e => { setNewDisplayName(e.target.value); setNewKey(slugify(e.target.value)); }}
                  placeholder="e.g. Special Allowance"
                />
              </div>
              <div>
                <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Internal Key</label>
                <input
                  className="form-control form-control-sm font-monospace text-muted"
                  value={newKey}
                  onChange={e => setNewKey(slugify(e.target.value))}
                />
              </div>
            </div>
            <div className="modal-footer border-0 px-5 pb-4 gap-2">
              <button type="button" className="btn btn-sm btn-secondary rounded-3" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-sm rounded-3 text-white" style={{ background: '#1E3A8A' }} disabled={saving}>
                {saving ? 'Cloning…' : 'Clone'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Audit + Version Drawer ─────────────────────────────────────────────────────

function HistoryDrawer({
  open, item, onClose,
}: {
  open: boolean;
  item: PayrollComponent | null;
  onClose: () => void;
}) {
  const [tab, setTab]         = useState<'audit' | 'versions'>('audit');
  const [audits, setAudits]   = useState<ComponentAuditEntry[]>([]);
  const [versions, setVersions] = useState<ComponentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    Promise.all([
      deductionMasterService.getAudit(item.id),
      deductionMasterService.getVersions(item.id),
    ]).then(([a, v]) => { setAudits(a); setVersions(v); })
      .finally(() => setLoading(false));
  }, [open, item]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{
          px: 3, py: 2.5, background: 'linear-gradient(135deg, #EEF3FC 0%, #fff8f8 100%)',
          borderBottom: '1px solid rgba(30, 58, 138,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#181C32' }}>
              Component History
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
              {item?.displayName}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}
            sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
            <i className="bi bi-x" style={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ display: 'flex', borderBottom: '2px solid #f3f4f6', px: 2 }}>
          {(['audit', 'versions'] as const).map(t => (
            <Box key={t} component="button" onClick={() => setTab(t)} sx={{
              border: 'none', background: 'none', cursor: 'pointer', p: 0,
              px: 2, py: 1.5,
              borderBottom: tab === t ? '2px solid #1E3A8A' : '2px solid transparent',
              mb: '-2px',
              fontSize: 13, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#1E3A8A' : '#6b7280',
              transition: 'all 0.15s',
            }}>
              {t === 'audit' ? 'Audit Log' : 'Versions'}
            </Box>
          ))}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {loading ? (
            <Stack gap={1.5} pt={1}>
              {[1, 2, 3, 4].map(i => <Skeleton key={i} height={60} sx={{ borderRadius: 2 }} />)}
            </Stack>
          ) : tab === 'audit' ? (
            audits.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <i className="bi bi-clock-history" style={{ fontSize: 32, color: '#d1d5db' }} />
                <Typography sx={{ color: '#9ca3af', fontSize: 13, mt: 1 }}>No audit events yet</Typography>
              </Box>
            ) : (
              <Stack gap={1.5}>
                {audits.map(a => {
                  const ec = AUDIT_EVENT_COLORS[a.eventType] ?? { bg: '#f1f5f9', color: '#475569', icon: 'bi-circle' };
                  return (
                    <Paper key={a.id} elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: 2, p: 2 }}>
                      <Stack direction="row" gap={1.5} alignItems="flex-start">
                        <Box sx={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          bgcolor: ec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className={ec.icon} style={{ fontSize: 14, color: ec.color }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                            <Chip label={a.eventType.replace(/_/g, ' ')} size="small"
                              sx={{ fontSize: 10, height: 18, bgcolor: ec.bg, color: ec.color, fontWeight: 700 }} />
                            <Typography sx={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                              {formatDateTime(a.changedAt)}
                            </Typography>
                          </Stack>
                          {a.changeSummary ? (
                            <Typography sx={{ fontSize: 11.5, color: '#374151', mt: 0.75, lineHeight: 1.5 }}>
                              {a.changeSummary}
                            </Typography>
                          ) : a.newValue ? (
                            <Typography sx={{ fontSize: 11.5, color: '#374151', mt: 0.75, lineHeight: 1.5 }}>
                              {formatChangeDetails(a.oldValue, a.newValue)}
                            </Typography>
                          ) : null}
                          {a.changedBy && (
                            <Typography sx={{ fontSize: 11, color: '#9ca3af', mt: 0.5 }}>
                              by {a.changedBy}
                            </Typography>
                          )}
                          {a.reason && (
                            <Typography sx={{ fontSize: 11, color: '#6b7280', mt: 0.5, fontStyle: 'italic' }}>
                              Reason: {a.reason}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )
          ) : (
            versions.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <i className="bi bi-layers" style={{ fontSize: 32, color: '#d1d5db' }} />
                <Typography sx={{ color: '#9ca3af', fontSize: 13, mt: 1 }}>No versions recorded yet</Typography>
              </Box>
            ) : (
              <Stack gap={1.5}>
                {versions.map((v, idx) => (
                  <Paper key={v.id} elevation={0} sx={{
                    border: '1px solid #f0f0f0', borderLeft: idx === 0 ? '3px solid #1E3A8A' : '3px solid #e5e7eb',
                    borderRadius: 2, p: 2,
                  }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Chip label={`v${v.versionNumber}`} size="small"
                          sx={{
                            fontSize: 11, height: 20, fontWeight: 700,
                            bgcolor: idx === 0 ? '#1E3A8A' : '#f1f5f9',
                            color: idx === 0 ? '#fff' : '#475569',
                          }} />
                        {idx === 0 && (
                          <Chip label="Current" size="small"
                            sx={{ fontSize: 10, height: 18, bgcolor: '#d1fae5', color: '#065f46' }} />
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>
                        {formatDateTime(v.createdAt)}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: '#374151' }}>
                      Effective: <strong>
                        {isBaseDate(v.effectiveFrom) ? 'All time' : formatDate(v.effectiveFrom)}
                      </strong>
                      {v.effectiveTo && <> → <strong>{formatDate(v.effectiveTo)}</strong></>}
                    </Typography>
                    {v.createdBy && (
                      <Typography sx={{ fontSize: 11, color: '#9ca3af', mt: 0.5 }}>
                        by {v.createdBy}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            )
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

// ── Component Card ─────────────────────────────────────────────────────────────

function ComponentCard({
  item, onToggle, onEdit, onDelete, onToggleOnboarding, onRestore, onClone, onHistory, formulaLabel,
}: {
  item: PayrollComponent;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleOnboarding: () => void;
  onRestore: () => void;
  onClone: () => void;
  onHistory: () => void;
  formulaLabel?: string | null;
}) {
  const accent    = KEY_ACCENT[item.key] || '#1E3A8A';
  const catStyle  = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Custom'];
  const dirInfo   = DIRECTION_COLORS[item.direction] || DIRECTION_COLORS['DEBIT'];
  const calcLabel = CALC_TYPE_LABELS[item.calculationType] || item.calculationType;
  const durLabel  = APPLY_DURATION_LABELS[item.applyDuration]?.label || item.applyDuration;

  const defaultLabel = item.defaultAmount != null
    ? `₹${Number(item.defaultAmount).toLocaleString('en-IN')}`
    : item.defaultPercentage != null
      ? `${item.defaultPercentage}%`
      : null;

  const effectiveDate = item.effectiveFrom ? new Date(item.effectiveFrom) : null;
  const isVersioned   = effectiveDate && effectiveDate.getFullYear() > 1970;
  const effectiveLabel = isVersioned
    ? `From ${effectiveDate!.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : null;

  const expireDate = item.effectiveTo ? new Date(item.effectiveTo) : null;
  const expireLabel = expireDate
    ? `Expires ${expireDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : null;

  return (
    <Paper elevation={0} sx={{
      border: '1px solid #f0f0f0', borderRadius: 3, overflow: 'hidden',
      opacity: item.isActive ? 1 : 0.55,
      transition: 'all 0.2s',
      '&:hover': { borderColor: '#e0e0e0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        <Box sx={{ width: 4, flexShrink: 0, background: item.isActive ? accent : '#d1d5db' }} />

        {/* Short code pill */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: { xs: 1, sm: 2 }, py: 1.5, flexShrink: 0, minWidth: { xs: 50, sm: 72 } }}>
          <Box sx={{
            background: `${accent}15`, border: `1px solid ${accent}30`,
            borderRadius: 1.5, px: { xs: 1, sm: 1.5 }, py: 0.5,
            fontFamily: 'monospace', fontWeight: 700, fontSize: { xs: 10, sm: 11 },
            color: accent, letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {item.shortCode || item.key.slice(0, 4).toUpperCase()}
          </Box>
        </Box>

        {/* Main info */}
        <Box sx={{ flex: 1, py: 1.25, pr: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: { xs: 13, sm: 13.5 }, color: '#111827', lineHeight: 1.3, mb: 0.4 }}>
            {item.displayName}
            {!item.isActive && (
              <Chip label="Inactive" size="small"
                sx={{ ml: 1, fontSize: 10, height: 16, bgcolor: '#fee2e2', color: '#991b1b' }} />
            )}
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap" mb={item.description ? 0.3 : 0}>
            {item.isSystem && (
              <Chip label="System" size="small"
                sx={{ fontSize: 10, height: 17, bgcolor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }} />
            )}
            <Chip label={item.category} size="small"
              sx={{ fontSize: 10, height: 17, bgcolor: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }} />
            <Chip label={dirInfo.label} size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontSize: 10, height: 17, bgcolor: `${dirInfo.color}10`, color: dirInfo.color, border: `1px solid ${dirInfo.color}30` }} />
            <Chip label={calcLabel} size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontSize: 10, height: 17, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }} />
            <Chip label={durLabel} size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontSize: 10, height: 17, bgcolor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }} />
            {defaultLabel && (
              <Chip label={`Default: ${defaultLabel}`} size="small"
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontSize: 10, height: 17, bgcolor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }} />
            )}
            {effectiveLabel && (
              <Chip label={effectiveLabel} size="small"
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontSize: 10, height: 17, bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', fontWeight: 700 }} />
            )}
            {expireLabel && (
              <Chip label={expireLabel} size="small"
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontSize: 10, height: 17, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }} />
            )}
            {formulaLabel && (
              <Chip
                icon={<i className="bi bi-calculator" style={{ fontSize: 9, color: '#0369a1', marginLeft: 4 }} />}
                label={formulaLabel} size="small"
                sx={{ fontSize: 10, height: 17, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 600 }} />
            )}
          </Stack>
          {item.description && (
            <Typography sx={{
              fontSize: 11.5, color: '#6b7280', mt: 0.2, lineHeight: 1.4,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: { xs: 1, sm: 2 }, WebkitBoxOrient: 'vertical' as any,
            }}>
              {item.description}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Stack direction="row" alignItems="center" gap={{ xs: 0, sm: 0.25 }} sx={{ pr: { xs: 0.5, sm: 1.5 }, flexShrink: 0 }}>
          {/* History */}
          <Tooltip title="Audit & version history">
            <IconButton size="small" onClick={onHistory}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: '#6b7280', '&:hover': { color: '#7c3aed', bgcolor: '#faf5ff' } }}>
              <HistoryIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          {/* Onboarding toggle */}
          <Tooltip title={item.enableInOnboarding ? 'Remove from Onboarding' : 'Add to Onboarding'}>
            <IconButton size="small" onClick={onToggleOnboarding}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                color: item.enableInOnboarding ? '#059669' : '#d1d5db',
                bgcolor: item.enableInOnboarding ? '#ecfdf5' : 'transparent',
                border: item.enableInOnboarding ? '1px solid #6ee7b7' : '1px solid #e5e7eb',
                borderRadius: 1.5,
                '&:hover': { bgcolor: '#ecfdf5', color: '#059669', borderColor: '#6ee7b7' },
              }}>
              <SchoolOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>

          {/* Active toggle */}
          <Tooltip title={item.isActive ? 'Deactivate' : 'Activate'}>
            <Switch checked={item.isActive} onChange={onToggle} size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#1E3A8A' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#1E3A8A' },
              }} />
          </Tooltip>

          {/* Clone */}
          {!item.isSystem && (
            <Tooltip title="Clone component">
              <IconButton size="small" onClick={onClone}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: '#6b7280', '&:hover': { color: '#0369a1', bgcolor: '#f0f9ff' } }}>
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Edit */}
          <Tooltip title="Edit">
            <IconButton size="small" onClick={onEdit}
              sx={{ color: '#6b7280', '&:hover': { color: '#1a1a1a', bgcolor: '#f9fafb' } }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Delete — permanent deletion for all active components */}
          {item.isActive && (
            <Tooltip title="Delete permanently">
              <IconButton size="small" onClick={onDelete}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}

// ── Shared Component Panel ─────────────────────────────────────────────────────

interface ComponentPanelProps {
  mode: 'earnings' | 'deductions';
  allItems: PayrollComponent[];
  loading: boolean;
  onItemsChange: (items: PayrollComponent[]) => void;
  allDeps: DependencyMap;
  onDepsChange: (deps: DependencyMap) => void;
}

function ComponentPanel({ mode, allItems, loading, onItemsChange, allDeps, onDepsChange }: ComponentPanelProps) {
  const modeCategories  = mode === 'earnings' ? EARNING_CATEGORIES : DEDUCTION_CATEGORIES;
  const defaultCategory = mode === 'earnings' ? 'Allowance' : 'Custom';

  const FILTER_TABS = ['All', ...modeCategories];
  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editItem, setEditItem]         = useState<PayrollComponent | null>(null);
  const [cloneOpen, setCloneOpen]       = useState(false);
  const [cloneItem, setCloneItem]       = useState<PayrollComponent | null>(null);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [historyItem, setHistoryItem]   = useState<PayrollComponent | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const items = allItems.filter(i => modeCategories.includes(i.category));

  const handleToggle = async (item: PayrollComponent) => {
    try {
      const updated = await deductionMasterService.update(item.id, { isActive: !item.isActive });
      onItemsChange(allItems.map(i => i.id === item.id ? { ...i, ...updated } : i));
    } catch { /* silent */ }
  };

  const handleToggleOnboarding = async (item: PayrollComponent) => {
    try {
      const updated = await deductionMasterService.update(item.id, { enableInOnboarding: !item.enableInOnboarding });
      onItemsChange(allItems.map(i => i.id === item.id ? { ...i, ...updated } : i));
    } catch { /* silent */ }
  };

  const handleDelete = async (item: PayrollComponent) => {
    // All components are now permanently deleted (hard delete)
    const { isConfirmed, value: reason } = await Swal.fire({
      title: `Permanently delete "${item.displayName}"?`,
      text: 'This permanently removes the component and its history. Salary records already calculated are unaffected. This cannot be undone.',
      input: 'text', inputPlaceholder: 'Reason (optional)',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Delete permanently', cancelButtonText: 'Cancel',
    });
    if (!isConfirmed) return;
    try {
      await deductionMasterService.delete(item.id, reason || undefined);
      // Backend removes every row for this key (all versions) → drop them all locally.
      onItemsChange(allItems.filter(i => i.key !== item.key));
      successConfirmation('Component deleted');
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.message || 'Cannot delete', 'error');
    }
  };

  const handleRestore = async (item: PayrollComponent) => {
    try {
      const updated = await deductionMasterService.restore(item.id);
      onItemsChange(allItems.map(i => i.id === item.id ? { ...i, ...updated } : i));
      successConfirmation('Component restored');
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.message || 'Cannot restore', 'error');
    }
  };

  const handleSave = async (data: any) => {
    const { dependsOnKey, ...componentData } = data;
    const calcType: string = componentData.calculationType;

    if (editItem) {
      const updated = await deductionMasterService.update(editItem.id, componentData);
      onItemsChange(allItems.map(i => i.id === editItem.id ? { ...i, ...updated } : i));

      const newDeps = { ...allDeps };
      if (calcType === 'PERCENTAGE' && dependsOnKey) {
        const dep = await deductionMasterService.setDependency(editItem.id, dependsOnKey);
        newDeps[editItem.id] = dep;
      } else if (newDeps[editItem.id]) {
        await deductionMasterService.removeDependency(editItem.id);
        delete newDeps[editItem.id];
      }
      onDepsChange(newDeps);
      successConfirmation('Component updated');
    } else {
      const created = await deductionMasterService.create(componentData);
      onItemsChange([...allItems, created]);

      const newDeps = { ...allDeps };
      if (calcType === 'PERCENTAGE' && dependsOnKey) {
        const dep = await deductionMasterService.setDependency(created.id, dependsOnKey);
        newDeps[created.id] = dep;
        onDepsChange(newDeps);
      }
      successConfirmation('Component created');
    }
    setEditItem(null);
  };

  const handleClone = async (newKey: string, newDisplayName: string) => {
    if (!cloneItem) return;
    const created = await deductionMasterService.clone(cloneItem.id, newKey, newDisplayName);
    onItemsChange([...allItems, created]);
    successConfirmation('Component cloned');
    setCloneItem(null);
  };

  const filtered = items.filter(item => {
    if (!showInactive && !item.isActive) return false;
    const matchSearch = !search
      || item.displayName.toLowerCase().includes(search.toLowerCase())
      || item.key.toLowerCase().includes(search.toLowerCase())
      || (item.shortCode || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const grouped = modeCategories.reduce<Record<string, PayrollComponent[]>>((acc, cat) => {
    const group = filtered.filter(i => i.category === cat);
    if (group.length > 0) acc[cat] = group;
    return acc;
  }, {});

  const showGrouped  = categoryFilter === 'All';
  const addBtnColor  = '#1E3A8A';
  const inactiveCount = items.filter(i => !i.isActive).length;

  return (
    <>
      {/* Toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }} flexWrap="wrap">
        <Box sx={{ flex: 1, maxWidth: { xs: '100%', sm: 280 } }}>
          <TextField size="small" placeholder="Search components…"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#9ca3af' }} /></InputAdornment> }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
            fullWidth />
        </Box>

        <Box>
          <ToggleButtonGroup value={categoryFilter} exclusive
            onChange={(_, v) => { if (v !== null) setCategoryFilter(v); }}
            size="small"
            sx={{
              flexWrap: 'wrap', gap: 0,
              '& .MuiToggleButton-root': {
                fontSize: 11, px: 1.5, py: 0.5,
                border: '1px solid #e5e7eb', borderRadius: '8px !important',
                mx: 0.25, my: 0.25, textTransform: 'none', fontWeight: 500,
              },
              '& .MuiToggleButton-root.Mui-selected': { bgcolor: addBtnColor, color: '#fff', borderColor: addBtnColor },
            }}>
            {FILTER_TABS.map(c => <ToggleButton key={c} value={c}>{c}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>

        <Stack direction="row" gap={1} sx={{ ml: { sm: 'auto' }, flexShrink: 0 }}>
          {inactiveCount > 0 && (
            <Tooltip title={showInactive ? 'Hide inactive' : `Show ${inactiveCount} inactive`}>
              <button
                className="btn btn-sm rounded-3 d-flex align-items-center gap-1"
                style={{
                  fontSize: 12, whiteSpace: 'nowrap',
                  background: showInactive ? '#fee2e2' : '#f8fafc',
                  border: `1px solid ${showInactive ? '#fca5a5' : '#e2e8f0'}`,
                  color: showInactive ? '#991b1b' : '#64748b',
                }}
                onClick={() => setShowInactive(v => !v)}
              >
                <i className={`bi bi-eye${showInactive ? '-slash' : ''}`} />
                {inactiveCount} inactive
              </button>
            </Tooltip>
          )}
          <button
            className="btn btn-sm rounded-3 d-flex align-items-center justify-content-center gap-1 text-white"
            style={{ background: addBtnColor, fontSize: 13, whiteSpace: 'nowrap' }}
            onClick={() => { setEditItem(null); setModalOpen(true); }}
          >
            <i className="bi bi-plus-circle" /> Add Component
          </button>
        </Stack>
      </Stack>

      {/* Component list */}
      {loading ? (
        <Stack gap={1.5}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={64} sx={{ borderRadius: 2 }} />)}
        </Stack>
      ) : filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <i className="bi bi-grid-3x3-gap" style={{ fontSize: 36, color: '#d1d5db' }} />
          <Typography sx={{ color: '#9ca3af', fontSize: 14, mt: 1 }}>No components found</Typography>
          <Typography sx={{ color: '#d1d5db', fontSize: 12, mt: 0.5 }}>
            {items.length === 0
              ? 'Click "Seed Defaults" above to populate system components'
              : 'Try a different search or filter'}
          </Typography>
        </Box>
      ) : showGrouped ? (
        <Stack gap={3}>
          {Object.entries(grouped).map(([cat, group]) => {
            const catStyle  = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Custom'];
            const breakdown = SALARY_BREAKDOWN_MAP[cat];
            return (
              <Box key={cat}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                  <Box sx={{ width: 3, height: 14, borderRadius: 1, background: catStyle.color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 700, color: catStyle.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {cat}
                  </Typography>
                  <Chip label={group.length} size="small"
                    sx={{ fontSize: 10, height: 16, bgcolor: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }} />
                  {breakdown && (
                    <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 11, color: '#9ca3af', ml: 0.5 }}>
                      → {breakdown}
                    </Typography>
                  )}
                </Box>
                <Stack gap={1}>
                  {group.map(item => {
                    const dep = allDeps[item.id];
                    const formulaLabel = dep && item.calculationType === 'PERCENTAGE' && item.defaultPercentage != null
                      ? `${item.defaultPercentage}% of ${allItems.find(c => c.key === dep.dependsOnKey)?.displayName || dep.dependsOnKey}`
                      : null;
                    return (
                      <ComponentCard key={item.id} item={item}
                        onToggle={() => handleToggle(item)}
                        onEdit={() => { setEditItem(item); setModalOpen(true); }}
                        onDelete={() => handleDelete(item)}
                        onToggleOnboarding={() => handleToggleOnboarding(item)}
                        onRestore={() => handleRestore(item)}
                        onClone={() => { setCloneItem(item); setCloneOpen(true); }}
                        onHistory={() => { setHistoryItem(item); setHistoryOpen(true); }}
                        formulaLabel={formulaLabel}
                      />
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack gap={1}>
          {filtered.map(item => {
            const dep = allDeps[item.id];
            const formulaLabel = dep && item.calculationType === 'PERCENTAGE' && item.defaultPercentage != null
              ? `${item.defaultPercentage}% of ${allItems.find(c => c.key === dep.dependsOnKey)?.displayName || dep.dependsOnKey}`
              : null;
            return (
              <ComponentCard key={item.id} item={item}
                onToggle={() => handleToggle(item)}
                onEdit={() => { setEditItem(item); setModalOpen(true); }}
                onDelete={() => handleDelete(item)}
                onToggleOnboarding={() => handleToggleOnboarding(item)}
                onRestore={() => handleRestore(item)}
                onClone={() => { setCloneItem(item); setCloneOpen(true); }}
                onHistory={() => { setHistoryItem(item); setHistoryOpen(true); }}
                formulaLabel={formulaLabel}
              />
            );
          })}
        </Stack>
      )}

      <ComponentFormModal
        open={modalOpen}
        item={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={handleSave}
        defaultCategory={defaultCategory}
        allDeps={allDeps}
        allItems={allItems}
      />

      <CloneModal
        open={cloneOpen}
        item={cloneItem}
        onClose={() => { setCloneOpen(false); setCloneItem(null); }}
        onClone={handleClone}
      />

      <HistoryDrawer
        open={historyOpen}
        item={historyItem}
        onClose={() => { setHistoryOpen(false); setHistoryItem(null); }}
      />
    </>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────

export default function DeductionMaster() {
  const [allItems, setAllItems]   = useState<PayrollComponent[]>([]);
  const [allDeps, setAllDeps]     = useState<DependencyMap>({});
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'earnings' | 'deductions'>('earnings');
  const [seeding, setSeeding]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, deps] = await Promise.all([
        deductionMasterService.getAll(),
        deductionMasterService.getAllDependencies(),
      ]);
      setAllItems(data);
      setAllDeps(deps);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    const { isConfirmed } = await Swal.fire({
      title: 'Re-seed All Default Components?',
      text: 'This will restore all system components (Earnings, Allowances, Deductions) to their defaults. Your custom components are unaffected.',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#1E3A8A', confirmButtonText: 'Seed Defaults',
    });
    if (!isConfirmed) return;
    setSeeding(true);
    try {
      const seeded = await deductionMasterService.seed();
      setAllItems(seeded);
      successConfirmation('All default components seeded');
    } finally {
      setSeeding(false);
    }
  };

  const earningsCount   = allItems.filter(i => EARNING_CATEGORIES.includes(i.category)).length;
  const deductionsCount = allItems.filter(i => DEDUCTION_CATEGORIES.includes(i.category)).length;

  return (
    <Box>
      {/* Section header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '10px', padding: '14px 16px',
        background: 'linear-gradient(135deg, #EEF3FC 0%, #fff8f8 100%)',
        borderRadius: '12px', border: '1px solid rgba(30, 58, 138,0.1)', mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '9px',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #3B5BA9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(30, 58, 138,0.25)', flexShrink: 0,
          }}>
            <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: '14px', color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: 16, color: '#181C32', letterSpacing: '-0.2px', lineHeight: 1.2, m: 0 }}>
              Salary Master
            </Typography>
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#A1A5B7', fontWeight: 400, mt: '2px', m: 0 }}>
              Manage earnings, allowances &amp; deduction components
            </Typography>
          </Box>
        </Box>
        <button
          onClick={handleSeed} disabled={seeding}
          style={{
            backgroundColor: '#fff', border: '1px solid #E1E3EA', borderRadius: '9px',
            color: '#3F4254', padding: '7px 16px', fontFamily: 'Inter, sans-serif',
            fontWeight: 600, fontSize: 13, cursor: seeding ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 1px 4px rgba(24,28,50,0.06)', transition: 'all 0.15s ease',
            opacity: seeding ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!seeding) { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.color = '#1E3A8A'; e.currentTarget.style.backgroundColor = '#EEF3FC'; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#3F4254'; e.currentTarget.style.backgroundColor = '#fff'; }}
        >
          <SeedIcon style={{ fontSize: 15 }} />
          {seeding ? 'Seeding…' : 'Seed Defaults'}
        </button>
      </Box>

      {/* Sub-tabs */}
      <Box sx={{
        display: 'flex', gap: { xs: '4px', sm: '8px' }, mb: 3,
        background: { xs: '#f1f3f8', sm: 'transparent' },
        borderRadius: { xs: '10px', sm: '0' },
        borderBottom: { xs: 'none', sm: '2px solid #f3f4f6' },
        padding: { xs: '4px', sm: '0' },
      }}>
        {([
          { key: 'earnings',   label: 'Earnings & Allowances', shortLabel: 'Earnings',   count: earningsCount,   color: '#1E3A8A', desc: 'Work Earnings · Allowances · Benefits' },
          { key: 'deductions', label: 'Deductions',            shortLabel: 'Deductions', count: deductionsCount, color: '#1E3A8A', desc: 'Attendance · Government · Custom' },
        ] as const).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <Box key={tab.key} component="button" onClick={() => setActiveTab(tab.key)}
              sx={{ flex: { xs: 1, sm: 'none' }, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', p: 0 }}>
              <Box sx={{
                borderRadius: { xs: '7px', sm: '0' },
                background: { xs: isActive ? '#fff' : 'transparent', sm: 'transparent' },
                boxShadow: { xs: isActive ? '0 2px 8px rgba(24,28,50,0.10)' : 'none', sm: 'none' },
                borderBottom: { xs: 'none', sm: isActive ? `3px solid ${tab.color}` : '3px solid transparent' },
                mb: { xs: 0, sm: '-2px' },
                padding: { xs: '8px 10px', sm: '10px 16px 12px' },
              }}>
                <Stack direction="row" alignItems="center" gap={0.75} flexWrap="nowrap">
                  <Typography sx={{ fontSize: { xs: 12, sm: 13.5 }, fontWeight: isActive ? 700 : 500, color: isActive ? tab.color : '#6b7280', whiteSpace: 'nowrap' }}>
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{tab.label}</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{tab.shortLabel}</Box>
                  </Typography>
                  <Box sx={{
                    px: 0.75, py: 0.25, borderRadius: 1, flexShrink: 0,
                    bgcolor: isActive ? `${tab.color}15` : '#f3f4f6',
                    fontSize: 11, fontWeight: 700,
                    color: isActive ? tab.color : '#9ca3af',
                  }}>
                    {tab.count}
                  </Box>
                </Stack>
                <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 10.5, color: '#9ca3af', mt: 0.25 }}>
                  {tab.desc}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <ComponentPanel
        key={activeTab}
        mode={activeTab}
        allItems={allItems}
        loading={loading}
        onItemsChange={setAllItems}
        allDeps={allDeps}
        onDepsChange={setAllDeps}
      />
    </Box>
  );
}
