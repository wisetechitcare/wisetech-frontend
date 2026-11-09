import dayjs from 'dayjs';
import { FileText, FileX } from 'lucide-react';
import { SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { Button } from '@/ds/ui/button';
import OverLimitChip from './OverLimitChip';
import { fmtAmount, NO_VALUE, projectTitle } from '../utils/reimbursementFormat';
import { currencyPrefix } from '@utils/currency';

/**
 * The expense-line columns of a batch (date … receipt), for the design system's DataTable.
 *
 * One definition: the employee's batch detail uses it today, and the approver's batch view should take it
 * when it moves to the kit, so a batch's lines read the same to both. The caller supplies the resolvers (it
 * owns its lookups instance) and appends its own columns (status, note, actions).
 *
 * Every column has `meta.label` (the Columns menu and Export use it) and, where the cell decorates a value,
 * `meta.exportValue` so a file holds the plain text.
 */

export interface LineColumnResolvers {
    resolveClientType: (id: string | null | undefined) => string;
    resolveClientCompany?: (id: string | null | undefined) => string;
    resolveProject?: (id: string | null | undefined) => string;
}

export interface LineColumnOptions {
    /** Footer total for the amount column; omitted = no total. */
    total?: number;
    /** Opens a receipt. Without it the receipt column shows whether one is attached, no button. */
    onPreview?: (url: string) => void;
    /** "Hide amounts" class (useSensitiveData().cls) for the amount cells. */
    sensitiveCls?: string;
}

const text = (v: unknown) => (v == null || v === '' ? NO_VALUE : String(v));

export const buildReimbursementLineColumns = (
    { resolveClientType, resolveClientCompany, resolveProject }: LineColumnResolvers,
    { total, onPreview, sensitiveCls = '' }: LineColumnOptions = {},
): ColumnDef<any, any>[] => [
    {
        accessorKey: 'expenseDate',
        meta: { label: 'Date', exportValue: (r: any) => (r.expenseDate ? dayjs(r.expenseDate).format('DD MMM YYYY') : '') },
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
        cell: ({ row }) => {
            const d = row.original.expenseDate;
            if (!d) return <span className="text-muted-foreground">{NO_VALUE}</span>;
            return (
                <div className="whitespace-nowrap">
                    <div className="font-semibold text-foreground">{dayjs(d).format('DD MMM YYYY')}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{dayjs(d).format('dddd')}</div>
                </div>
            );
        },
        footer: () => (total === undefined ? null : <span className="uppercase">Total</span>),
    },
    {
        id: 'clientType',
        accessorFn: (r: any) => resolveClientType(r.clientTypeId),
        meta: { label: 'Company type' },
        header: 'Company Type',
        cell: ({ getValue }) => text(getValue()),
    },
    {
        id: 'client',
        accessorFn: (r: any) => r.clientCompany?.companyName ?? resolveClientCompany?.(r.clientCompanyId) ?? '',
        meta: { label: 'Company' },
        header: 'Company',
        cell: ({ getValue }) => text(getValue()),
    },
    {
        // The whole chain: lead → project → resolver. Reading only `project.title` is why this column printed
        // N/A on rows that had a perfectly good project (P1-5) — creation resolves the project to a lead.
        id: 'project',
        accessorFn: (r: any) => projectTitle(r, resolveProject),
        meta: { label: 'Project' },
        header: ({ column }) => <SortableHeader column={column} title="Project" />,
        cell: ({ getValue }) => <span className="block max-w-72 whitespace-normal">{text(getValue())}</span>,
    },
    {
        id: 'type',
        accessorFn: (r: any) => r.reimbursementType?.type ?? '',
        meta: { label: 'Category' },
        header: ({ column }) => <SortableHeader column={column} title="Category" />,
        cell: ({ getValue }) => text(getValue()),
    },
    {
        accessorKey: 'amount',
        meta: { label: 'Amount', exportValue: (r: any) => fmtAmount(r.amount) },
        header: ({ column }) => <SortableHeader column={column} title="Amount" />,
        cell: ({ row }) => (
            // Colour alone is not a status — the chip carries the word too.
            <span className="inline-flex items-center gap-2">
                <span className={`tabular font-semibold text-foreground ${sensitiveCls}`}>{currencyPrefix()}{fmtAmount(row.original.amount)}</span>
                {row.original.isExceedingLimit && <OverLimitChip />}
            </span>
        ),
        footer: () => (total === undefined ? null : <span className={`tabular ${sensitiveCls}`}>{currencyPrefix()}{fmtAmount(total)}</span>),
    },
    {
        accessorKey: 'fromLocation',
        meta: { label: 'From' },
        header: 'From',
        cell: ({ row }) => text(row.original.fromLocation),
    },
    {
        accessorKey: 'toLocation',
        meta: { label: 'To' },
        header: 'To',
        cell: ({ row }) => text(row.original.toLocation),
    },
    {
        accessorKey: 'description',
        meta: { label: 'Remark' },
        header: 'Remark',
        cell: ({ row }) => <span className="block max-w-56 whitespace-normal">{text(row.original.description)}</span>,
    },
    {
        id: 'document',
        enableSorting: false,
        meta: { label: 'Receipt', export: false },
        header: 'Receipt',
        cell: ({ row }) => {
            const url = row.original.document as string | null;
            return (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!url || !onPreview}
                    aria-label={url ? 'Preview receipt' : 'No receipt attached'}
                    title={url ? 'Preview receipt' : 'No receipt attached'}
                    onClick={() => { if (url) onPreview?.(url); }}
                >
                    {url ? <FileText aria-hidden className="text-primary" /> : <FileX aria-hidden className="text-muted-foreground" />}
                </Button>
            );
        },
    },
];
