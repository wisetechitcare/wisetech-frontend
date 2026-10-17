// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Roles open on create (no hiring-manager / approval panel). Legacy drafts still get an Open action.

vi.mock('@redux/store', () => ({ store: { getState: () => ({ authz: { tier: 'SUPER_ADMIN' } }) } }));

const api = vi.hoisted(() => ({
    getRequisitions: vi.fn(),
    getRequisitionStages: vi.fn(),
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
vi.mock('@services/company', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/company')>()),
    getDepartmentDesignations: vi.fn(async () => ({ links: [], suggestions: [] })),
}));

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
    { ...base, id: 'r-open', title: 'Open role', status: 1, approvalPending: false },
    { ...base, id: 'r-closed', title: 'Closed role', status: 2, approvalPending: false },
];

const renderView = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    return render(
        <Provider store={store}>
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <RequisitionsView />
                </MemoryRouter>
            </QueryClientProvider>
        </Provider>,
    );
};

beforeEach(() => {
    api.getRequisitionStages.mockResolvedValue([]);
    api.getRecruitmentBranches.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('RequisitionsView', () => {
    test('each requisition says where it stands: Draft, Awaiting approval, Open, Closed', async () => {
        api.getRequisitions.mockResolvedValue(requisitions);
        renderView();
        await screen.findByText('Draft role');
        expect(screen.getByText('Draft')).toBeTruthy();
        expect(screen.getByText('Awaiting approval')).toBeTruthy();
        expect(screen.getAllByText('Open').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Closed')).toBeTruthy();
        expect(screen.queryByText('Approved')).toBeNull();
        expect(screen.queryByText('Rejected')).toBeNull();
    });

    test('Open is offered on a draft and a closed role, not on pending or already-open', async () => {
        api.getRequisitions.mockResolvedValue(requisitions);
        renderView();
        await screen.findByText('Draft role');
        expect(screen.getAllByRole('button', { name: /^open$/i })).toHaveLength(2);
        expect(screen.queryByRole('button', { name: /^submit$/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /^resubmit$/i })).toBeNull();
    });

    test('Edit is shown for open roles as well as drafts — only locked while awaiting approval', async () => {
        api.getRequisitions.mockResolvedValue(requisitions);
        renderView();
        await screen.findByText('Draft role');
        // Draft, open, closed — three editable; pending has no Edit.
        expect(screen.getAllByRole('button', { name: /^edit$/i })).toHaveLength(3);
    });

    test('opening a legacy draft calls the open endpoint and toasts success', async () => {
        api.getRequisitions.mockResolvedValue([requisitions[0]]);
        api.submitRequisitionApproval.mockResolvedValue({});
        renderView();
        await userEvent.click(await screen.findByRole('button', { name: /^open$/i }));
        await waitFor(() => expect(api.submitRequisitionApproval).toHaveBeenCalledWith('r-draft'));
        await waitFor(() => expect(feedback.toast).toHaveBeenCalled());
        const { title } = feedback.toast.mock.calls.at(-1)![0] as { title: string };
        expect(title).toMatch(/opened/i);
    });

    test('a failed load is an error with Retry, not "No Roles Open"', async () => {
        api.getRequisitions.mockRejectedValue({ response: { data: { detail: 'Service unavailable.' } } });
        renderView();
        expect(await screen.findByText('Could not load the roles')).toBeTruthy();
        expect(screen.queryByText('No Roles Open')).toBeNull();
        expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    });

    test('the empty state is a real button, not a clickable box', async () => {
        api.getRequisitions.mockResolvedValue([]);
        renderView();
        expect(await screen.findByText('No Roles Open')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: /create role/i }).length).toBeGreaterThanOrEqual(1);
    });

    test('loads active roles only — archive restore lives on the Archive tab', async () => {
        api.getRequisitions.mockResolvedValue(requisitions);
        renderView();
        await screen.findByText('Draft role');
        expect(api.getRequisitions).toHaveBeenCalledWith(undefined);
        expect(screen.queryByLabelText(/^show$/i)).toBeNull();
        expect(screen.queryByRole('button', { name: /^restore$/i })).toBeNull();
    });

    test('trash archives drafts and open roles alike (hard delete is on Archive)', async () => {
        api.getRequisitions.mockResolvedValue([requisitions[0], requisitions[2]]);
        api.archiveRequisition.mockResolvedValue({});
        renderView();
        await screen.findByText('Draft role');

        const trashButtons = screen.getAllByRole('button', { name: /^archive$/i });
        expect(trashButtons.length).toBeGreaterThanOrEqual(2);
        await userEvent.click(trashButtons[0]);
        await waitFor(() => expect(api.archiveRequisition).toHaveBeenCalledWith('r-draft'));

        await userEvent.click(trashButtons[1]);
        await waitFor(() => expect(api.archiveRequisition).toHaveBeenCalledWith('r-open'));
    });
});
