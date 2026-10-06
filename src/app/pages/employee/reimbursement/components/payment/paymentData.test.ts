import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { buildPaymentRows, filterQueueByPeriod, isBatchReadyForPayment } from './paymentData';

const line = (id: string, status: number, amount: number, paymentStatus = 'UNPAID') => ({
    id, status, amount, paymentStatus,
});

const batch = (overrides: Record<string, unknown> = {}) => ({
    id: 'batch-1',
    submissionId: 'WT-80-20260901-01',
    status: 0,
    employee: { id: 'emp-80', employeeCode: 'WT-80', users: { firstName: 'Employee', lastName: 'Eighty' } },
    submittedAt: '2026-09-30T00:00:00.000Z',
    approvedAt: '2026-10-01T00:00:00.000Z',
    periodStart: '2026-09-01T00:00:00.000Z',
    periodEnd: '2026-09-30T00:00:00.000Z',
    payments: [],
    reimbursements: [
        line('approved-a', 1, 1138),
        line('rejected', 2, 267),
    ],
    ...overrides,
});

describe('isBatchReadyForPayment', () => {
    it('pays approved lines in a mixed batch (WT-80 September included)', () => {
        expect(isBatchReadyForPayment(batch())).toBe(true);
    });

    it('pays approved lines even while a sibling is still pending or queried', () => {
        expect(isBatchReadyForPayment(batch({
            reimbursements: [line('approved-a', 1, 100), line('open', 0, 50)],
        }))).toBe(true);
        expect(isBatchReadyForPayment(batch({
            reimbursements: [line('approved-a', 1, 100), line('asked', 3, 50)],
        }))).toBe(true);
    });

    it('drops a batch with no approved amount', () => {
        expect(isBatchReadyForPayment(batch({
            reimbursements: [line('rejected', 2, 267)],
        }))).toBe(false);
        expect(isBatchReadyForPayment(batch({
            reimbursements: [line('open', 0, 50)],
        }))).toBe(false);
    });
});

describe('buildPaymentRows', () => {
    it('lists a mixed batch and pays only the approved lines', () => {
        const [row] = buildPaymentRows([batch()]);

        expect(row.submissionId).toBe('WT-80-20260901-01');
        expect(row.employeeCode).toBe('WT-80');
        expect(row.approvedAmount).toBe(1138);
        expect(row.remainingAmount).toBe(1138);
        expect(row.state).toBe('UNPAID');
        expect(row.totalRequests).toBe(1);
        expect(row.approvedReimbursementIds).toEqual(['approved-a']);
    });

    it('lists an in-flight mixed batch with only the cleared approved amount', () => {
        const [row] = buildPaymentRows([batch({
            reimbursements: [line('approved-a', 1, 400), line('open', 0, 100)],
        })]);
        expect(row.approvedAmount).toBe(400);
        expect(row.approvedReimbursementIds).toEqual(['approved-a']);
        expect(row.lines).toHaveLength(2);
    });

    it('still lists a fully approved batch', () => {
        const rows = buildPaymentRows([batch({
            status: 1,
            reimbursements: [line('approved-a', 1, 40), line('approved-b', 1, 65)],
        })]);
        expect(rows).toHaveLength(1);
        expect(rows[0].approvedAmount).toBe(105);
    });

    it('derives remaining from line amountPaid when nested payments are omitted', () => {
        const [row] = buildPaymentRows([batch({
            payments: [],
            reimbursements: [
                { id: 'approved-a', status: 1, amount: 1138, paymentStatus: 'PARTIAL', amountPaid: 138 },
                { id: 'rejected', status: 2, amount: 267, paymentStatus: 'UNPAID', amountPaid: 0 },
            ],
        })]);
        expect(row.approvedAmount).toBe(1138);
        expect(row.paidAmount).toBe(138);
        expect(row.remainingAmount).toBe(1000);
        expect(row.state).toBe('PARTIAL');
    });

    it('places September expenses in September, including a batch approved in October', () => {
        const rows = buildPaymentRows([batch()]);
        expect(filterQueueByPeriod(rows, 'monthly', dayjs('2026-09-15'), 'expense')).toHaveLength(1);
        expect(filterQueueByPeriod(rows, 'monthly', dayjs('2026-10-06'), 'expense')).toHaveLength(0);
    });
});
