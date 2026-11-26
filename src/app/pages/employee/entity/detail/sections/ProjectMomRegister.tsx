import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';
import { DetailCard } from '@app/modules/detail-page/DetailPageComponents';
import { StatusPill, toast, type WtSelectOption } from '@app/modules/common/components/ui';
import { EmptyState } from '@/ds/patterns/empty-state';
import { ChevronDown, CircleAlert, NotebookText } from 'lucide-react';
import { formatDate } from '@utils/dateFormats';
import { getProjectMomRegister, updateAgendaItem, type MomRegisterRow } from '@services/meetingAgendaMom';
import { useAgendaStatusOptions } from '@app/pages/employee/meetings/useAgendaStatusOptions';
import { DASH } from '../entityViewModel';
import { daysOpen } from './momDays';

/**
 * The project's MoM register — every Minutes-of-Meeting line across its meetings, one row each.
 * Sits under the project's meeting calendar; refetches whenever that list reloads.
 */
const ProjectMomRegister: React.FC<{ projectId: string; reloadToken?: number; canEdit?: boolean }> = ({
    projectId, reloadToken, canEdit = false,
}) => {
    const [rows, setRows] = useState<MomRegisterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    // The status menu, anchored to the pill that opened it.
    const [menu, setMenu] = useState<{ anchor: HTMLElement; row: MomRegisterRow } | null>(null);
    const statusOptions = useAgendaStatusOptions();

    // Only the newest request may write — a slow older one must not overwrite a fresher list.
    const latest = useRef(0);
    const load = useCallback(async (silent = false) => {
        const req = ++latest.current;
        if (!silent) setLoading(true);
        try {
            const r = await getProjectMomRegister(projectId);
            if (req === latest.current) { setRows(r); setError(false); }
        } catch {
            if (req === latest.current) setError(true);
        } finally {
            if (req === latest.current) setLoading(false);
        }
    }, [projectId]);
    useEffect(() => { void load(); }, [load, reloadToken]);

    /**
     * Saved straight away — one field, one deliberate pick. The server stamps/clears the close date
     * when a line enters/leaves Closed, so the row is reloaded rather than guessed at here. The API
     * decides who may change a MoM (organizer or project manager); a refusal comes back in its words.
     */
    const changeStatus = async (row: MomRegisterRow, opt: WtSelectOption) => {
        if (opt.value === row.status) return;
        setBusyId(row.id);
        setRows((rs) => rs.map((r) => (r.id === row.id
            ? { ...r, status: opt.value, statusLabel: opt.label, statusColor: opt.color ?? r.statusColor }
            : r)));
        try {
            await updateAgendaItem(row.meetingId, row.id, { status: opt.value });
            toast({ icon: 'success', title: `Status set to ${opt.label}` });
        } catch (e: any) {
            toast({ icon: 'error', title: 'Could not change the status', text: e?.response?.data?.message });
        } finally {
            await load(true);
            setBusyId(null);
        }
    };

    const columns = useMemo(() => [
        {
            id: 'meetingDate',
            header: 'Date',
            accessorFn: (r: MomRegisterRow) => r.meetingDate,
            cell: ({ row }: any) => formatDate(row.original.meetingDate),
            size: 110,
        },
        { accessorKey: 'momNo', header: 'MoM No', size: 90 },
        { accessorKey: 'purpose', header: 'Purpose', cell: ({ cell }: any) => cell.getValue() || DASH },
        {
            accessorKey: 'description',
            header: 'Agenda item',
            cell: ({ cell }: any) => <span className="text-[13px] font-semibold">{cell.getValue()}</span>,
        },
        { accessorKey: 'note', header: 'Note', cell: ({ cell }: any) => cell.getValue() || DASH },
        { accessorKey: 'assignee', header: 'Assignee', cell: ({ cell }: any) => cell.getValue() || DASH },
        {
            id: 'openDate',
            header: 'Open date',
            accessorFn: (r: MomRegisterRow) => r.openDate,
            cell: ({ row }: any) => formatDate(row.original.openDate),
            size: 110,
        },
        {
            id: 'closeDate',
            header: 'Close date',
            accessorFn: (r: MomRegisterRow) => r.closeDate ?? '',
            cell: ({ row }: any) => formatDate(row.original.closeDate),
            size: 110,
        },
        {
            id: 'days',
            header: 'Days',
            // Still-open lines keep counting to today.
            accessorFn: (r: MomRegisterRow) => daysOpen(r.openDate, r.closeDate),
            size: 80,
        },
        {
            accessorKey: 'statusLabel',
            header: 'Status',
            // The Leads table's badge (kit StatusPill). Editable → the pill itself opens the status menu.
            cell: ({ row }: any) => {
                const r: MomRegisterRow = row.original;
                const editable = canEdit && statusOptions.length > 0;
                return (
                    <StatusPill
                        label={r.statusLabel}
                        color={r.statusColor}
                        disabled={busyId === r.id}
                        onClick={editable ? (e) => setMenu({ anchor: e.currentTarget, row: r }) : undefined}
                        endIcon={editable ? <ChevronDown aria-hidden className="size-4" /> : undefined}
                        aria-label={editable ? `Status: ${r.statusLabel}. Change status of ${r.description}` : undefined}
                        aria-haspopup={editable ? 'menu' : undefined}
                    />
                );
            },
            size: 150,
        },
    ] as ColumnDef<MomRegisterRow, any>[], [canEdit, statusOptions, busyId]);

    return (
        <DetailCard
            title="Minutes of Meeting"
            subtitle={loading ? 'Loading…' : `${rows.length} line${rows.length === 1 ? '' : 's'} across this project's meetings`}
            icon="bi bi-journal-text"
            accentColor="purple"
        >
            {error ? (
                <EmptyState
                    icon={<CircleAlert aria-hidden />}
                    title="Could not load the MoM register"
                    description="Reload the page to try again."
                />
            ) : !loading && rows.length === 0 ? (
                <EmptyState
                    icon={<NotebookText aria-hidden />}
                    title="No MoM lines yet"
                    description="Lines converted into a meeting's Minutes of Meeting appear here, one row each."
                />
            ) : (
                <DataTable
                    caption="Minutes of Meeting Register"
                    stateKey="ProjectMomRegister"
                    data={rows}
                    columns={columns}
                    getRowId={(r) => r.id}
                    loading={loading}
                    initialSorting={[{ id: 'meetingDate', desc: true }]}
                    rowTone={(r) => r.statusColor || undefined}
                    virtualized
                    virtualMaxHeight={600}
                    toolbar={(ctx) => (
                        <DataTableExport columns={columns} ctx={ctx} filename="mom-register" />
                    )}
                />
            )}

            <Menu
                anchorEl={menu?.anchor ?? null}
                open={!!menu}
                onClose={() => setMenu(null)}
                slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 2 } } }}
            >
                {statusOptions.map((o) => (
                    <MenuItem
                        key={o.value}
                        selected={o.value === menu?.row.status}
                        onClick={() => {
                            const row = menu?.row;
                            setMenu(null);
                            if (row) void changeStatus(row, o);
                        }}
                        sx={{ py: 0.75 }}
                    >
                        <StatusPill label={o.label} color={o.color} />
                    </MenuItem>
                ))}
            </Menu>
        </DetailCard>
    );
};

export default ProjectMomRegister;
