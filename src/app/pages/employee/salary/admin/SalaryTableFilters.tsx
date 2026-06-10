import React, { useMemo, useState } from "react";
import { Box } from '@mui/material';

// Shared toolbar filters (Sub Organization / Employee Status / Pay Type) used by
// the Monthly, Yearly and All Time salary tables so they stay identical.

export type StatusFilter = 'Active' | 'Deactive' | 'All';
export type PayTypeFilter = 'All' | 'Salary' | 'Contract';

// ─── Toolbar filter select ────────────────────────────────────────────────────
// Compact 38px control with a floating label on the border so it lines up with
// the table's search controls on the same toolbar row. `theme` tints the
// control when a non-default filter value is selected.

interface FilterSelectTheme {
  icon: string;
  border: string;
  bg: string;
  text: string;
  ring: string;
}

const FILTER_NEUTRAL: FilterSelectTheme = {
  icon: '#6b7280', border: '#e5e7eb', bg: '#f9fafb', text: '#111827',
  ring: 'rgba(59, 130, 246, 0.12)',
};

interface ToolbarFilterSelectProps {
  label: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  minWidth?: number;
  theme?: FilterSelectTheme;
}

const ToolbarFilterSelect: React.FC<ToolbarFilterSelectProps> = ({
  label, icon, value, onChange, options, minWidth = 160, theme = FILTER_NEUTRAL,
}) => (
  <div style={{ position: 'relative', minWidth }}>
    <label style={{
      position: 'absolute', top: '-7px', left: '12px', zIndex: 2,
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', lineHeight: '14px',
      textTransform: 'uppercase', color: '#6b7280', whiteSpace: 'nowrap',
      backgroundColor: '#ffffff', padding: '0 6px', borderRadius: '4px',
      fontFamily: 'Inter, sans-serif', pointerEvents: 'none',
    }}>
      {label}
    </label>
    <i className={`bi ${icon}`} style={{
      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
      fontSize: '14px', color: theme.icon, pointerEvents: 'none', zIndex: 1,
      transition: 'color 0.2s ease',
    }} />
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: '38px', width: '100%', padding: '0 32px 0 34px',
        border: `1px solid ${theme.border}`, borderRadius: '10px',
        backgroundColor: theme.bg,
        fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600,
        color: theme.text, appearance: 'none', cursor: 'pointer',
        outline: 'none', transition: 'all 0.2s ease',
      }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.ring}`; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <i className="bi bi-chevron-down" style={{
      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
      fontSize: '11px', color: theme.icon, pointerEvents: 'none',
      transition: 'color 0.2s ease',
    }} />
  </div>
);

// Contract-based employees have professional fees (TDS) enabled; salary-based don't.
// Falls back to the deducted amount for API responses that predate the flag.
const isContractBased = (summary: any): boolean => {
  if (typeof summary?.professionalFeesEnabled === 'boolean') return summary.professionalFeesEnabled;
  return Number(summary?.rawTotals?.professionalFeesDeducted ?? 0) > 0;
};

// ─── Filter state + filtered data ─────────────────────────────────────────────

export interface SalaryFilters {
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  subOrgFilter: string;
  setSubOrgFilter: (v: string) => void;
  payTypeFilter: PayTypeFilter;
  setPayTypeFilter: (v: PayTypeFilter) => void;
  subOrgOptions: string[];
  filteredEmployeeSummaries: any[];
}

export const useSalaryFilters = (employeesData: any): SalaryFilters => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [subOrgFilter, setSubOrgFilter] = useState<string>('All');
  const [payTypeFilter, setPayTypeFilter] = useState<PayTypeFilter>('All');

  // Unique sub-organization names present in the data (dynamic, no hardcoding).
  const subOrgOptions = useMemo(() => {
    const summaries = employeesData?.message?.employeeSummaries ?? [];
    const names = new Set<string>();
    summaries.forEach((s: any) => {
      const name = s.subOrganization;
      if (name && name !== 'N/A') names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [employeesData]);

  const filteredEmployeeSummaries = useMemo(() => {
    if (!employeesData?.message?.employeeSummaries) return [];

    return employeesData.message.employeeSummaries.filter((summary: any) => {
      const isActive = summary.isActive !== false;
      const statusMatch =
        statusFilter === 'Active' ? isActive :
        statusFilter === 'Deactive' ? !isActive :
        true; // 'All'

      const subOrgMatch = subOrgFilter === 'All' || summary.subOrganization === subOrgFilter;

      const payTypeMatch =
        payTypeFilter === 'All' ||
        (payTypeFilter === 'Contract' ? isContractBased(summary) : !isContractBased(summary));

      return statusMatch && subOrgMatch && payTypeMatch;
    });
  }, [employeesData, statusFilter, subOrgFilter, payTypeFilter]);

  return {
    statusFilter, setStatusFilter,
    subOrgFilter, setSubOrgFilter,
    payTypeFilter, setPayTypeFilter,
    subOrgOptions, filteredEmployeeSummaries,
  };
};

// ─── Toolbar UI ───────────────────────────────────────────────────────────────

interface SalaryFilterToolbarProps {
  filters: SalaryFilters;
  // Notifies the parent so it can refetch — the API returns active employees
  // only by default, so inactive ones must be requested from the server.
  onStatusChange?: (status: StatusFilter) => void;
}

export const SalaryFilterToolbar: React.FC<SalaryFilterToolbarProps> = ({ filters, onStatusChange }) => {
  const {
    statusFilter, setStatusFilter,
    subOrgFilter, setSubOrgFilter,
    payTypeFilter, setPayTypeFilter,
    subOrgOptions,
  } = filters;

  return (
    <Box sx={{ display: 'flex', gap: '12px', rowGap: '16px', alignItems: 'center', px: 1, flexWrap: 'wrap' }}>

      {/* Visual separator from the search controls */}
      <Box sx={{ width: '1px', height: '26px', backgroundColor: '#e5e7eb', mx: 0.5, display: { xs: 'none', md: 'block' } }} />

      <ToolbarFilterSelect
        label="Sub Organization"
        icon="bi-building"
        value={subOrgFilter}
        onChange={setSubOrgFilter}
        minWidth={220}
        theme={subOrgFilter !== 'All'
          ? { icon: '#3b82f6', border: '#bfdbfe', bg: '#eff6ff', text: '#1e40af', ring: 'rgba(59, 130, 246, 0.12)' }
          : undefined}
        options={[
          { value: 'All', label: 'All Sub Organizations' },
          ...subOrgOptions.map((name) => ({ value: name, label: name })),
        ]}
      />

      <ToolbarFilterSelect
        label="Employee Status"
        icon="bi-person-circle"
        value={statusFilter}
        onChange={(v) => {
          const status = v as StatusFilter;
          setStatusFilter(status);
          onStatusChange?.(status);
        }}
        minWidth={150}
        theme={statusFilter === 'Active'
          ? { icon: '#10b981', border: '#a7f3d0', bg: '#ecfdf5', text: '#065f46', ring: 'rgba(16, 185, 129, 0.12)' }
          : statusFilter === 'Deactive'
            ? { icon: '#ef4444', border: '#fecaca', bg: '#fef2f2', text: '#991b1b', ring: 'rgba(239, 68, 68, 0.12)' }
            : undefined}
        options={[
          { value: 'Active', label: 'Active' },
          { value: 'Deactive', label: 'Inactive' },
          { value: 'All', label: 'All' },
        ]}
      />

      <ToolbarFilterSelect
        label="Pay Type"
        icon="bi-briefcase"
        value={payTypeFilter}
        onChange={(v) => setPayTypeFilter(v as PayTypeFilter)}
        minWidth={170}
        theme={payTypeFilter === 'Salary'
          ? { icon: '#16a34a', border: '#bbf7d0', bg: '#f0fdf4', text: '#166534', ring: 'rgba(22, 163, 74, 0.12)' }
          : payTypeFilter === 'Contract'
            ? { icon: '#7c3aed', border: '#ddd6fe', bg: '#f5f3ff', text: '#5b21b6', ring: 'rgba(124, 58, 237, 0.12)' }
            : undefined}
        options={[
          { value: 'All', label: 'All Pay Types' },
          { value: 'Salary', label: 'Salary Based' },
          { value: 'Contract', label: 'Contract Based' },
        ]}
      />

      {/* Reset appears only when a non-default filter is applied */}
      {(subOrgFilter !== 'All' || statusFilter !== 'Active' || payTypeFilter !== 'All') && (
        <button
          onClick={() => { setSubOrgFilter('All'); setStatusFilter('Active'); setPayTypeFilter('All'); onStatusChange?.('Active'); }}
          title="Reset filters to defaults"
          style={{
            height: '38px', padding: '0 12px',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            border: '1px dashed #fca5a5', borderRadius: '10px',
            backgroundColor: '#ffffff', color: '#dc2626',
            fontFamily: 'Inter, sans-serif', fontSize: '12.5px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
        >
          <i className="bi bi-arrow-counterclockwise" style={{ fontSize: '13px' }} />
          Reset
        </button>
      )}

    </Box>
  );
};
