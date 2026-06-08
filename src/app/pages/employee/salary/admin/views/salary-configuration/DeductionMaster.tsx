import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, Switch, Chip, Skeleton, Tooltip,
  IconButton, TextField, InputAdornment, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import SeedIcon from '@mui/icons-material/AutoFixHigh';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { deductionMasterService, PayrollComponent } from '@modules/payroll/services/payrollService';
import { ConfigSectionCard } from '@app/modules/configuration';
import { successConfirmation } from '@utils/modal';
import Swal from 'sweetalert2';

// ── Constants ──────────────────────────────────────────────────────────────────

const EARNING_CATEGORIES    = ['Earning', 'Allowance', 'Benefit'];
const DEDUCTION_CATEGORIES  = ['Attendance Deduction', 'Government Deduction', 'Payroll Deduction', 'Custom'];

const SALARY_BREAKDOWN_MAP: Record<string, string> = {
  'Earning':              'Work Earnings',
  'Allowance':            'Allowances & Benefits',
  'Benefit':              'Allowances & Benefits',
  'Attendance Deduction': 'Attendance Adjustments',
  'Government Deduction': 'Gov. & Payroll Deductions',
  'Payroll Deduction':    'Gov. & Payroll Deductions',
  'Custom':               'Gov. & Payroll Deductions',
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Earning':              { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  'Allowance':            { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'Benefit':              { bg: '#ede9fe', color: '#4c1d95', border: '#c4b5fd' },
  'Attendance Deduction': { bg: '#fff7ed', color: '#92400e', border: '#fed7aa' },
  'Government Deduction': { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  'Payroll Deduction':    { bg: '#fce7f3', color: '#831843', border: '#fbcfe8' },
  'Custom':               { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
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
  PER_LEAVE:      'Per Leave',
  ONE_TIME:       'One Time',
};

const APPLY_DURATION_LABELS: Record<string, { label: string; desc: string }> = {
  ALL_TIME:  { label: 'All Time',  desc: 'Applied every month, indefinitely' },
  ONE_MONTH: { label: '1 Month',   desc: 'Applied once for a single month' },
  ONE_YEAR:  { label: '1 Year',    desc: 'Applied for one full financial year' },
  ONE_TIME:  { label: 'One-Time',  desc: 'Applied exactly once and then stops' },
};

const KEY_ACCENT: Record<string, string> = {
  providentFund:        '#2563eb',
  professionalTax:      '#7c3aed',
  professionalFees:     '#d97706',
  tds2:                 '#0891b2',
  basicSalary:          '#15803d',
  totalWorkingTime:     '#0369a1',
  overTime:             '#d97706',
  lateCheckins:         '#dc2626',
  earlyCheckout:        '#dc2626',
  unpaidLeave:          '#dc2626',
  halfDay:              '#dc2626',
  missedPunch:          '#dc2626',
};

// ── Form ───────────────────────────────────────────────────────────────────────

// Returns 'YYYY-MM' for the current month
const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const INITIAL_FORM = {
  key: '',
  displayName: '',
  shortCode: '',
  description: '',
  category: 'Allowance',
  direction: 'CREDIT',
  calculationType: 'FIXED',
  enableInOnboarding: false,
  applyDuration: 'ALL_TIME',
  defaultAmount: '',
  defaultPercentage: '',
  applyScope: 'all' as 'all' | 'from',
  applyFromMonth: currentYearMonth(),
};

type FormState = typeof INITIAL_FORM;

function slugify(str: string) {
  return str.trim().toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function ComponentFormModal({
  open, item, onClose, onSave, defaultCategory,
}: {
  open: boolean;
  item: PayrollComponent | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  defaultCategory: string;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, category: defaultCategory });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const categoryOptions = [...EARNING_CATEGORIES, ...DEDUCTION_CATEGORIES];

  useEffect(() => {
    if (open) {
      setErr('');
      setForm(item ? {
        key:              item.key,
        displayName:      item.displayName,
        shortCode:        item.shortCode || '',
        description:      item.description || '',
        category:         item.category || defaultCategory,
        direction:        item.direction || 'CREDIT',
        calculationType:  item.calculationType || 'FIXED',
        enableInOnboarding: item.enableInOnboarding ?? false,
        applyDuration:    item.applyDuration || 'ALL_TIME',
        defaultAmount:    item.defaultAmount != null ? String(item.defaultAmount) : '',
        defaultPercentage: item.defaultPercentage != null ? String(item.defaultPercentage) : '',
        applyScope:       'all',
        applyFromMonth:   currentYearMonth(),
      } : { ...INITIAL_FORM, category: defaultCategory });
    }
  }, [open, item, defaultCategory]);

  const isPercentBased = form.calculationType === 'PERCENTAGE';
  const isAmountBased  = ['FIXED','HOURLY','DAILY','WEEKLY','MONTHLY','YEARLY','ONE_TIME'].includes(form.calculationType);

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
      // Compute effectiveFrom: if "from a specific month", send the first day of that month
      let effectiveFrom: string | undefined;
      if (isEdit && form.applyScope === 'from' && form.applyFromMonth) {
        effectiveFrom = `${form.applyFromMonth}-01`;
      }
      await onSave({
        key:              form.key || slugify(form.displayName),
        displayName:      form.displayName,
        shortCode:        form.shortCode || undefined,
        description:      form.description || undefined,
        category:         form.category,
        direction:        form.direction,
        calculationType:  form.calculationType,
        enableInOnboarding: form.enableInOnboarding,
        applyDuration:    form.applyDuration,
        defaultAmount:    isAmountBased && form.defaultAmount !== '' ? Number(form.defaultAmount) : null,
        defaultPercentage: isPercentBased && form.defaultPercentage !== '' ? Number(form.defaultPercentage) : null,
        ...(effectiveFrom ? { effectiveFrom } : {}),
      });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

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
              <div className="row g-4">

                <div className="col-md-8">
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
                <div className="col-md-4">
                  <label className="form-label fw-semibold text-gray-700 fs-7 mb-1">Short Code</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.shortCode}
                    onChange={e => setForm(f => ({ ...f, shortCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. INT"
                    maxLength={10}
                  />
                </div>

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
                    <option value="PER_LEAVE">Per Leave Day</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>

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
                  </select>
                </div>

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

                <div className="col-12">
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}>
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

                {/* Apply scope — only shown when editing */}
                {isEdit && (
                  <div className="col-12">
                    <div className="p-3 rounded-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <div className="fw-semibold text-gray-800 fs-7 mb-2">When should this change take effect?</div>
                      <div className="d-flex flex-column gap-2">
                        <label className="d-flex align-items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="applyScope"
                            value="all"
                            checked={form.applyScope === 'all'}
                            onChange={() => setForm(f => ({ ...f, applyScope: 'all' }))}
                          />
                          <span className="fs-7 text-gray-700">All months (updates history too)</span>
                        </label>
                        <label className="d-flex align-items-start gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="applyScope"
                            value="from"
                            checked={form.applyScope === 'from'}
                            onChange={() => setForm(f => ({ ...f, applyScope: 'from' }))}
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <div className="fs-7 text-gray-700 mb-1">Apply from a specific month onwards (old months unchanged)</div>
                            {form.applyScope === 'from' && (
                              <input
                                type="month"
                                className="form-control form-control-sm"
                                style={{ maxWidth: 200 }}
                                value={form.applyFromMonth}
                                onChange={e => setForm(f => ({ ...f, applyFromMonth: e.target.value }))}
                              />
                            )}
                          </div>
                        </label>
                      </div>
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
                style={{ background: '#8B4444' }}
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

// ── Component Card ─────────────────────────────────────────────────────────────

function ComponentCard({
  item, onToggle, onEdit, onDelete, onToggleOnboarding,
}: {
  item: PayrollComponent;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleOnboarding: () => void;
}) {
  const accent    = KEY_ACCENT[item.key] || '#8B4444';
  const catStyle  = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Custom'];
  const dirInfo   = DIRECTION_COLORS[item.direction] || DIRECTION_COLORS['DEBIT'];
  const calcLabel = CALC_TYPE_LABELS[item.calculationType] || item.calculationType;
  const durLabel  = APPLY_DURATION_LABELS[item.applyDuration]?.label || item.applyDuration;

  const defaultLabel = item.defaultAmount != null
    ? `₹${Number(item.defaultAmount).toLocaleString('en-IN')}`
    : item.defaultPercentage != null
      ? `${item.defaultPercentage}%`
      : null;

  // Show "From MMM YYYY" badge for versioned records (effectiveFrom != 1970-01-01)
  const effectiveDate = item.effectiveFrom ? new Date(item.effectiveFrom) : null;
  const isVersioned = effectiveDate && effectiveDate.getFullYear() > 1970;
  const effectiveLabel = isVersioned
    ? `From ${effectiveDate!.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : null;

  return (
    <Paper elevation={0} sx={{
      border: '1px solid #f0f0f0', borderRadius: 3, overflow: 'hidden',
      opacity: item.isActive ? 1 : 0.55,
      transition: 'all 0.2s',
      '&:hover': { borderColor: '#e0e0e0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        <Box sx={{ width: 4, flexShrink: 0, background: accent }} />

        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, flexShrink: 0, minWidth: 72 }}>
          <Box sx={{
            background: `${accent}15`, border: `1px solid ${accent}30`,
            borderRadius: 1.5, px: 1.5, py: 0.5,
            fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: accent, letterSpacing: '0.04em',
          }}>
            {item.shortCode || item.key.slice(0, 4).toUpperCase()}
          </Box>
        </Box>

        <Box sx={{ flex: 1, py: 1.5, pr: 1 }}>
          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" mb={0.4}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>
              {item.displayName}
            </Typography>
            {item.isSystem && (
              <Chip label="System" size="small" sx={{ fontSize: 10, height: 17, bgcolor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }} />
            )}
            <Chip
              label={item.category}
              size="small"
              sx={{ fontSize: 10, height: 17, bgcolor: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
            />
            <Chip
              label={dirInfo.label}
              size="small"
              sx={{ fontSize: 10, height: 17, bgcolor: `${dirInfo.color}10`, color: dirInfo.color, border: `1px solid ${dirInfo.color}30` }}
            />
            <Chip
              label={calcLabel}
              size="small"
              sx={{ fontSize: 10, height: 17, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
            />
            <Chip
              label={durLabel}
              size="small"
              sx={{ fontSize: 10, height: 17, bgcolor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}
            />
            {defaultLabel && (
              <Chip
                label={`Default: ${defaultLabel}`}
                size="small"
                sx={{ fontSize: 10, height: 17, bgcolor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
              />
            )}
            {effectiveLabel && (
              <Chip
                label={effectiveLabel}
                size="small"
                sx={{ fontSize: 10, height: 17, bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', fontWeight: 700 }}
              />
            )}
          </Stack>
          {item.description && (
            <Typography sx={{ fontSize: 11.5, color: '#6b7280', mt: 0.2 }}>
              {item.description}
            </Typography>
          )}
        </Box>

        <Stack direction="row" alignItems="center" gap={0.25} sx={{ pr: 1.5, flexShrink: 0 }}>
          <Tooltip title={item.enableInOnboarding ? 'Remove from Onboarding' : 'Add to Onboarding'}>
            <IconButton
              size="small"
              onClick={onToggleOnboarding}
              sx={{
                color: item.enableInOnboarding ? '#059669' : '#d1d5db',
                bgcolor: item.enableInOnboarding ? '#ecfdf5' : 'transparent',
                border: item.enableInOnboarding ? '1px solid #6ee7b7' : '1px solid #e5e7eb',
                borderRadius: 1.5,
                '&:hover': { bgcolor: '#ecfdf5', color: '#059669', borderColor: '#6ee7b7' },
              }}
            >
              <SchoolOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={item.isActive ? 'Deactivate' : 'Activate'}>
            <Switch
              checked={item.isActive}
              onChange={onToggle}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#8B4444' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#8B4444' },
              }}
            />
          </Tooltip>

          <Tooltip title="Edit">
            <IconButton size="small" onClick={onEdit} sx={{ color: '#6b7280', '&:hover': { color: '#1a1a1a', bgcolor: '#f9fafb' } }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {!item.isSystem && (
            <Tooltip title="Delete">
              <IconButton size="small" onClick={onDelete} sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
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
}

function ComponentPanel({ mode, allItems, loading, onItemsChange }: ComponentPanelProps) {
  const modeCategories = mode === 'earnings' ? EARNING_CATEGORIES : DEDUCTION_CATEGORIES;
  const defaultCategory = mode === 'earnings' ? 'Allowance' : 'Payroll Deduction';

  const TABS = ['All', ...modeCategories];
  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editItem, setEditItem]         = useState<PayrollComponent | null>(null);

  const items = allItems.filter(i => modeCategories.includes(i.category));

  const handleToggle = async (item: PayrollComponent) => {
    try {
      await deductionMasterService.update(item.id, { isActive: !item.isActive });
      onItemsChange(allItems.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    } catch { /* silent */ }
  };

  const handleToggleOnboarding = async (item: PayrollComponent) => {
    try {
      const updated = await deductionMasterService.update(item.id, { enableInOnboarding: !item.enableInOnboarding });
      onItemsChange(allItems.map(i => i.id === item.id ? { ...i, ...updated, enableInOnboarding: !item.enableInOnboarding } : i));
    } catch { /* silent */ }
  };

  const handleDelete = async (item: PayrollComponent) => {
    const { isConfirmed } = await Swal.fire({
      title: `Delete "${item.displayName}"?`,
      text: 'This removes it from the master. Existing salary data is unaffected.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#8B4444', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel',
    });
    if (!isConfirmed) return;
    try {
      await deductionMasterService.delete(item.id);
      onItemsChange(allItems.filter(i => i.id !== item.id));
      successConfirmation('Component deleted');
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.message || 'Cannot delete', 'error');
    }
  };

  const handleSave = async (data: any) => {
    if (editItem) {
      const updated = await deductionMasterService.update(editItem.id, data);
      onItemsChange(allItems.map(i => i.id === editItem.id ? { ...i, ...updated } : i));
      successConfirmation('Component updated');
    } else {
      const created = await deductionMasterService.create(data);
      onItemsChange([...allItems, created]);
      successConfirmation('Component created');
    }
    setEditItem(null);
  };

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.displayName.toLowerCase().includes(search.toLowerCase()) ||
      item.key.toLowerCase().includes(search.toLowerCase()) ||
      (item.shortCode || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const grouped = modeCategories.reduce<Record<string, PayrollComponent[]>>((acc, cat) => {
    const group = filtered.filter(i => i.category === cat);
    if (group.length > 0) acc[cat] = group;
    return acc;
  }, {});

  const showGrouped = categoryFilter === 'All';

  const addBtnColor = mode === 'earnings' ? '#16a34a' : '#8B4444';

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3} alignItems="flex-start">
        <Box sx={{ flex: 1, maxWidth: 320 }}>
          <TextField
            size="small"
            placeholder="Search components…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
            fullWidth
          />
        </Box>
        <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
          <ToggleButtonGroup
            value={categoryFilter}
            exclusive
            onChange={(_, v) => { if (v !== null) setCategoryFilter(v); }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                fontSize: 11, px: 1.5, py: 0.5,
                border: '1px solid #e5e7eb', borderRadius: '8px !important',
                mx: 0.25, textTransform: 'none', fontWeight: 500,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: addBtnColor, color: '#fff', borderColor: addBtnColor,
              },
            }}
          >
            {TABS.map(c => <ToggleButton key={c} value={c}>{c}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>
        <button
          className="btn btn-sm rounded-3 d-flex align-items-center gap-1 text-white ms-auto"
          style={{ background: addBtnColor, fontSize: 13, whiteSpace: 'nowrap' }}
          onClick={() => { setEditItem(null); setModalOpen(true); }}
        >
          <i className="bi bi-plus-circle" /> Add Component
        </button>
      </Stack>

      {loading ? (
        <Stack gap={1.5}>
          {[1,2,3,4].map(i => <Skeleton key={i} height={64} sx={{ borderRadius: 2 }} />)}
        </Stack>
      ) : filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af', fontSize: 14 }}>No components found</Typography>
          <Typography sx={{ color: '#d1d5db', fontSize: 12, mt: 0.5 }}>
            Click "Seed Defaults" at the top to populate system components
          </Typography>
        </Box>
      ) : showGrouped ? (
        <Stack gap={3}>
          {Object.entries(grouped).map(([cat, group]) => {
            const catStyle = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Custom'];
            const breakdown = SALARY_BREAKDOWN_MAP[cat];
            return (
              <Box key={cat}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Box sx={{ width: 3, height: 16, borderRadius: 1, background: catStyle.color }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: catStyle.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {cat}
                  </Typography>
                  <Chip
                    label={group.length}
                    size="small"
                    sx={{ fontSize: 10, height: 16, bgcolor: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
                  />
                  {breakdown && (
                    <Typography sx={{ fontSize: 11, color: '#9ca3af', ml: 0.5 }}>
                      → {breakdown}
                    </Typography>
                  )}
                </Box>
                <Stack gap={1}>
                  {group.map(item => (
                    <ComponentCard
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggle(item)}
                      onEdit={() => { setEditItem(item); setModalOpen(true); }}
                      onDelete={() => handleDelete(item)}
                      onToggleOnboarding={() => handleToggleOnboarding(item)}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack gap={1}>
          {filtered.map(item => (
            <ComponentCard
              key={item.id}
              item={item}
              onToggle={() => handleToggle(item)}
              onEdit={() => { setEditItem(item); setModalOpen(true); }}
              onDelete={() => handleDelete(item)}
              onToggleOnboarding={() => handleToggleOnboarding(item)}
            />
          ))}
        </Stack>
      )}

      <ComponentFormModal
        open={modalOpen}
        item={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={handleSave}
        defaultCategory={defaultCategory}
      />
    </>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────

export default function DeductionMaster() {
  const [allItems, setAllItems]   = useState<PayrollComponent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'earnings' | 'deductions'>('earnings');
  const [seeding, setSeeding]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deductionMasterService.getAll();
      // Auto-seed if no system components exist yet
      const hasEarnings = (data as PayrollComponent[]).some(i => EARNING_CATEGORIES.includes(i.category) && i.isSystem);
      if (!hasEarnings) {
        const seeded = await deductionMasterService.seed();
        setAllItems(seeded);
      } else {
        setAllItems(data);
      }
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
      confirmButtonColor: '#8B4444', confirmButtonText: 'Seed Defaults',
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
    <ConfigSectionCard
      title="Salary Master"
      description="Full control over every component that appears in your employees' salary breakdowns. System components cannot be deleted but can be renamed, described, and toggled."
      headerRight={
        <button
          className="btn btn-sm btn-light-secondary rounded-3 d-flex align-items-center gap-1"
          onClick={handleSeed}
          disabled={seeding}
          style={{ fontSize: 13 }}
        >
          <SeedIcon style={{ fontSize: 16 }} />
          {seeding ? 'Seeding…' : 'Seed Defaults'}
        </button>
      }
    >
      {/* Sub-tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, borderBottom: '2px solid #f3f4f6', pb: 0 }}>
        {([
          { key: 'earnings',   label: 'Earnings & Allowances', count: earningsCount,   color: '#16a34a', desc: 'Work Earnings · Allowances · Benefits' },
          { key: 'deductions', label: 'Deductions',            count: deductionsCount, color: '#dc2626', desc: 'Attendance · Government · Custom' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              padding: '10px 20px 12px',
              borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
              marginBottom: -2,
              transition: 'all 0.2s',
            }}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography sx={{
                fontSize: 13.5, fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? tab.color : '#6b7280',
              }}>
                {tab.label}
              </Typography>
              <Box sx={{
                px: 1, py: 0.25, borderRadius: 1,
                bgcolor: activeTab === tab.key ? `${tab.color}15` : '#f3f4f6',
                fontSize: 11, fontWeight: 700,
                color: activeTab === tab.key ? tab.color : '#9ca3af',
              }}>
                {tab.count}
              </Box>
            </Stack>
            <Typography sx={{ fontSize: 10.5, color: '#9ca3af', textAlign: 'left', mt: 0.25 }}>
              {tab.desc}
            </Typography>
          </button>
        ))}
      </Box>

      <ComponentPanel
        key={activeTab}
        mode={activeTab}
        allItems={allItems}
        loading={loading}
        onItemsChange={setAllItems}
      />
    </ConfigSectionCard>
  );
}
