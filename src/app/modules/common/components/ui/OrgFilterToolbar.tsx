import { useCallback, useMemo, useState } from 'react';
import { FilterToolbar } from '@/ds/patterns/filter-toolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/ds/ui/toggle-group';
import { useRootOrgNames } from '@hooks/useRootOrgNames';

/**
 * The org filter row — Employee Status · Sub Organization · Branch · Team · Reset.
 *
 * WHY IT LIVES HERE: this composition had been hand-copied onto the payroll table, the
 * reimbursement details table and the payment queue, and the copies had already drifted on the
 * details that matter — which value counts as "no value", whether the top-level org belongs in
 * the sub-organisation list, and what Reset resets to. A filter that offers a different set of
 * branches on two screens over the same employees is a small inconsistency people stop trusting.
 *
 * The rules, once:
 *  · options are the distinct values of the rows IN VIEW, so a branch with nothing in the current
 *    period is not offered as a dead end
 *  · blanks and "N/A" are never options — they are the absence of a value, not a value
 *  · the top-level organisation is excluded from Sub Organization; only real sub-orgs belong
 *  · a dropdown with no options does not render at all
 *  · Reset returns every filter to its default, and only appears once something is set
 *
 * Rows only need the fields they actually have: a screen with no team data simply gets no Team
 * dropdown. Pass `defaultStatus: 'Active'` where the page should open on current employees.
 *
 * The view is the design system's Filter Toolbar recipe (Storybook "Patterns/Filter Toolbar", which names itself
 * this component's replacement): kit Selects, the status as a counted ToggleGroup — every option visible, no
 * cycling to find one — and the toolbar's own "Clear Filters (n)".
 */

export type EmployeeStatusFilter = 'Active' | 'Deactive' | 'All';

/** Any row carrying the org facts. All optional — absent fields drop their dropdown. */
export interface OrgFilterableRow {
    subOrganization?: string | null;
    branch?: string | null;
    team?: string | null;
    isActive?: boolean;
}

export interface OrgFilterState<T extends OrgFilterableRow = OrgFilterableRow> {
    status: EmployeeStatusFilter;
    setStatus: (v: EmployeeStatusFilter) => void;
    subOrg: string;
    setSubOrg: (v: string) => void;
    branch: string;
    setBranch: (v: string) => void;
    team: string;
    setTeam: (v: string) => void;
    subOrgOptions: string[];
    branchOptions: string[];
    teamOptions: string[];
    /** Rows per employee status, for the status toggle's counts. */
    statusCounts: Record<EmployeeStatusFilter, number>;
    /** How many non-default filters are on. */
    activeCount: number;
    reset: () => void;
    /** Predicate for the four filters — feed it to `rows.filter(...)`. */
    matches: (row: T) => boolean;
}

const distinct = <T extends OrgFilterableRow>(
    rows: T[],
    field: keyof OrgFilterableRow,
    exclude?: Set<string>,
): string[] => {
    const names = new Set<string>();
    rows.forEach((row) => {
        const value = row[field];
        if (typeof value === 'string' && value && value !== 'N/A' && !exclude?.has(value)) {
            names.add(value);
        }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
};

export function useOrgFilters<T extends OrgFilterableRow>(
    rows: T[],
    options?: { defaultStatus?: EmployeeStatusFilter },
): OrgFilterState<T> {
    const defaultStatus = options?.defaultStatus ?? 'All';
    const [status, setStatus] = useState<EmployeeStatusFilter>(defaultStatus);
    const [subOrg, setSubOrg] = useState('All');
    const [branch, setBranch] = useState('All');
    const [team, setTeam] = useState('All');
    const rootOrgNames = useRootOrgNames();

    const subOrgOptions = useMemo(() => distinct(rows, 'subOrganization', rootOrgNames), [rows, rootOrgNames]);
    const branchOptions = useMemo(() => distinct(rows, 'branch'), [rows]);
    const teamOptions = useMemo(() => distinct(rows, 'team'), [rows]);
    const statusCounts = useMemo(() => {
        let active = 0;
        let inactive = 0;
        for (const row of rows) {
            if (row.isActive === true) active += 1;
            else if (row.isActive === false) inactive += 1;
        }
        return { Active: active, Deactive: inactive, All: rows.length };
    }, [rows]);

    const activeCount =
        (status !== defaultStatus ? 1 : 0) + (subOrg !== 'All' ? 1 : 0) +
        (branch !== 'All' ? 1 : 0) + (team !== 'All' ? 1 : 0);

    const reset = useCallback(() => {
        setStatus(defaultStatus); setSubOrg('All'); setBranch('All'); setTeam('All');
    }, [defaultStatus]);

    const matches = useCallback((row: T) =>
        // An unknown value is never filtered OUT by a filter it has no value for — hiding a
        // row because its org data failed to load would silently shrink a money total.
        (status === 'All' || row.isActive === undefined || (status === 'Active' ? row.isActive : !row.isActive)) &&
        (subOrg === 'All' || row.subOrganization === subOrg) &&
        (branch === 'All' || row.branch === branch) &&
        (team === 'All' || row.team === team),
    [status, subOrg, branch, team]);

    // Identity changes only when a filter or an option list does. Callers memo on `filters`
    // (`useMemo(() => rows.filter(filters.matches), [rows, filters])`); a fresh object per render
    // re-derived every row list on every render, and the payment desk's selection-pruning effect
    // turned that into an endless render loop (React #185 on desktop).
    return useMemo(() => ({
        status, setStatus,
        subOrg, setSubOrg,
        branch, setBranch,
        team, setTeam,
        subOrgOptions, branchOptions, teamOptions,
        statusCounts,
        activeCount,
        reset,
        matches,
    }), [status, subOrg, branch, team, subOrgOptions, branchOptions, teamOptions, statusCounts, activeCount, reset, matches]);
}

/** One org dropdown, as the Filter Toolbar story builds them: the value names the filter ("All Branches"). */
function OrgSelect({ label, value, onChange, allLabel, options, className }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    allLabel: string;
    options: string[];
    className?: string;
}) {
    const items = [{ value: 'All', label: allLabel }, ...options.map((n) => ({ value: n, label: n }))];
    return (
        <Select items={items} value={value} onValueChange={(v) => onChange(String(v))}>
            <SelectTrigger aria-label={label} className={className}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

const STATUS_OPTIONS: { value: EmployeeStatusFilter; label: string }[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Deactive', label: 'Inactive' },
    { value: 'All', label: 'All' },
];

export function OrgFilterToolbar({ filters }: { filters: OrgFilterState<any> }) {
    const {
        status, setStatus, subOrg, setSubOrg, branch, setBranch, team, setTeam,
        subOrgOptions, branchOptions, teamOptions, statusCounts, activeCount, reset,
    } = filters;

    return (
        <FilterToolbar activeCount={activeCount} onClear={reset}>
            <ToggleGroup
                aria-label="Employee Status"
                variant="outline"
                size="lg"
                spacing={0}
                value={[status]}
                onValueChange={(v: string[]) => v[0] && setStatus(v[0] as EmployeeStatusFilter)}
            >
                {STATUS_OPTIONS.map((o) => (
                    <ToggleGroupItem key={o.value} value={o.value}>
                        {o.label} <span className="tabular text-muted-foreground">{statusCounts[o.value]}</span>
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>

            {subOrgOptions.length > 0 && (
                <OrgSelect label="Sub Organization" value={subOrg} onChange={setSubOrg} allLabel="All Sub Organizations" options={subOrgOptions} className="w-52" />
            )}
            {branchOptions.length > 0 && (
                <OrgSelect label="Branch" value={branch} onChange={setBranch} allLabel="All Branches" options={branchOptions} className="w-44" />
            )}
            {teamOptions.length > 0 && (
                <OrgSelect label="Team" value={team} onChange={setTeam} allLabel="All Teams" options={teamOptions} className="w-40" />
            )}
        </FilterToolbar>
    );
}

export default OrgFilterToolbar;
