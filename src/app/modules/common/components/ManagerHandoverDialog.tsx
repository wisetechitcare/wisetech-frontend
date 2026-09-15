import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { KTIcon } from '@metronic/helpers';
import type { RootState } from '@redux/store';
import { GlassDialog, GlassHeader, WtButton, StatusBadge, TRIO, cn } from '@app/modules/common/components/ui/tw';
import { WtSelect, confirmDialog, type WtSelectOption, type WtSelectGroup } from '@app/modules/common/components/ui';
import type { ManagedProject } from '@services/projects';

/**
 * ManagerHandoverDialog: shown while saving an employee who is leaving and still
 * manages projects. For each project, pick who takes over. The leaver shows as
 * "Past Manager" on that project's Teams tab either way.
 *
 * Built for large hand-overs (100+ projects): tick a batch (search, filter, select all),
 * assign it to one person, repeat. A row left empty means no replacement; the next
 * existing manager (if any) becomes primary.
 */
export type ManagerReplacement = { leadId: string; employeeId: string | null };

export interface ManagerHandoverDialogProps {
    open: boolean;
    /** The leaver, so they are never offered as their own replacement. */
    employeeId: string;
    employeeName: string;
    projects: ManagedProject[];
    onDone: (replacements: ManagerReplacement[]) => void;
}

type Filter = 'all' | 'unassigned' | 'assigned';

/** Grid shared by the column header and every row, so they line up. */
const ROW_GRID = 'grid grid-cols-[20px_minmax(0,1fr)] sm:grid-cols-[20px_minmax(0,1fr)_132px_260px] items-center gap-x-3 gap-y-2';

const Check: React.FC<{ checked: boolean; indeterminate?: boolean; onChange: () => void; label: string; disabled?: boolean }> = ({ checked, indeterminate, onChange, label, disabled }) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={cn(
            'grid place-items-center w-[18px] h-[18px] rounded-[5px] border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:opacity-40',
            checked || indeterminate ? 'border-transparent' : 'border-slate-300 bg-white hover:border-slate-400',
        )}
        style={checked || indeterminate ? { backgroundColor: TRIO.blue.c } : undefined}
    >
        {indeterminate ? <span className="block w-2 h-0.5 rounded bg-white" /> : checked ? <KTIcon iconName="check" className="fs-8 text-white" /> : null}
    </button>
);

const OTHERS_LABEL = 'Other employees (will be added to the team)';

export const ManagerHandoverDialog: React.FC<ManagerHandoverDialogProps> = ({ open, employeeId, employeeName, projects, onDone }) => {
    const employees = useSelector((s: RootState) => s.allEmployees?.list) || [];
    const [picks, setPicks] = useState<Record<string, string>>({});
    const [ticked, setTicked] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!open) return;
        setPicks({}); setTicked(new Set()); setSearch(''); setFilter('all'); setNote('');
    }, [open]);

    const option = useMemo(() => {
        const byId = new Map(employees.map((e: any) => [String(e.employeeId), e]));
        return (id: string): WtSelectOption => {
            const e: any = byId.get(id);
            return { value: id, label: e?.employeeName || id, avatar: e?.avatar };
        };
    }, [employees]);

    // Every active employee except the leaver: anyone can take over, joining the team if needed.
    const allOptions = useMemo(
        () => employees
            .filter((e: any) => e.isActive !== false && String(e.employeeId) !== String(employeeId))
            .map((e: any) => option(String(e.employeeId)))
            .sort((a, b) => a.label.localeCompare(b.label)),
        [employees, employeeId, option],
    );

    /** Team members first, then everyone else under a label that says they'll be added. */
    const groupedOptions = (teamIds: string[]): WtSelectGroup[] => {
        const team = new Set(teamIds);
        const groups: WtSelectGroup[] = [];
        if (teamIds.length) groups.push({ label: 'On the team', options: teamIds.map(option).sort((a, b) => a.label.localeCompare(b.label)) });
        groups.push({ label: OTHERS_LABEL, options: allOptions.filter((o) => !team.has(o.value)) });
        return groups;
    };
    const leaverFirstName = employeeName.split(' ')[0] || employeeName;

    const assignedCount = projects.filter((p) => picks[p.leadId]).length;

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return projects.filter((p) =>
            (filter === 'all' || (filter === 'assigned') === !!picks[p.leadId])
            && (!q || p.title?.toLowerCase().includes(q) || (p.projectNumber ?? '').toLowerCase().includes(q)));
    }, [projects, picks, search, filter]);

    // Header checkbox acts on the rows currently shown.
    const shownTicked = rows.filter((p) => ticked.has(p.leadId)).length;
    const allShownTicked = rows.length > 0 && shownTicked === rows.length;
    const toggleShown = () => setTicked((prev) => {
        const next = new Set(prev);
        rows.forEach((p) => (allShownTicked ? next.delete(p.leadId) : next.add(p.leadId)));
        return next;
    });
    const toggle = (leadId: string) => setTicked((prev) => {
        const next = new Set(prev);
        if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
        return next;
    });

    const selected = projects.filter((p) => ticked.has(p.leadId));
    // "On the team" = on the team of at least one ticked project.
    const batchOptions = groupedOptions([...new Set(selected.flatMap((p) => p.candidateIds))]);

    const assignSelected = async (id: string | null) => {
        if (!id) return;
        const name = option(id).label;
        const fits = selected.filter((p) => p.candidateIds.includes(id));
        const outside = selected.length - fits.length;
        // Not on some of the teams: ask before adding them to those teams too.
        const addToTeams = outside > 0 && await confirmDialog({
            icon: 'question',
            title: `Add ${name} to ${outside} team(s)?`,
            text: `${name} is not on the team of ${outside} of the ${selected.length} selected project(s). `
                + `Yes adds them to those teams as manager. No assigns only the ${fits.length} where they already are.`,
            confirmText: `Yes, all ${selected.length}`,
            cancelText: fits.length ? `No, only ${fits.length}` : 'Cancel',
        });
        const targets = addToTeams ? selected : fits;
        if (!targets.length) return;
        setPicks((prev) => ({ ...prev, ...Object.fromEntries(targets.map((p) => [p.leadId, id])) }));
        setTicked(new Set());
        setNote(`${name} → ${targets.length} project(s)${addToTeams ? ` (added to ${outside} team(s))` : outside ? `. ${outside} left: not on those teams.` : '.'}`);
    };

    const finish = (withPicks: boolean) =>
        onDone(projects.map((p) => ({ leadId: p.leadId, employeeId: withPicks ? picks[p.leadId] || null : null })));

    const filters: { key: Filter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: projects.length },
        { key: 'unassigned', label: 'Unassigned', count: projects.length - assignedCount },
        { key: 'assigned', label: 'Assigned', count: assignedCount },
    ];

    return (
        <GlassDialog
            open={open}
            onClose={() => finish(false)}
            maxWidth="lg"
            scrollBody={false}
            header={
                <GlassHeader
                    title="Who takes over as manager?"
                    subtitle={`${employeeName} manages ${projects.length} project(s) and will show as Past Manager on each.`}
                    onClose={() => finish(false)}
                    icon={<KTIcon iconName="profile-user" className="fs-2 text-white" />}
                />
            }
        >
            {/* Toolbar: search + filters */}
            <div className="shrink-0 flex flex-col md:flex-row md:items-center gap-2.5 px-4 sm:px-6 pt-4 pb-3">
                <div className="flex grow items-center gap-2 h-10 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <KTIcon iconName="magnifier" className="fs-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search project name or number…"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                </div>
                <div role="tablist" aria-label="Filter projects" className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.key}
                            onClick={() => setFilter(f.key)}
                            className={cn(
                                'h-9 px-3 rounded-md text-[12.5px] font-semibold whitespace-nowrap transition-colors',
                                filter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            {f.label} <span className="ml-1 text-slate-400">{f.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Batch bar: appears once something is ticked */}
            <div className="shrink-0 px-4 sm:px-6 pb-3">
                {ticked.size ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-lg border px-3 py-2.5" style={{ backgroundColor: TRIO.blue.bg, borderColor: TRIO.blue.bd }}>
                        <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap">
                            Assign {ticked.size} selected to
                        </span>
                        <div className="grow min-w-0">
                            <WtSelect
                                options={batchOptions}
                                value={null}
                                onChange={(o: WtSelectOption | null) => assignSelected(o?.value ?? null)}
                                placeholder="Pick an employee…"
                                ariaLabel="Manager for the selected projects"
                                optionVariant="avatar"
                                isSearchable
                                size="sm"
                            />
                        </div>
                        <WtButton ghost onClick={() => setTicked(new Set())}>Clear selection</WtButton>
                    </div>
                ) : (
                    <p className={cn('m-0 text-[12.5px]', note ? 'text-emerald-700' : 'text-slate-500')}>
                        {note || 'Tick projects to hand them to one person at once, or pick per row. Use Unassigned to see what is left.'}
                    </p>
                )}
            </div>

            {/* Column header */}
            <div className={cn(ROW_GRID, 'shrink-0 mx-4 sm:mx-6 px-3 py-2 rounded-t-lg border border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500')}>
                <Check checked={allShownTicked} indeterminate={shownTicked > 0 && !allShownTicked} onChange={toggleShown} label="Select all shown" disabled={!rows.length} />
                <span>Project</span>
                <span className="hidden sm:block">Role</span>
                <span className="hidden sm:block">New manager</span>
            </div>

            {/* Rows */}
            <div className="grow min-h-0 overflow-y-auto mx-4 sm:mx-6 mb-3 rounded-b-lg border border-t-0 border-slate-200 bg-white">
                {rows.length === 0 ? (
                    <div className="py-14 text-center text-sm text-slate-400">
                        {search ? `No projects match "${search}".` : filter === 'assigned' ? 'Nothing assigned yet.' : 'Every project has a new manager.'}
                    </div>
                ) : rows.map((p) => {
                    const isTicked = ticked.has(p.leadId);
                    const pick = picks[p.leadId];
                    const joinsTeam = !!pick && !p.candidateIds.includes(pick);
                    return (
                        <div
                            key={p.leadId}
                            className={cn(ROW_GRID, 'px-3 py-2 border-b border-slate-100 last:border-b-0 transition-colors', isTicked ? 'bg-blue-50/60' : 'hover:bg-slate-50/70')}
                        >
                            <Check checked={isTicked} onChange={() => toggle(p.leadId)} label={`Select ${p.title}`} />
                            <div className="min-w-0">
                                <p className="m-0 text-[13px] font-semibold leading-5 text-slate-800 truncate" title={p.title}>{p.title}</p>
                                <p className="m-0 text-[11.5px] leading-4 text-slate-400 truncate">
                                    {p.projectNumber || 'No project number'}
                                    <span className="sm:hidden"> · {p.isPrimary ? 'Primary Manager' : 'Manager'}</span>
                                    {joinsTeam ? (
                                        <span className="text-blue-600"> · {option(pick).label.split(' ')[0]} will be added to the team</span>
                                    ) : !p.candidateIds.length ? (
                                        <span className="text-amber-600"> · {leaverFirstName} is the only one on this team</span>
                                    ) : null}
                                </p>
                            </div>
                            <div className="hidden sm:block">
                                <StatusBadge trio={p.isPrimary ? TRIO.amber : TRIO.slate} label={p.isPrimary ? 'Primary' : 'Manager'} />
                            </div>
                            <div className="col-start-2 sm:col-start-auto min-w-0">
                                <WtSelect
                                    options={groupedOptions(p.candidateIds)}
                                    value={pick ? option(pick) : null}
                                    onChange={(o: WtSelectOption | null) => setPicks((prev) => ({ ...prev, [p.leadId]: o?.value ?? '' }))}
                                    placeholder={p.candidateIds.length ? 'No replacement' : 'Pick anyone to add…'}
                                    ariaLabel={`New manager for ${p.title}`}
                                    optionVariant="avatar"
                                    isClearable
                                    isSearchable
                                    size="sm"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-3 border-t border-slate-100 bg-white/70">
                <div className="flex grow items-center gap-3 min-w-0">
                    <div className="h-1.5 w-28 shrink-0 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-[width]" style={{ width: `${projects.length ? (assignedCount / projects.length) * 100 : 0}%`, backgroundColor: TRIO.green.c }} />
                    </div>
                    <span className="text-[12.5px] text-slate-500 truncate">
                        <b className="text-slate-700">{assignedCount}</b> of {projects.length} have a new manager
                    </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <WtButton ghost onClick={() => finish(false)}>Skip for now</WtButton>
                    <WtButton onClick={() => finish(true)}>Save hand-over</WtButton>
                </div>
            </div>
        </GlassDialog>
    );
};

export default ManagerHandoverDialog;
