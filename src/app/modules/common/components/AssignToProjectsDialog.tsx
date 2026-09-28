import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, WtButton, StatusBadge, cn, TRIO } from '@app/modules/common/components/ui/tw';
import { WtDateField, confirmDialog, toast, alertDialog } from '@app/modules/common/components/ui';
// This file had its own copy of this escape. Promoted to the kit so the next dialog
// finds it — three later call sites did not, and shipped unescaped names into
// SweetAlert. Aliased to `esc` so the call sites below read unchanged.
import { escapeHtml as esc } from '@app/modules/common/components/ui/safeHtml';
import { DATE_FORMATS } from '@utils/dateFormats';
import { getAssignableProjects, assignToProjects, type AssignableProject, type AssignTarget } from '@services/projects';

/**
 * AssignToProjectsDialog — add ONE employee or contact to MANY projects at once.
 * Used by the Employee and Contact "Projects" tabs.
 *
 * The backend replays the Teams tab's own save for each project, so the audit trail
 * and roster rules match adding the person by hand. For an employee, a project whose
 * execution team does not include them is flagged here, and saving asks for
 * confirmation before adding them as an ad-hoc member.
 */
export interface AssignToProjectsDialogProps {
    open: boolean;
    onClose: () => void;
    target: AssignTarget;
    /** Who is being added, for the header ("Manoj Shirke"). */
    name: string;
    /** Called after at least one project was updated. */
    onAssigned: () => void;
}


export const AssignToProjectsDialog: React.FC<AssignToProjectsDialogProps> = ({ open, onClose, target, name, onAssigned }) => {
    const isEmployee = 'employeeId' in target;
    const targetId = isEmployee ? target.employeeId : target.contactId;

    const [projects, setProjects] = useState<AssignableProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [startDate, setStartDate] = useState(dayjs().format(DATE_FORMATS.WIRE));
    const [saving, setSaving] = useState(false);
    // Already-added projects are hidden by default — they're the bulk of the list and can't be picked.
    const [showAdded, setShowAdded] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelected(new Set());
        setSearch('');
        setLoading(true);
        getAssignableProjects(target)
            .then(setProjects)
            .catch(() => setProjects([]))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, targetId]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        // Selected → already added → in the team but not yet added → the rest.
        const rank = (p: AssignableProject) =>
            selected.has(p.id) ? 0 : p.alreadyAdded ? 1 : p.inTeam ? 2 : 3;
        // Trailing number of "WT/PROJECT/26-27/771"; unnumbered projects sort last.
        const num = (p: AssignableProject) => Number(p.projectNumber?.match(/(\d+)\s*$/)?.[1] ?? -1);
        return projects
            .filter((p) => showAdded || !p.alreadyAdded)
            .filter((p) => !q
                || p.title?.toLowerCase().includes(q)
                || (p.projectNumber ?? '').toLowerCase().includes(q)
                || (p.teamName ?? '').toLowerCase().includes(q))
            .sort((a, b) => rank(a) - rank(b) || num(b) - num(a));
    }, [projects, search, selected, showAdded]);
    const addedCount = projects.filter((p) => p.alreadyAdded).length;

    const toggle = (id: string) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const selectableVisible = rows.filter((p) => !p.alreadyAdded);
    const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((p) => selected.has(p.id));
    const toggleAllVisible = () => setSelected((prev) => {
        const next = new Set(prev);
        selectableVisible.forEach((p) => (allVisibleSelected ? next.delete(p.id) : next.add(p.id)));
        return next;
    });

    const save = async () => {
        const picked = projects.filter((p) => selected.has(p.id));
        if (!picked.length || !startDate) return;

        const outside = isEmployee ? picked.filter((p) => p.inTeam === false) : [];
        if (outside.length) {
            const list = outside.slice(0, 8).map((p) => `<li><b>${esc(p.title)}</b> — team ${esc(p.teamName ?? '')}</li>`).join('');
            const more = outside.length > 8 ? `<li>…and ${outside.length - 8} more</li>` : '';
            const ok = await confirmDialog({
                icon: 'warning',
                title: `${name} is not in the team`,
                html: `${esc(name)} is not a member of the execution team on ${outside.length} of the selected project(s):`
                    + `<ul style="text-align:left;margin:8px 0">${list}${more}</ul>Add them to these projects anyway (as an ad-hoc member)?`,
                confirmText: 'Add anyway',
            });
            if (!ok) return;
        }

        setSaving(true);
        try {
            const { added, failed } = await assignToProjects(target, picked.map((p) => p.id), startDate);
            if (added.length) onAssigned();
            if (failed.length) {
                const titleOf = (id: string) => projects.find((p) => p.id === id)?.title ?? id;
                await alertDialog({
                    icon: 'warning',
                    title: `Added to ${added.length}, ${failed.length} failed`,
                    // Values ARE escaped — every one goes through esc(). safeHtml cannot express
                    // this shape because the <li> tags are GENERATED per row, and a tagged template
                    // would escape them into visible text. Escaping the parts and joining is the
                    // correct form here. See ui/safeHtml.ts → "WHAT IT IS NOT".
                    // eslint-disable-next-line no-restricted-syntax
                    html: `<ul style="text-align:left">${failed.map((f) => `<li><b>${esc(titleOf(f.id))}</b>: ${esc(f.message)}</li>`).join('')}</ul>`,
                });
            } else {
                toast({ icon: 'success', title: `Added to ${added.length} project(s)` });
            }
            onClose();
        } catch (e: any) {
            alertDialog({ icon: 'error', title: 'Could not add to projects', text: e?.response?.data?.message || 'Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            scrollBody={false}
            header={
                <GlassHeader
                    title="Add to projects"
                    subtitle={`${name} — pick the projects to add them to (${isEmployee ? 'internal' : 'external'} team)`}
                    onClose={onClose}
                    icon={<KTIcon iconName="briefcase" className="fs-2 text-white" />}
                />
            }
        >
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-2 px-3 sm:px-5 pt-3 pb-2.5 border-b border-slate-100">
                <div className="flex grow items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <KTIcon iconName="magnifier" className="fs-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by project, number or team…"
                        className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
                    />
                </div>
                <div className="sm:w-48 shrink-0">
                    <WtDateField label="Start date" value={startDate} onChange={setStartDate} required />
                </div>
            </div>

            <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 sm:px-5 py-2 text-[12px] text-slate-500">
                <WtButton inverted onClick={toggleAllVisible} disabled={!selectableVisible.length}>
                    {allVisibleSelected ? 'Clear selection' : `Select all (${selectableVisible.length})`}
                </WtButton>
                <WtButton inverted onClick={() => setShowAdded((v) => !v)} disabled={!addedCount} aria-pressed={showAdded}>
                    {showAdded ? `Hide already added (${addedCount})` : `Show already added (${addedCount})`}
                </WtButton>
                <span className="ml-auto">{rows.length} project(s)</span>
            </div>

            <div className="grow overflow-y-auto px-3 sm:px-5 pb-3">
                {loading ? (
                    <div className="py-14 text-center text-sm text-slate-400">Loading projects…</div>
                ) : rows.length === 0 ? (
                    <div className="py-14 text-center text-sm text-slate-400">No projects found{search ? ` matching "${search}"` : ''}.</div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {rows.map((p) => {
                            const isSel = selected.has(p.id);
                            return (
                                <div
                                    key={p.id}
                                    role="checkbox"
                                    aria-checked={p.alreadyAdded || isSel}
                                    aria-disabled={p.alreadyAdded}
                                    tabIndex={p.alreadyAdded ? -1 : 0}
                                    onClick={() => !p.alreadyAdded && toggle(p.id)}
                                    onKeyDown={(e) => {
                                        if (!p.alreadyAdded && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(p.id); }
                                    }}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg border px-3 py-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-200',
                                        p.alreadyAdded ? 'opacity-60 cursor-default border-slate-200' : 'cursor-pointer',
                                        !isSel && !p.alreadyAdded && 'border-slate-200 bg-white hover:bg-slate-50/60',
                                    )}
                                    style={isSel ? { backgroundColor: TRIO.blue.bg, borderColor: TRIO.blue.c } : undefined}
                                >
                                    <span
                                        className={cn('grid place-items-center w-5 h-5 rounded-md border shrink-0', !isSel && !p.alreadyAdded && 'border-slate-300 text-transparent')}
                                        style={isSel || p.alreadyAdded ? { backgroundColor: p.alreadyAdded ? TRIO.slate.c : TRIO.blue.c, borderColor: 'transparent' } : undefined}
                                    >
                                        <KTIcon iconName="check" className="fs-7 text-white" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="m-0 text-[13px] font-semibold text-slate-800 truncate" title={p.title}>{p.title}</p>
                                        <p className="m-0 text-[11px] text-slate-400 truncate">
                                            {[p.projectNumber, p.status?.name, p.teamName && `Team: ${p.teamName}`].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    {p.alreadyAdded ? (
                                        <StatusBadge trio={TRIO.green} label="Already added" />
                                    ) : isEmployee && p.inTeam ? (
                                        <StatusBadge trio={TRIO.blue} label="In team" title={`Member of ${p.teamName}`} />
                                    ) : isEmployee && p.inTeam === false ? (
                                        <StatusBadge trio={TRIO.amber} label="Not in team" title={`Not a member of ${p.teamName}`} />
                                    ) : isEmployee && p.inTeam === null ? (
                                        <StatusBadge trio={TRIO.slate} label="No team" />
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="shrink-0 flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 border-t border-slate-100 bg-white/60">
                <span className="text-[12px] text-slate-500 truncate">{showAdded ? "Projects they are already on can't be picked." : `${addedCount} project(s) they are already on are hidden.`}</span>
                <WtButton onClick={save} disabled={saving || !selected.size || !startDate}>
                    {saving ? 'Adding…' : `Add to ${selected.size} project(s)`}
                </WtButton>
            </div>
        </GlassDialog>
    );
};

export default AssignToProjectsDialog;
