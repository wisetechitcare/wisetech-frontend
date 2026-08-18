import { MRT_ColumnDef } from 'material-react-table';
import { Tooltip } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { WtIconButton } from '@app/modules/common/components/ui/buttons';
import dayjs from 'dayjs';
import OverLimitChip from './OverLimitChip';
import { fmtAmount, NO_VALUE, projectTitle } from '../utils/reimbursementFormat';
import { ReimbursementLine } from '../utils/reimbursementTypes';

/**
 * The expense-line columns, shared by both batch detail modals.
 *
 * The two modals are NOT the same component — one does edit/delete/download-bill, the other does
 * approve/reject/bulk — but the table of lines inside them is identical: same ten columns, same
 * order, same renderers. Merging the modals behind a mode flag would produce a larger, more
 * conditional file than the two it replaced; merging the *table* removes the duplication that
 * actually existed.
 *
 * The caller supplies the resolvers (each modal owns its own lookups instance) and appends its
 * own action columns.
 */

export interface LineColumnResolvers {
    resolveClientType: (id: string | null | undefined) => string;
    resolveClientCompany?: (id: string | null | undefined) => string;
    resolveProject?: (id: string | null | undefined) => string;
}

export const buildReimbursementLineColumns = (
    { resolveClientType, resolveClientCompany, resolveProject }: LineColumnResolvers,
    /** Footer total for the amount column; omitted when the caller shows no footer. */
    detailTotal?: number,
): MRT_ColumnDef<any>[] => [
    {
        accessorKey: 'expenseDate',
        header: 'Date',
        size: 150,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
            const d = row.original.expenseDate;
            if (!d) return <span className="text-muted fs-7">{NO_VALUE}</span>;
            return (
                <div>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                        {dayjs(d).format('DD MMM YYYY')}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {dayjs(d).format('dddd')}
                    </div>
                </div>
            );
        },
        Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
    },
    {
        accessorKey: 'clientType',
        header: 'Company Type',
        enableColumnActions: false,
        Cell: ({ row }: any) => (
            <span className="text-dark fs-7">{resolveClientType(row.original.clientTypeId)}</span>
        ),
    },
    {
        accessorKey: 'client',
        header: 'Company',
        enableColumnActions: false,
        Cell: ({ row }: any) => (
            <span className="text-dark fs-7">
                {row.original.clientCompany?.companyName
                    ?? resolveClientCompany?.(row.original.clientCompanyId)
                    ?? NO_VALUE}
            </span>
        ),
    },
    {
        accessorKey: 'project',
        header: 'Project',
        enableColumnActions: false,
        // The whole chain: lead → project → resolver. Reading only `project.title` is why this
        // column printed N/A on rows that had a perfectly good project (P1-5) — creation resolves
        // the picked project to a lead and drops the original key.
        Cell: ({ row }: any) => (
            <span className="text-dark fs-7">{projectTitle(row.original, resolveProject)}</span>
        ),
    },
    {
        accessorKey: 'type',
        header: 'Category',
        enableColumnActions: false,
        Cell: ({ row }: any) => (
            <span className="text-dark fs-7">{row.original.reimbursementType?.type ?? NO_VALUE}</span>
        ),
    },
    {
        accessorKey: 'amount',
        header: 'Amount',
        enableColumnActions: false,
        Cell: ({ row }: any) => (
            <span className="d-inline-flex align-items-center gap-2">
                <span className="text-dark fw-bold fs-7">₹{fmtAmount(row.original.amount)}</span>
                {row.original.isExceedingLimit && <OverLimitChip />}
            </span>
        ),
        Footer: () =>
            detailTotal === undefined
                ? null
                : <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{fmtAmount(detailTotal)}</span>,
    },
    {
        accessorKey: 'fromLocation',
        header: 'From',
        enableColumnActions: false,
        Cell: ({ row }: any) => (
            <span className="text-dark fs-7">{row.original.fromLocation || NO_VALUE}</span>
        ),
    },
    {
        accessorKey: 'toLocation',
        header: 'To',
        enableColumnActions: false,
        Cell: ({ row }: any) => (
            <span className="text-dark fs-7">{row.original.toLocation || NO_VALUE}</span>
        ),
    },
    {
        accessorKey: 'description',
        header: 'Remark',
        enableColumnActions: false,
        Cell: ({ row }: any) => (
            <span className="text-dark fs-7">{row.original.description || NO_VALUE}</span>
        ),
    },
    {
        accessorKey: 'document',
        header: 'Receipt',
        size: 90,
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue, row }: any) => {
            const url = renderedCellValue as string | null;
            return (
                <Tooltip title={url ? 'Preview receipt' : 'No receipt attached'} arrow>
                    <span>
                        <WtIconButton
                            color={url ? '#2563eb' : '#94a3b8'}
                            disabled={!url}
                            title={url ? 'Preview receipt' : 'No receipt attached'}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (url) (row.original as any).__onPreview?.(url);
                            }}
                        >
                            <KTIcon iconName={url ? 'document' : 'cross-circle'} className="fs-4" />
                        </WtIconButton>
                    </span>
                </Tooltip>
            );
        },
    },
];

/** Attaches the preview callback each row's receipt button invokes. */
export const withPreviewHandler = <T extends ReimbursementLine>(
    rows: T[],
    onPreview: (url: string) => void,
): T[] => rows.map((r) => ({ ...r, __onPreview: onPreview }));
