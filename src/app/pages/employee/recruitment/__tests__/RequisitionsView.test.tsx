// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// The requisitions screen: draft vs awaiting approval (both status 0), rejected as a way back
// rather than a dead end, a failed load that is not "no roles open", and the server's own reason
// on a failed submit instead of "Set a hiring manager first" for every error.

vi.mock('@redux/store', () => ({ store: { getState: () => ({}) } }));

const api = vi.hoisted(() => ({
    getRequisitions: vi.fn(),
    getRequisitionStages: vi.fn(),
    getRecruitmentSettings: vi.fn(),
    getRecruitmentBranches: vi.fn(),
    submitRequisitionApproval: vi.fn(),
    archiveRequisition: vi.fn(),
    createRequisition: vi.fn(),
    updateRequisition: vi.fn(),
}));
vi.mock('@services/recruitment', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/recruitment')>()),
    ...api,
}));
vi.mock('@services/options', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/options')>()),
    fetchAllCountries: vi.fn(async () => []),
    fetchDesignations: vi.fn(async () => ({ data: { designations: [] } })),
    fetchDepartments: vi.fn(async () => ({ data: { departments: [] } })),
}));
vi.mock('@services/employee', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/employee')>()),
    getAllEmployeeLevels: vi.fn(async () => ({ data: { employeeLevels: [] } })),
}));
// Which designations each department offers — none linked in these tests.
vi.mock('@services/company', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/company')>()),
    getDepartmentDesignations: vi.fn(async () => ({ links: [], suggestions: [] })),
}));
vi.mock('@app/modules/common/components/EmployeePickerField', () => ({ EmployeePickerField: () => null }));

const feedback = vi.hoisted(() => ({ toast: vi.fn(), confirmDialog: vi.fn(async () => true) }));
vi.mock('@app/modules/common/components/ui/feedback', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@app/modules/common/components/ui/feedback')>()),
    ...feedback,
}));

import RequisitionsView from '../RequisitionsView';

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false, media: query, onchange: null,
            addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
        }),
    });
});

const base = { headcount: 1, filledCount: 0, isActive: true, revisionCount: 1, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', currency: 'INR' };
const requisitions = [
    { ...base, id: 'r-draft', title: 'Draft role', status: 0, approvalPending: false },
    { ...base, id: 'r-pending', title: 'Pending role', status: 0, approvalPending: true },
    { ...base, id: 'r-approved', title: 'Approved role', status: 1, approvalPending: false },
    { ...base, id: 'r-rejected', title: 'Rejected role', status: 2, approvalPending: false },
];

const renderView = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    return render(<Provider store={store}><QueryClientProvider client={client}><RequisitionsView /></QueryClientProvider></Provider>);
};

beforeEach(() => {
    api.getRequisitionStages.mockResolvedValue([]);
    api.getRecruitmentSettings.mockResolvedValue({});
    api.getRecruitmentBranches.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('RequisitionsView', () => {
    test('each requisition says where it stands: Draft, Awaiting approval, Approved, Rejected', async () => {
        api.getRequisitions.mockResolvedValue(requisitions);
        renderView();
        await screen.findByText('Draft role');
        for (const label of ['Draft', 'Awaiting approval', 'Approved', 'Rejected']) expect(screen.getByText(label)).toBeTruthy();
        expect(screen.queryByText('Pending')).toBeNull();
    });

    test('Submit is offered on a draft, Resubmit on a rejected one, and nothing on pending or approved', async () => {
        api.getRequisitions.mockResolvedValue(requisitions);
        renderView();
        await screen.findByText('Draft role');
        expect(screen.getAllByRole('button', { name: /^submit$/i })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: /^resubmit$/i })).toHaveLength(1);
    });

    test('Edit is locked while awaiting approval and once approved, open for drafts and rejected ones', async () => {
        api.getRequisitions.mockResolvedValue(requisitions);
        renderView();
        await screen.findByText('Draft role');
        const edits = screen.getAllByRole('button', { name: /^edit$/i });
        expect(edits).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Locked while awaiting approval' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Locked — this role is approved/ })).toBeTruthy();
    });

    test('a failed submit shows the server\'s reason, not a guess about the hiring manager', async () => {
        api.getRequisitions.mockResolvedValue([requisitions[0]]);
        api.submitRequisitionApproval.mockRejectedValue({ response: { status: 400, data: { detail: 'No approver could be resolved — ensure you report to a manager or pass approverIds.' } } });
        renderView();
        await userEvent.click(await screen.findByRole('button', { name: /^submit$/i }));
        await waitFor(() => expect(feedback.toast).toHaveBeenCalled());
        const { title } = feedback.toast.mock.calls.at(-1)![0] as { title: string };
        expect(title).toMatch(/No approver could be resolved/);
        expect(title).not.toMatch(/hiring manager first/);
    });

    test('a failed load is an error with Retry, not "No roles open"', async () => {
        api.getRequisitions.mockRejectedValue({ response: { data: { detail: 'Service unavailable.' } } });
        renderView();
        expect(await screen.findByText('Could not load the roles')).toBeTruthy();
        expect(screen.queryByText('No roles open')).toBeNull();
        expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    });

    test('the empty state is a real button, not a clickable box', async () => {
        api.getRequisitions.mockResolvedValue([]);
        renderView();
        expect(await screen.findByText('No roles open')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: /new requisition/i }).length).toBeGreaterThanOrEqual(2);
    });
});

