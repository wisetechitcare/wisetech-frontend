import { useMemo } from 'react';
import { FolderKanban } from 'lucide-react';
import { cn } from '@/ds/lib/utils';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { EmptyState } from '@/ds/patterns/empty-state';
import { SectionHeader } from '@/ds/patterns/section-header';
import { DataTableExport } from '@app/modules/common/components/table/DataTableExport';
import { IReimbursementsFetch } from '@models/employee';
import { summariseReimbursements } from '../../utils/reimbursementSummary';
import { formatMoney, NO_VALUE, projectTitle } from '../../utils/reimbursementFormat';

/**
 * What each project has cost in reimbursements.
 *
 * The module could only ever answer "what has this EMPLOYEE claimed". Expenses have carried a
 * project since the beginning — every line has a lead, and the bill PDF prints it — but nothing
 * grouped by it, so the one question a project manager actually asks had no screen.
 *
 * Grouped client-side from the rows the parent already fetched. It used to be its own tab with its
 * own period toolbar and its own copy of the same fetch, which meant two requests for identical
 * data and two period selectors that could drift out of step. It now renders under the employee
 * table on Reimbursement Details and reads the parent's period.
 *
 * There is no budget concept anywhere in the system, so this reports spend, not variance. A
 * "remaining" column would need a number nobody has entered.
 *
 * The design system's DataTable (search, sort, columns, export, footer totals); no MaterialTable.
 */

interface ProjectRollup {
    projectId: string;
    projectName: string;
    employees: number;
    totalRequests: number;
    totalAmount: number;
    approvedAmount: number;
    pendingAmount: number;
    paidAmount: number;
    outstandingAmount: number;
}

interface ByProjectProps {
    rows: IReimbursementsFetch[];
    loading: boolean;
    periodLabel: string;
}

/** Rows with no project at all are their own bucket, not hidden — 80% of history has none. */
const UNASSIGNED = '__unassigned__';

/** A money cell in its status colour (the charts' colours), right-aligned and tabular. */
const money = (value: number, tone?: string) => (
    <span className={cn('tabular block text-right font-semibold', tone)}>{formatMoney(value)}</span>
);
const count = (value: number) => <span className="tabular block text-right">{value}</span>;

function ByProject({ rows, loading, periodLabel }: ByProjectProps) {
    const rollups = useMemo<ProjectRollup[]>(() => {
        const byProject = new Map<string, { name: string; lines: IReimbursementsFetch[]; employees: Set<string> }>();

        for (const row of rows) {
            const id = (row as any).leadId || row.projectId || UNASSIGNED;
            const name = id === UNASSIGNED ? 'No project assigned' : projectTitle(row as any);
            if (!byProject.has(id)) byProject.set(id, { name, lines: [], employees: new Set() });
            const entry = byProject.get(id)!;
            entry.lines.push(row);
            if (row.employeeId) entry.employees.add(row.employeeId);
            // A project's name can resolve on a later row than the first — take the best we see.
            if (entry.name === NO_VALUE && name !== NO_VALUE) entry.name = name;
        }

        return [...byProject.entries()]
            .map(([projectId, { name, lines, employees }]) => {
                // The same aggregator both admin tables use, so a project total and an employee
                // total can never disagree about what "approved" means.
                const s = summariseReimbursements(lines as any[]);
                return {
                    projectId,
                    projectName: name,
                    employees: employees.size,
                    totalRequests: s.totalRequests,
                    totalAmount: s.totalAmount,
                    approvedAmount: s.approvedAmount,
                    pendingAmount: s.pendingAmount,
                    paidAmount: s.paidAmount,
                    outstandingAmount: s.remainingAmount,
                };
            })
            .sort((a, b) => b.totalAmount - a.totalAmount);   // biggest spend first
    }, [rows]);

    const totals = useMemo(() => summariseReimbursements(rows as any[]), [rows]);

    const columns = useMemo<ColumnDef<ProjectRollup, any>[]>(() => [
        {
            accessorKey: 'projectName',
            meta: { label: 'Project' },
            header: ({ column }) => <SortableHeader column={column} title="Project" />,
            cell: ({ row }) => (
                <span className={cn('font-semibold', row.original.projectId === UNASSIGNED ? 'text-muted-foreground' : 'text-foreground')}>
                    {row.original.projectName}
                </span>
            ),
            footer: () => <span className="heading-case">Total</span>,
        },
        {
            accessorKey: 'employees',
            meta: { label: 'Employees', exportType: 'number' },
            header: ({ column }) => <SortableHeader column={column} title="Employees" />,
            cell: ({ row }) => count(row.original.employees),
        },
        {
            accessorKey: 'totalRequests',
            meta: { label: 'Requests', exportType: 'number', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Requests" />,
            cell: ({ row }) => count(row.original.totalRequests),
            footer: () => count(totals.totalRequests),
        },
        {
            accessorKey: 'totalAmount',
            meta: { label: 'Claimed', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Claimed" />,
            cell: ({ row }) => money(row.original.totalAmount, 'text-foreground'),
            footer: () => money(totals.totalAmount),
        },
        {
            accessorKey: 'approvedAmount',
            meta: { label: 'Approved', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Approved" />,
            cell: ({ row }) => money(row.original.approvedAmount, 'text-success-foreground'),
            footer: () => money(totals.approvedAmount, 'text-success-foreground'),
        },
        {
            accessorKey: 'pendingAmount',
            meta: { label: 'Awaiting Approval', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Awaiting Approval" />,
            cell: ({ row }) => money(row.original.pendingAmount, 'text-warning-foreground'),
            footer: () => money(totals.pendingAmount, 'text-warning-foreground'),
        },
        {
            accessorKey: 'paidAmount',
            meta: { label: 'Paid', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Paid" />,
            cell: ({ row }) => money(row.original.paidAmount, 'text-info-foreground'),
            footer: () => money(totals.paidAmount, 'text-info-foreground'),
        },
        {
            // Approved but not yet paid — what the project still owes, which is the number a
            // project manager is usually after.
            accessorKey: 'outstandingAmount',
            meta: { label: 'Still Owed', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Still Owed" />,
            cell: ({ row }) => money(row.original.outstandingAmount, 'text-primary'),
            footer: () => money(totals.remainingAmount, 'text-primary'),
        },
    ], [totals]);

    const filename = `reimbursements-by-project-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <section className="mt-8 space-y-3">
            <SectionHeader as="h3" title="By Project" description={`Cost per Project · ${periodLabel}`} />
            <DataTable
                caption="Reimbursements by project"
                columns={columns}
                data={rollups}
                getRowId={(r) => r.projectId}
                loading={loading}
                searchPlaceholder="Search projects"
                stateKey="reimbursement.details.by-project"
                // Phones: one card per project instead of an eight-column table scrolled sideways.
                renderCard={(r) => (
                    <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
                        <p data-slot="project-name" className={cn('m-0 font-semibold', r.projectId === UNASSIGNED ? 'text-muted-foreground' : 'text-foreground')}>{r.projectName}</p>
                        <p data-slot="project-meta" className="m-0 text-xs text-muted-foreground">
                            {r.employees} employee{r.employees === 1 ? '' : 's'} · {r.totalRequests} request{r.totalRequests === 1 ? '' : 's'}
                        </p>
                        <dl data-slot="amount-summary" className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                            {[
                                { label: 'Claimed', value: r.totalAmount, tone: 'text-foreground' },
                                { label: 'Approved', value: r.approvedAmount, tone: 'text-success-foreground' },
                                { label: 'Paid', value: r.paidAmount, tone: 'text-info-foreground' },
                                { label: 'Still Owed', value: r.outstandingAmount, tone: 'text-primary' },
                            ].map((f) => (
                                <div key={f.label} className="flex justify-between gap-2">
                                    <dt data-slot="amount-label" className="text-muted-foreground">{f.label}</dt>
                                    <dd data-slot="amount-value" className={cn('tabular m-0 font-semibold', f.tone)}>{formatMoney(f.value)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
                empty={
                    <EmptyState
                        size="sm"
                        icon={<FolderKanban aria-hidden />}
                        title={`No Reimbursements in ${periodLabel}`}
                        description="Projects appear here once an expense is claimed against them in this period."
                    />
                }
                toolbar={(ctx) => (
                    <DataTableExport
                        columns={columns}
                        ctx={ctx}
                        filename={filename}
                        title={`Reimbursements by Project — ${periodLabel}`}
                        subtitle="Claimed, approved, awaiting approval, paid and still owed per project"
                    />
                )}
            />
        </section>
    );
}

export default ByProject;
