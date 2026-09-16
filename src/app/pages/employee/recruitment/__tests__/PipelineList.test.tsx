// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

// The pipeline's List view. Its actions were four worded buttons that did not fit the column and
// wrapped into a ragged stack on every row. They are now one row of named icon actions, and the
// row itself opens the candidate.

// The shared table reads `appSettings` from the store at import time.
vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {} }), dispatch: () => {}, subscribe: () => () => {} } }));

const api = vi.hoisted(() => ({
    getApplications: vi.fn(),
    getApplicationStatuses: vi.fn(),
    getRejectionReasons: vi.fn(),
    getRequisitions: vi.fn(),
    getApplicationById: vi.fn(),
    getApplicationNotes: vi.fn(),
    getApplicationInterviews: vi.fn(),
    getApplicationEvaluation: vi.fn(),
    getApplicationOffer: vi.fn(),
    getRecruitmentBranches: vi.fn(),
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
// Which designations each department offers — none linked in these tests.
vi.mock('@services/company', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/company')>()),
    getDepartmentDesignations: vi.fn(async () => ({ links: [], suggestions: [] })),
}));
vi.mock('@app/modules/common/components/EmployeePickerField', () => ({ EmployeePickerField: () => null }));
// The shared table loads and saves column preferences through the API; answer with "none saved".
vi.mock('@services/users', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/users')>()),
    getUserTablePreferences: vi.fn(async () => null),
    upsertUserTablePreferences: vi.fn(async () => null),
}));

import PipelineView from '../PipelineView';

beforeAll(() => {
    // jsdom has no ResizeObserver; the table measures its columns with one.
    globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false, media: query, onchange: null,
            addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
        }),
    });
});

const hired = { id: 's-hired', name: 'Hired', sortOrder: 2, isDefault: false, isActive: true, isHiredOutcome: true, isRejectedOutcome: false, requiresReason: false };
const applied = { id: 's-new', name: 'Applied', sortOrder: 1, isDefault: true, isActive: true, isHiredOutcome: false, isRejectedOutcome: false, requiresReason: false };
const application = {
    id: 'app-1', applicantId: 'c1', statusId: 's-hired', status: hired, revisionCount: 1, isActive: true, createdAt: '2026-09-01T00:00:00Z',
    applicant: { id: 'c1', firstName: 'Suhel', lastName: 'Pathan', phone: '9920652771', isBlacklisted: false, isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    requisition: { id: 'r1', title: 'Site Engineer' },
};

const renderList = async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    render(
        <Provider store={store}>
            <QueryClientProvider client={client}>
                <MemoryRouter><PipelineView /></MemoryRouter>
            </QueryClientProvider>
        </Provider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /list/i }));
    // The first render of the shared table is slow in jsdom; give it room. 5s was enough when
    // this file ran alone and not when the suite ran it beside 43 others, which is a flake.
    const name = await screen.findByText('Suhel Pathan', undefined, { timeout: 12000 });
    return name.closest('tr') as HTMLElement;
};

beforeEach(() => {
    api.getApplications.mockResolvedValue([application]);
    api.getApplicationStatuses.mockResolvedValue([applied, hired]);
    api.getRejectionReasons.mockResolvedValue([]);
    api.getRequisitions.mockResolvedValue([]);
    api.getApplicationById.mockImplementation(() => new Promise(() => {}));
    api.getApplicationNotes.mockResolvedValue([]);
    api.getApplicationInterviews.mockResolvedValue([]);
    api.getApplicationEvaluation.mockResolvedValue({ scorecardCount: 0, averageOverall: null, averagePercent: null, verdict: null });
    api.getApplicationOffer.mockResolvedValue({ offer: null });
    api.getRecruitmentBranches.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Pipeline list view', () => {
    test('each row has one set of named icon actions, not a stack of worded buttons', async () => {
        const row = await renderList();
        for (const name of ['Open Candidate', 'Interviews', 'Offer', 'Convert to Employee']) {
            expect(within(row).getByRole('button', { name })).toBeTruthy();
        }
        // No worded button labels left in the row.
        expect(within(row).queryByText(/^Open$/)).toBeNull();
        expect(within(row).queryByText(/^Convert$/)).toBeNull();
    });

    test('clicking the row opens the candidate', async () => {
        const row = await renderList();
        await userEvent.click(within(row).getByText('Site Engineer'));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Suhel Pathan')).toBeTruthy();
    });

    test('an action opens only its own dialog — the click does not also open the candidate', async () => {
        const row = await renderList();
        await userEvent.click(within(row).getByRole('button', { name: 'Interviews' }));
        const dialogs = await screen.findAllByRole('dialog');
        expect(dialogs).toHaveLength(1);
        expect(within(dialogs[0]).getByText('Interviews and Scorecards')).toBeTruthy();
    });
});
