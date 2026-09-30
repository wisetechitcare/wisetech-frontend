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
vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {}, authz: { tier: 'SUPER_ADMIN' } }), dispatch: () => {}, subscribe: () => () => {} } }));

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
    /**
     * The first render of the shared table is slow in jsdom; give it room.
     *
     * Raised twice (5s → 12s → 30s) as the suite grew, which looked like a band-aid over three
     * tests each mounting MaterialTable from scratch. MEASURED, and that guess was wrong:
     *
     *   test 1  2558ms   ← the only expensive mount
     *   test 2   599ms
     *   test 3   396ms
     *   file     14.21s total = transform 2.25 + import 5.73 + environment 3.95 + tests 3.56
     *
     * The mount is ~0.5s once warm; test 1's extra ~2s is first-render of the module graph. So
     * "render once, assert three times" would recover about 1s of 14 — the real weight is the
     * ~9.7s of per-file import and jsdom setup that any render test of this page pays before a
     * single assertion runs. Under 65 files of parallel CPU contention it is that first 2.5s
     * render that stretches past a short per-assertion timeout, which is why the number kept
     * moving and why 30s is the correct answer rather than a stopgap.
     *
     * Worth attacking only if this page's import cost is attacked (the kit barrel is the usual
     * culprit — see the note in the frontend CLAUDE.md). Restructuring these three tests is not
     * worth anyone's afternoon.
     */
    const name = await screen.findByText('Suhel Pathan', undefined, { timeout: 30000 });
    return name.closest('tr') as HTMLElement;
};

beforeEach(() => {
    // A page, not an array: the service now returns the server's own hasMore/nextCursor.
    api.getApplications.mockResolvedValue({ items: [application], hasMore: false, nextCursor: null });
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

    test('a capped page says so, and an uncapped one stays quiet', async () => {
        // The server pages at 200 and answers `hasMore` itself. Dropping that answer is what made
        // a board silently miss its 201st card — the notice is the whole point of audit H3, so it
        // gets a test rather than trust.
        const row = await renderList();
        expect(within(row).getByText('Suhel Pathan')).toBeTruthy();
        expect(screen.queryByText(/Showing the first/)).toBeNull();

        cleanup();
        api.getApplications.mockResolvedValue({ items: [application], hasMore: true, nextCursor: 'app-1' });
        await renderList();
        expect(await screen.findByText(/Showing the first/)).toBeTruthy();
        expect(screen.getByText(/not the whole board/)).toBeTruthy();
    });

    test('an action opens only its own dialog — the click does not also open the candidate', async () => {
        const row = await renderList();
        await userEvent.click(within(row).getByRole('button', { name: 'Interviews' }));
        const dialogs = await screen.findAllByRole('dialog');
        expect(dialogs).toHaveLength(1);
        expect(within(dialogs[0]).getByText('Interviews and Scorecards')).toBeTruthy();
    });
});
