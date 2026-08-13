import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { ToolbarFilterSelect, FILTER_TONES } from './ToolbarFilterSelect';
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

    const activeCount =
        (status !== defaultStatus ? 1 : 0) + (subOrg !== 'All' ? 1 : 0) +
        (branch !== 'All' ? 1 : 0) + (team !== 'All' ? 1 : 0);

    return {
        status, setStatus,
        subOrg, setSubOrg,
        branch, setBranch,
        team, setTeam,
        subOrgOptions, branchOptions, teamOptions,
        activeCount,
        reset: () => { setStatus(defaultStatus); setSubOrg('All'); setBranch('All'); setTeam('All'); },
        matches: (row: T) =>
            // An unknown value is never filtered OUT by a filter it has no value for — hiding a
            // row because its org data failed to load would silently shrink a money total.
            (status === 'All' || row.isActive === undefined || (status === 'Active' ? row.isActive : !row.isActive)) &&
            (subOrg === 'All' || row.subOrganization === subOrg) &&
            (branch === 'All' || row.branch === branch) &&
            (team === 'All' || row.team === team),
    };
}

export function OrgFilterToolbar({ filters }: { filters: OrgFilterState<any> }) {
    const {
        status, setStatus, subOrg, setSubOrg, branch, setBranch, team, setTeam,
        subOrgOptions, branchOptions, teamOptions, activeCount, reset,
    } = filters;

    return (
        <Box sx={{ display: 'flex', gap: 1.5, rowGap: 2, alignItems: 'center', px: 1, flexWrap: 'wrap' }}>
            <Box sx={{ width: '1px', height: 26, bgcolor: 'divider', mx: 0.5, display: { xs: 'none', md: 'block' } }} />

            <ToolbarFilterSelect
                label="Employee Status"
                icon="bi-person-circle"
                value={status}
                onChange={(v) => setStatus(v as EmployeeStatusFilter)}
                minWidth={150}
                theme={status === 'Active' ? FILTER_TONES.green
                    : status === 'Deactive' ? FILTER_TONES.red
                    : undefined}
                options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Deactive', label: 'Inactive' },
                    { value: 'All', label: 'All' },
                ]}
            />

            {subOrgOptions.length > 0 && (
                <ToolbarFilterSelect
                    label="Sub Organization"
                    icon="bi-building"
                    value={subOrg}
                    onChange={setSubOrg}
                    minWidth={200}
                    theme={subOrg !== 'All' ? FILTER_TONES.blue : undefined}
                    options={[
                        { value: 'All', label: 'All Sub Organizations' },
                        ...subOrgOptions.map((n) => ({ value: n, label: n })),
                    ]}
                />
            )}

            {branchOptions.length > 0 && (
                <ToolbarFilterSelect
                    label="Branch"
                    icon="bi-geo-alt"
                    value={branch}
                    onChange={setBranch}
                    minWidth={175}
                    theme={branch !== 'All' ? FILTER_TONES.cyan : undefined}
                    options={[
                        { value: 'All', label: 'All Branches' },
                        ...branchOptions.map((n) => ({ value: n, label: n })),
                    ]}
                />
            )}

            {teamOptions.length > 0 && (
                <ToolbarFilterSelect
                    label="Team"
                    icon="bi-people"
                    value={team}
                    onChange={setTeam}
                    minWidth={165}
                    theme={team !== 'All' ? FILTER_TONES.amber : undefined}
                    options={[
                        { value: 'All', label: 'All Teams' },
                        ...teamOptions.map((n) => ({ value: n, label: n })),
                    ]}
                />
            )}

            {activeCount > 0 && (
                <Box
                    component="button"
                    type="button"
                    onClick={reset}
                    title="Reset filters to defaults"
                    sx={{
                        height: 38, px: 1.5, display: 'inline-flex', alignItems: 'center', gap: 0.75,
                        border: '1px dashed #fca5a5', borderRadius: '10px',
                        bgcolor: 'background.paper', color: '#dc2626',
                        fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.06)' },
                    }}
                >
                    <i className="bi bi-arrow-counterclockwise" style={{ fontSize: 13 }} />
                    Reset
                </Box>
            )}
        </Box>
    );
}

export default OrgFilterToolbar;
