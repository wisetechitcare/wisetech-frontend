import React, { useMemo, useState } from "react";
import { Box } from '@mui/material';
import { useRootOrgNames } from "@hooks/useRootOrgNames";

// Shared toolbar filters (Sub Organization / Employee Status / Pay Type) used by
// the Monthly, Yearly and All Time salary tables so they stay identical.

export type StatusFilter = 'Active' | 'Deactive' | 'All';
export type PayTypeFilter = 'All' | 'Salary' | 'Contract';

// The toolbar filter control now lives in the shared kit — it was never
// salary-specific, and three other pages were importing it from this file.
// Re-exported so existing imports of it from here keep resolving.
export { ToolbarFilterSelect, FILTER_TONES } from "@app/modules/common/components/ui/ToolbarFilterSelect";
export type { FilterSelectTheme } from "@app/modules/common/components/ui/ToolbarFilterSelect";
import { ToolbarFilterSelect } from "@app/modules/common/components/ui/ToolbarFilterSelect";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

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
  branchFilter: string;
  setBranchFilter: (v: string) => void;
  teamFilter: string;
  setTeamFilter: (v: string) => void;
  subOrgOptions: string[];
  branchOptions: string[];
  teamOptions: string[];
  filteredEmployeeSummaries: any[];
}

// Distinct, sorted values of one summary field ('N/A' and blanks dropped).
const distinctValues = (summaries: any[], field: string, exclude?: Set<string>) => {
  const names = new Set<string>();
  summaries.forEach((s: any) => {
    const name = s[field];
    if (name && name !== 'N/A' && !exclude?.has(name)) names.add(name);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
};

export const useSalaryFilters = (employeesData: any): SalaryFilters => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [subOrgFilter, setSubOrgFilter] = useState<string>('All');
  const [payTypeFilter, setPayTypeFilter] = useState<PayTypeFilter>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const rootOrgNames = useRootOrgNames();

  const summaries: any[] = employeesData?.message?.employeeSummaries ?? [];

  // Dropdown options come from the data itself (no hardcoding). For sub-orgs the
  // top-level org is excluded — only actual sub-orgs belong in that dropdown.
  const subOrgOptions = useMemo(
    () => distinctValues(summaries, 'subOrganization', rootOrgNames),
    [employeesData, rootOrgNames],
  );
  const branchOptions = useMemo(() => distinctValues(summaries, 'branch'), [employeesData]);
  const teamOptions = useMemo(() => distinctValues(summaries, 'team'), [employeesData]);

  const filteredEmployeeSummaries = useMemo(() => {
    if (!employeesData?.message?.employeeSummaries) return [];

    return employeesData.message.employeeSummaries.filter((summary: any) => {
      const isActive = summary.isActive !== false;
      const statusMatch =
        statusFilter === 'Active' ? isActive :
        statusFilter === 'Deactive' ? !isActive :
        true; // 'All'

      const subOrgMatch = subOrgFilter === 'All' || summary.subOrganization === subOrgFilter;
      const branchMatch = branchFilter === 'All' || summary.branch === branchFilter;
      const teamMatch = teamFilter === 'All' || summary.team === teamFilter;

      const payTypeMatch =
        payTypeFilter === 'All' ||
        (payTypeFilter === 'Contract' ? isContractBased(summary) : !isContractBased(summary));

      return statusMatch && subOrgMatch && branchMatch && teamMatch && payTypeMatch;
    });
  }, [employeesData, statusFilter, subOrgFilter, payTypeFilter, branchFilter, teamFilter]);

  return {
    statusFilter, setStatusFilter,
    subOrgFilter, setSubOrgFilter,
    payTypeFilter, setPayTypeFilter,
    branchFilter, setBranchFilter,
    teamFilter, setTeamFilter,
    subOrgOptions, branchOptions, teamOptions, filteredEmployeeSummaries,
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
    branchFilter, setBranchFilter,
    teamFilter, setTeamFilter,
    subOrgOptions, branchOptions, teamOptions,
  } = filters;

  return (
    <Box sx={{ display: 'flex', gap: '12px', rowGap: '16px', alignItems: 'center', px: 1, flexWrap: 'wrap' }}>

      {/* Visual separator from the search controls */}
      <Box sx={{ width: '1px', height: '26px', backgroundColor: '#e5e7eb', mx: 0.5, display: { xs: 'none', md: 'block' } }} />

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
      {branchOptions.length > 0 && (
        <ToolbarFilterSelect
          label="Branch"
          icon="bi-geo-alt"
          value={branchFilter}
          onChange={setBranchFilter}
          minWidth={190}
          theme={branchFilter !== 'All'
            ? { icon: '#0891b2', border: '#a5f3fc', bg: '#ecfeff', text: '#155e75', ring: 'rgba(8, 145, 178, 0.12)' }
            : undefined}
          options={[
            { value: 'All', label: 'All Branches' },
            ...branchOptions.map((name) => ({ value: name, label: name })),
          ]}
        />
      )}
      {teamOptions.length > 0 && (
        <ToolbarFilterSelect
          label="Team"
          icon="bi-people"
          value={teamFilter}
          onChange={setTeamFilter}
          minWidth={180}
          theme={teamFilter !== 'All'
            ? { icon: '#d97706', border: '#fde68a', bg: '#fffbeb', text: '#92400e', ring: 'rgba(217, 119, 6, 0.12)' }
            : undefined}
          options={[
            { value: 'All', label: 'All Teams' },
            ...teamOptions.map((name) => ({ value: name, label: name })),
          ]}
        />
      )}
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
      {(subOrgFilter !== 'All' || statusFilter !== 'Active' || payTypeFilter !== 'All' || branchFilter !== 'All' || teamFilter !== 'All') && (
        <button
          onClick={() => { setSubOrgFilter('All'); setStatusFilter('Active'); setPayTypeFilter('All'); setBranchFilter('All'); setTeamFilter('All'); onStatusChange?.('Active'); }}
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
          <AppIcon name="bi-arrow-counterclockwise" className="fs-7" />
          Reset
        </button>
      )}

    </Box>
  );
};
