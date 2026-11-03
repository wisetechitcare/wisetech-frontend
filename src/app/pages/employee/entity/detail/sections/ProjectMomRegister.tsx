import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Menu, MenuItem, Typography, darken, lighten, useTheme } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import type { RootState } from '@redux/store';
import { DetailCard } from '@app/modules/detail-page/DetailPageComponents';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { StatusPill, toast, type WtSelectOption } from '@app/modules/common/components/ui';
import { formatDate } from '@utils/dateFormats';
import { getProjectMomRegister, updateAgendaItem, type MomRegisterRow } from '@services/meetingAgendaMom';
import { useAgendaStatusOptions } from '@app/pages/employee/meetings/useAgendaStatusOptions';
import { EmptyState } from '../widgets';
import { DASH } from '../entityViewModel';
import { daysOpen } from './momDays';

/**
 * Opaque row shades from a status colour — opaque so cells can simply inherit them and pinned
 * columns match. Light: mixed toward white; dark: toward black. Null when the colour is missing or
 * not something MUI can parse (it throws), so a bad Configure value leaves a plain row, not a crash.
 */
const rowTint = (c: string | null | undefined, dark: boolean) => {
    if (!c) return null;
    try {
        return dark
            ? { base: darken(c, 0.78), hover: darken(c, 0.66), accent: c }
            : { base: lighten(c, 0.88), hover: lighten(c, 0.8), accent: c };
    } catch {
        return null;
    }
};

/**
 * The project's MoM register — every Minutes-of-Meeting line across its meetings, one row each.
 * Sits under the project's meeting calendar; refetches whenever that list reloads.
 */
const ProjectMomRegister: React.FC<{ projectId: string; reloadToken?: number; canEdit?: boolean }> = ({
    projectId, reloadToken, canEdit = false,
}) => {
    const currentUserId = useSelector((s: RootState) => s.auth?.currentUser?.id);
    const dark = useTheme().palette.mode === 'dark';
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
            Cell: ({ row }: any) => formatDate(row.original.meetingDate),
            size: 110,
        },
        { accessorKey: 'momNo', header: 'MoM No', size: 90 },
        { accessorKey: 'purpose', header: 'Purpose', Cell: ({ cell }: any) => cell.getValue() || DASH },
        {
            accessorKey: 'description',
            header: 'Agenda item',
            Cell: ({ cell }: any) => <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{cell.getValue()}</Typography>,
        },
        { accessorKey: 'note', header: 'Note', Cell: ({ cell }: any) => cell.getValue() || DASH },
        { accessorKey: 'assignee', header: 'Assignee', Cell: ({ cell }: any) => cell.getValue() || DASH },
        {
            id: 'openDate',
            header: 'Open date',
            accessorFn: (r: MomRegisterRow) => r.openDate,
            Cell: ({ row }: any) => formatDate(row.original.openDate),
            size: 110,
        },
        {
            id: 'closeDate',
            header: 'Close date',
            accessorFn: (r: MomRegisterRow) => r.closeDate ?? '',
            Cell: ({ row }: any) => formatDate(row.original.closeDate),
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
            Cell: ({ row }: any) => {
                const r: MomRegisterRow = row.original;
                const editable = canEdit && statusOptions.length > 0;
                return (
                    <StatusPill
                        label={r.statusLabel}
                        color={r.statusColor}
                        disabled={busyId === r.id}
                        onClick={editable ? (e) => setMenu({ anchor: e.currentTarget, row: r }) : undefined}
                        endIcon={editable ? <ExpandMoreRounded sx={{ fontSize: 16 }} /> : undefined}
                        aria-label={editable ? `Status: ${r.statusLabel}. Change status of ${r.description}` : undefined}
                        aria-haspopup={editable ? 'menu' : undefined}
                    />
                );
            },
            size: 150,
        },
    ], [canEdit, statusOptions, busyId]);

    return (
        <DetailCard
            title="Minutes of Meeting"
            subtitle={loading ? 'Loading…' : `${rows.length} line${rows.length === 1 ? '' : 's'} across this project's meetings`}
            icon="bi bi-journal-text"
            accentColor="purple"
        >
            {error ? (
                <EmptyState icon="bi bi-exclamation-circle" title="Could not load the MoM register" message="Reload the page to try again." />
            ) : !loading && rows.length === 0 ? (
                <EmptyState
                    icon="bi bi-journal-text"
                    title="No MoM lines yet"
                    message="Lines converted into a meeting's Minutes of Meeting appear here, one row each."
                />
            ) : (
                <MaterialTable
                    tableName="ProjectMomRegister"
                    employeeId={currentUserId}
                    data={rows}
                    columns={columns}
                    isLoading={loading}
                    defaultSorting={[{ id: 'meetingDate', desc: true }]}
                    exportName="mom-register"
                    enableColumnResizing
                    layoutMode="semantic"
                    muiTableContainerProps={{ sx: { maxHeight: 600, overflowX: 'auto' } }}
                    // Same look as the Leads table: a light shade of the status colour + a solid left accent.
                    //
                    // The ROW holds one OPAQUE shade and every cell inherits it. Three rules fight a
                    // hovered row — main.css `tr:hover td { #F8FAFC !important }` (0,3,2), the engine's
                    // `&:hover td`, and MRT's grey `td:after` overlay — so the selectors below are tripled
                    // (`&&&` → 0,4,x) to outrank all of them. Cell transitions are off: a cell easing
                    // toward #F8FAFC is what left hovered cells stuck white.
                    muiTableProps={{
                        muiTableBodyRowProps: ({ row }: any) => {
                            const tint = rowTint(row.original?.statusColor, dark);
                            if (!tint) return {};
                            return {
                                sx: {
                                    '&&&': { backgroundColor: `${tint.base} !important` },
                                    '&&&:hover': { backgroundColor: `${tint.hover} !important` },
                                    '&&& td.MuiTableCell-body': { backgroundColor: 'inherit !important', transition: 'none' },
                                    '&&&:hover td:after': { backgroundColor: 'transparent' },
                                    '&&& td.MuiTableCell-body:first-of-type': { borderLeft: `3px solid ${tint.accent} !important` },
                                },
                            };
                        },
                    }}
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
