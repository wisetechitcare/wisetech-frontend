import React, { useMemo, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import {
    GlassDialog,
    GlassHeader,
    WtButton,
    IconBox,
    cn,
    TRIO,
    type ToneName,
} from '@app/modules/common/components/ui/tw';

/**
 * EmployeeSelectionDialog — the shared, reusable employee-picker modal.
 *
 * A premium, fully-responsive MUI-kit (Tailwind re-platform) dialog: searchable
 * employee card grid, selected-first sort, count-aware save. Selection is
 * CONTROLLED by the parent so it works for both a plain multi-select (checkbox)
 * and a value-per-employee picker (e.g. a per-row time input) via `renderTrailing`.
 *
 * Use this instead of hand-rolling a bootstrap/inline-styled modal per feature.
 *
 * @example  Plain multi-select
 *   <EmployeeSelectionDialog
 *     open={open} onClose={close} title="Exclude from late deduction"
 *     employees={emps} selectedIds={ids} onToggle={toggle} onSave={save} />
 *
 * @example  Value-per-employee (time)
 *   <EmployeeSelectionDialog … renderTrailing={(e) => <input type="time" … />} />
 */

export interface EmployeeOption {
    id: string;
    name: string;
    designation?: string;
    avatar: string;
}

export interface EmployeeSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    /** KTIcon (duotone) name for the header tile. */
    icon?: string;
    /** Accent tone for selected cards + header tile. */
    tone?: ToneName;
    employees: EmployeeOption[];
    /** Currently-selected employee ids (controlled). */
    selectedIds: string[];
    /** Toggle an employee in/out of the selection. */
    onToggle: (id: string) => void;
    /** Trailing control for a SELECTED card (e.g. a time input). Defaults to a check pill. */
    renderTrailing?: (emp: EmployeeOption) => React.ReactNode;
    /** Helper text shown at the left of the footer. */
    footerNote?: React.ReactNode;
    onSave: () => void;
    saveDisabled?: boolean;
    /** Save button label prefix; the live count is appended. Default "Save Selection". */
    saveLabel?: string;
    /** Search placeholder. */
    searchPlaceholder?: string;
}

export const EmployeeSelectionDialog: React.FC<EmployeeSelectionDialogProps> = ({
    open,
    onClose,
    title,
    subtitle,
    icon = 'profile-circle',
    tone = 'blue',
    employees,
    selectedIds,
    onToggle,
    renderTrailing,
    footerNote,
    onSave,
    saveDisabled = false,
    saveLabel = 'Save Selection',
    searchPlaceholder = 'Search by name or designation…',
}) => {
    const [search, setSearch] = useState('');
    const trio = TRIO[tone];
    const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return employees
            .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.designation ?? '').toLowerCase().includes(q))
            .sort((a, b) => {
                const aSel = selected.has(a.id);
                const bSel = selected.has(b.id);
                if (aSel !== bSel) return aSel ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
    }, [employees, search, selected]);

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            header={
                <GlassHeader
                    title={title}
                    subtitle={subtitle}
                    onClose={onClose}
                    icon={<KTIcon iconName={icon} className="fs-2 text-white" />}
                />
            }
        >
            {/* Sticky search — flex row (no absolute icon), robust across widths */}
            <div className="shrink-0 px-3 sm:px-5 pt-3 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-colors">
                    <KTIcon iconName="magnifier" className="fs-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Scrollable card grid */}
            <div className="grow overflow-y-auto px-3 sm:px-5 py-3">
                {rows.length === 0 ? (
                    <div className="py-14 text-center text-sm text-slate-400">
                        No employees found{search ? ` matching "${search}"` : ''}.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rows.map((emp) => {
                            const isSel = selected.has(emp.id);
                            return (
                                <div
                                    key={emp.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onToggle(emp.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(emp.id); }
                                    }}
                                    className={cn(
                                        'group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer select-none outline-none transition-[background,border-color,box-shadow] duration-150',
                                        'focus-visible:ring-2 focus-visible:ring-blue-200',
                                        isSel ? 'shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60',
                                    )}
                                    style={isSel ? { backgroundColor: trio.bg, borderColor: trio.c } : undefined}
                                >
                                    <img
                                        src={emp.avatar}
                                        alt={emp.name}
                                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-white shadow-sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="m-0 text-[13px] font-semibold text-slate-800 truncate leading-tight" title={emp.name}>{emp.name}</p>
                                        {emp.designation && (
                                            <p className="m-0 text-[11px] font-medium text-slate-400 truncate leading-tight" title={emp.designation}>{emp.designation}</p>
                                        )}
                                    </div>

                                    {/* Trailing: custom control when selected (e.g. time picker), else a check/empty pill */}
                                    {isSel && renderTrailing ? (
                                        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="shrink-0">
                                            {renderTrailing(emp)}
                                        </div>
                                    ) : (
                                        <span
                                            className={cn(
                                                'grid place-items-center w-5 h-5 rounded-md border shrink-0 transition-colors',
                                                !isSel && 'border-slate-300 text-transparent',
                                            )}
                                            style={isSel ? { backgroundColor: trio.c, borderColor: trio.c } : undefined}
                                        >
                                            <KTIcon iconName="check" className="fs-7 text-white" />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 border-t border-slate-100 bg-white/60">
                <span className="text-[12px] text-slate-500 min-w-0 truncate">{footerNote}</span>
                <WtButton onClick={onSave} disabled={saveDisabled}>
                    {saveLabel} ({selectedIds.length})
                </WtButton>
            </div>
        </GlassDialog>
    );
};

export default EmployeeSelectionDialog;
