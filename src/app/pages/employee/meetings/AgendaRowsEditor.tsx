import { Plus } from 'lucide-react';
import type { AutocompleteProps } from '@mui/material';
import { Button } from '@/ds/ui/button';
import { Textarea } from '@/ds/ui/textarea';
import { ActionIconButton } from '@app/modules/common/components/ui';
import TaskPathSelect, { type TaskPathOption } from '../tasks/components/TaskPathSelect';

/** One agenda line being written: the picked task (`label`) and its description (`remarks`). */
export interface AgendaRow {
    id: string;
    label: string;
    remarks?: string;
}

/** Real task picks only — blank rows are `new:`, unmapped legacy lines are `legacy:`. */
export const isAgendaTask = (id: string) => !id.startsWith('new:') && !id.startsWith('legacy:');

export const blankAgendaRow = (): AgendaRow => ({ id: `new:${crypto.randomUUID()}`, label: '' });

/** The agenda-items API payload; rows with no task picked are skipped. */
export const agendaRowsPayload = (rows: AgendaRow[]) =>
    rows.filter((r) => r.label).map((r) => ({
        description: r.label,
        remarks: r.remarks?.trim() || null,
        itemMode: 'DISCUSSION',
    }));

const COLS = 'grid grid-cols-[2.5rem_minmax(0,3fr)_minmax(0,7fr)_2.75rem] gap-3 px-3';

/**
 * The agenda rows editor — No. / Tasks / Description + a full-width "Add agenda".
 * Shared by the New Meeting form and the Agenda tab, so both write agenda the same way.
 */
export function AgendaRowsEditor({
    rows, onChange, options, loading, showDescription = true, disabled, slotProps,
}: {
    rows: AgendaRow[];
    onChange: (rows: AgendaRow[]) => void;
    options: TaskPathOption[];
    loading?: boolean;
    showDescription?: boolean;
    disabled?: boolean;
    slotProps?: AutocompleteProps<TaskPathOption, false, false, false>['slotProps'];
}) {
    const patch = (id: string, next: Partial<AgendaRow>) =>
        onChange(rows.map((r) => (r.id === id ? { ...r, ...next } : r)));
    const taken = new Set(rows.map((r) => r.id));

    return (
        <div className="overflow-x-auto rounded-xl border border-border">
            {rows.length > 0 && (
                <div className="min-w-[560px]">
                    <div className={`${COLS} items-center border-b border-border py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground`}>
                        <span>No.</span>
                        <span>Tasks</span>
                        <span>{showDescription ? 'Description' : ''}</span>
                        <span />
                    </div>
                    {rows.map((row, i) => (
                        <div key={row.id} className={`${COLS} items-start border-b border-border bg-muted/40 py-3 last:border-b-0`}>
                            <span className="pt-2 text-sm text-muted-foreground">{i + 1}</span>
                            <div className="min-w-0">
                                <TaskPathSelect
                                    value={isAgendaTask(row.id) ? row.id : ''}
                                    options={options.filter((o) => o.id === row.id || !taken.has(o.id))}
                                    onChange={(opt) => opt && patch(row.id, { id: opt.id, label: opt.name })}
                                    label=""
                                    placeholder={row.label || 'Pick a topic'}
                                    wrap
                                    disabled={disabled}
                                    loading={loading}
                                    slotProps={slotProps}
                                />
                            </div>
                            {showDescription ? (
                                <Textarea
                                    aria-label={`Description for ${row.label || `row ${i + 1}`}`}
                                    placeholder="Description"
                                    rows={1}
                                    className="min-h-10 rounded-md bg-background py-2"
                                    maxLength={1500}
                                    disabled={disabled}
                                    value={row.remarks ?? ''}
                                    onChange={(e) => patch(row.id, { remarks: e.target.value })}
                                />
                            ) : <span />}
                            <ActionIconButton
                                iconName="trash"
                                tone="danger"
                                size="sm"
                                title="Remove agenda item"
                                disabled={disabled}
                                onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                            />
                        </div>
                    ))}
                </div>
            )}
            <div className={rows.length ? 'border-t border-border p-3' : 'p-3'}>
                <Button
                    type="button"
                    variant="tinted"
                    size="lg"
                    disabled={disabled}
                    onClick={() => onChange([...rows, blankAgendaRow()])}
                    className="w-full border-dashed font-semibold"
                >
                    <Plus data-icon="inline-start" />
                    Add agenda
                </Button>
            </div>
        </div>
    );
}
