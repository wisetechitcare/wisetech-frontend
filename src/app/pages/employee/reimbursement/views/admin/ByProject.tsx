import { useMemo } from 'react';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import ExportButton from '@app/modules/common/components/ExportButton';
import { MRT_ColumnDef } from 'material-react-table';
import { IReimbursementsFetch } from '@models/employee';
import { summariseReimbursements } from '../../utils/reimbursementSummary';
import { formatINR, NO_VALUE, projectTitle } from '../../utils/reimbursementFormat';
import RecordsEmptyState from '../../components/RecordsEmptyState';

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

    const columns = useMemo<MRT_ColumnDef<ProjectRollup>[]>(() => [
        {
            accessorKey: 'projectName',
            header: 'Project',
            size: 260,
            Cell: ({ row }) => (
                <span
                    className='fw-semibold fs-7'
                    style={{ color: row.original.projectId === UNASSIGNED ? '#94a3b8' : '#0f172a' }}
                >
                    {row.original.projectName}
                </span>
            ),
            Footer: () => <span style={{ fontWeight: 800 }}>TOTAL</span>,
        },
        { accessorKey: 'employees', header: 'Employees', size: 110 },
        { accessorKey: 'totalRequests', header: 'Requests', size: 110,
          Footer: () => <span style={{ fontWeight: 800 }}>{totals.totalRequests}</span> },
        {
            accessorKey: 'totalAmount', header: 'Claimed', size: 140,
            Cell: ({ row }) => <span className='fw-bold fs-7'>{formatINR(row.original.totalAmount)}</span>,
            Footer: () => <span style={{ fontWeight: 800 }}>{formatINR(totals.totalAmount)}</span>,
        },
        {
            accessorKey: 'approvedAmount', header: 'Approved', size: 140,
            Cell: ({ row }) => <span style={{ color: '#15803d', fontWeight: 600 }}>{formatINR(row.original.approvedAmount)}</span>,
            Footer: () => <span style={{ fontWeight: 800, color: '#15803d' }}>{formatINR(totals.approvedAmount)}</span>,
        },
        {
            accessorKey: 'pendingAmount', header: 'Awaiting approval', size: 150,
            Cell: ({ row }) => <span style={{ color: '#d97706', fontWeight: 600 }}>{formatINR(row.original.pendingAmount)}</span>,
            Footer: () => <span style={{ fontWeight: 800, color: '#d97706' }}>{formatINR(totals.pendingAmount)}</span>,
        },
        {
            accessorKey: 'paidAmount', header: 'Paid', size: 140,
            Cell: ({ row }) => <span style={{ color: '#7c3aed', fontWeight: 600 }}>{formatINR(row.original.paidAmount)}</span>,
            Footer: () => <span style={{ fontWeight: 800, color: '#7c3aed' }}>{formatINR(totals.paidAmount)}</span>,
        },
        {
            // Approved but not yet paid — what the project still owes, which is the number a
            // project manager is usually after.
            accessorKey: 'outstandingAmount', header: 'Still owed', size: 140,
            Cell: ({ row }) => <span style={{ color: '#1e3a8a', fontWeight: 700 }}>{formatINR(row.original.outstandingAmount)}</span>,
            Footer: () => <span style={{ fontWeight: 800, color: '#1e3a8a' }}>{formatINR(totals.remainingAmount)}</span>,
        },
    ], [totals]);

    return (
        <div className='mt-5'>
            <h1>Reimbursements by Project — {periodLabel}</h1>
            {!loading && rollups.length === 0 ? (
                <RecordsEmptyState periodLabel={periodLabel} />
            ) : (
                <MaterialTable
                    data={rollups}
                    columns={columns}
                    tableName='ReimbursementsByProject'
                    isLoading={loading}
                    showColumnFooter
                    renderExportActions={() => (
                        <ExportButton
                            data={rollups}
                            columns={columns as any}
                            filename={`reimbursements-by-project-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`}
                            showTotals
                            totalLabel='TOTAL'
                        />
                    )}
                />
            )}
        </div>
    );
}

export default ByProject;
