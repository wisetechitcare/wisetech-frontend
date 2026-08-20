import { useMemo } from 'react';
import dayjs from 'dayjs';
import ExportButton from '@app/modules/common/components/ExportButton';
import { formatINR, projectTitle, resolveStatusNum, STATUS_LABEL, StatusNum, NO_VALUE } from '../utils/reimbursementFormat';

/**
 * Company-wide LINE-ITEM export — backlog item 12.
 *
 * The admin surface could only export per-employee aggregates: "Jane, 14 requests, ₹18,400". That
 * answers a question nobody asks. Every real request of this data — reconciling against a bank
 * statement, checking a project's spend, answering an auditor — needs the individual expenses,
 * with their dates, categories, projects and decision stamps.
 *
 * Reuses `ExportButton` unchanged (xlsx + csv, totals row). This file only decides what one
 * exported row means, which is the part that was missing.
 */

export interface LineItemExportButtonProps {
    /** Raw expense rows — the same array the table renders, not a re-fetch. */
    rows: any[];
    /** Appears in the filename and the sheet title. */
    periodLabel: string;
    disabled?: boolean;
}

const dateCell = (value: unknown): string => {
    const d = dayjs(value as string);
    return value && d.isValid() ? d.format('DD/MM/YYYY') : NO_VALUE;
};

/**
 * Employee name, from whichever shape the row happens to carry.
 *
 * The admin list and the employee list nest this differently, and an export that renders
 * "undefined undefined" for half its rows is the P1-6 defect this module already fixed once.
 */
const employeeName = (row: any): string => {
    const u = row?.employee?.users ?? row?.users;
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
    return name || row?.employeeName || NO_VALUE;
};

export default function LineItemExportButton({ rows, periodLabel, disabled }: LineItemExportButtonProps) {
    const data = useMemo(() => (rows ?? []).map((r: any) => {
        const status = resolveStatusNum(r?.status) as StatusNum;
        return {
            employee: employeeName(r),
            employeeCode: r?.employee?.employeeCode ?? r?.employeeCode ?? NO_VALUE,
            // Expense date, NOT submission date. Exporting the submission date is the original
            // reported bug wearing a different hat: it silently re-dates every row.
            expenseDate: dateCell(r?.expenseDate),
            category: r?.reimbursementType?.type ?? NO_VALUE,
            description: r?.description ?? NO_VALUE,
            fromLocation: r?.fromLocation ?? NO_VALUE,
            toLocation: r?.toLocation ?? NO_VALUE,
            project: projectTitle(r),
            company: r?.clientCompany?.companyName ?? NO_VALUE,
            amount: Number(r?.amount ?? 0),
            status: STATUS_LABEL[status] ?? NO_VALUE,
            submittedAt: dateCell(r?.submittedAt),
            decidedAt: dateCell(r?.approvedAt ?? r?.rejectedAt),
            // Approved and paid are separate questions everywhere else in this module; an export
            // that collapses them would be the one place they get merged.
            paymentStatus: String(r?.paymentStatus ?? 'UNPAID'),
            batch: r?.batch?.submissionId ?? NO_VALUE,
            rejectReason: r?.rejectReason ?? '',
        };
    }), [rows]);

    const columns = useMemo(() => [
        { accessorKey: 'employee', header: 'Employee' },
        { accessorKey: 'employeeCode', header: 'Code' },
        { accessorKey: 'expenseDate', header: 'Expense Date' },
        { accessorKey: 'category', header: 'Category' },
        { accessorKey: 'description', header: 'Description' },
        { accessorKey: 'fromLocation', header: 'From' },
        { accessorKey: 'toLocation', header: 'To' },
        { accessorKey: 'project', header: 'Project' },
        { accessorKey: 'company', header: 'Company' },
        // The only column that totals — summing a status or a date would be nonsense.
        { accessorKey: 'amount', header: 'Amount (₹)', showTotal: true, Cell: ({ cell }: any) => formatINR(cell.getValue()) },
        { accessorKey: 'status', header: 'Approval Status' },
        { accessorKey: 'submittedAt', header: 'Submitted On' },
        { accessorKey: 'decidedAt', header: 'Decided On' },
        { accessorKey: 'paymentStatus', header: 'Payment Status' },
        { accessorKey: 'batch', header: 'Batch' },
        { accessorKey: 'rejectReason', header: 'Rejection Reason' },
    ], []);

    return (
        <ExportButton
            // Named, because this button always sits beside the summary export. "Expenses" says
            // what a row is here: one expense, not one employee.
            label="Expenses"
            data={data}
            columns={columns as any}
            filename={`reimbursement-line-items-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`}
            title='Reimbursement Line Items'
            subtitle={`Every expense for ${periodLabel}, by expense date`}
            sheetName='Line Items'
            showTotals
            totalLabel='TOTAL'
            disabled={disabled || data.length === 0}
        />
    );
}
