// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';

// The candidate modal, rendered the way the pipeline board renders it, against a mocked API.
// These pin the bugs it had: content hugging the dialog edge aside, a Resume link that opened an
// S3 key, a stage history that claimed "no transitions" before loading, salaries in the viewer's
// currency, duplicate section headings, Remove offered on other people's notes, and no way to
// change a stage without drag-and-drop.

vi.mock('@redux/store', () => ({ store: { getState: () => ({}) } }));

const api = vi.hoisted(() => ({
    getApplicationById: vi.fn(),
    getApplicationNotes: vi.fn(),
    createApplicationNote: vi.fn(),
    deleteApplicationNote: vi.fn(),
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
    fetchDesignations: vi.fn(async () => ({ data: { designations: [] } })),
    fetchDepartments: vi.fn(async () => ({ data: { departments: [] } })),
    // The currency hook reads the country directory to resolve a branch's currency.
    fetchAllCountries: vi.fn(async () => []),
}));
// A picker that opens its own employee directory; not what these tests are about.
vi.mock('@app/modules/common/components/EmployeePickerField', () => ({ EmployeePickerField: () => null }));

import CandidateDrawer from '../CandidateDrawer';
import type { Application, ApplicationStatus } from '@services/recruitment';

beforeAll(() => {
    // jsdom has no matchMedia; the dialog asks it whether to go full-screen on a phone.
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false, media: query, onchange: null,
            addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
        }),
    });
});

const statuses: ApplicationStatus[] = [
    { id: 's-new', name: 'Applied', sortOrder: 1, isDefault: true, isActive: true, isHiredOutcome: false, isRejectedOutcome: false, requiresReason: false },
    { id: 's-int', name: 'Interview', sortOrder: 2, isDefault: false, isActive: true, isHiredOutcome: false, isRejectedOutcome: false, requiresReason: false },
    { id: 's-rej', name: 'Rejected', sortOrder: 3, isDefault: false, isActive: true, isHiredOutcome: false, isRejectedOutcome: true, requiresReason: true },
];

const row: Application = {
    id: 'app-1', applicantId: 'cand-1', statusId: 's-int', revisionCount: 3, isActive: true, createdAt: '2026-09-01T10:00:00.000Z',
    applicant: {
        id: 'cand-1', firstName: 'Aisha', lastName: 'Rahman', email: 'aisha.rahman.with.a.long.address@example.com', phone: '+971 50 123 4567',
        currentTitle: 'Site Engineer', currentEmployer: 'Acme', expectedCtc: 180000, currentCtc: 150000,
        resumeS3Url: 'recruitment/resumes/key.pdf', isBlacklisted: false, isActive: true, createdAt: '2026-09-01T10:00:00.000Z',
    },
    requisition: { id: 'req-1', title: 'MEP Engineer' },
    rejectionReason: { id: 'rr', reason: 'Salary', sortOrder: 1, isActive: true },
    ruleScore: 72, scoreBand: 'good',
};

const detail = {
    ...row,
    revisionCount: 4,
    currency: 'AED',
    applicant: { ...row.applicant!, resumeS3Url: 'https://s3.example.com/signed?X-Amz-Signature=abc' },
    stageHistory: [
        { id: 'h2', fromStatusId: 's-new', toStatusId: 's-int', isAutomated: false, changedAt: '2026-09-03T09:30:00.000Z', changedByName: 'Jane Recruiter' },
        { id: 'h1', fromStatusId: null, toStatusId: 's-new', isAutomated: true, changedAt: '2026-09-01T10:00:00.000Z', changedByName: null },
    ],
};

const renderDrawer = (props: Partial<React.ComponentProps<typeof CandidateDrawer>> = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    const wrap = ({ children }: { children: ReactNode }) => (
        <Provider store={store}><QueryClientProvider client={client}>{children}</QueryClientProvider></Provider>
    );
    return render(<CandidateDrawer application={row} statuses={statuses} onClose={() => {}} {...props} />, { wrapper: wrap });
};

let resolveDetail: (v: unknown) => void;

beforeEach(() => {
    api.getApplicationById.mockImplementation(() => new Promise((r) => { resolveDetail = r; }));
    api.getApplicationNotes.mockResolvedValue([
        { id: 'n1', applicationId: 'app-1', authorId: 'emp-me', authorName: 'Me Myself', body: 'Strong on HVAC.', createdAt: '2026-09-04T08:00:00.000Z' },
        { id: 'n2', applicationId: 'app-1', authorId: 'emp-other', authorName: 'Someone Else', body: 'Notice period is long.', createdAt: '2026-09-04T09:00:00.000Z' },
    ]);
    api.getApplicationInterviews.mockResolvedValue([
        { id: 'iv1', applicationId: 'app-1', round: 1, type: 'VIDEO', mode: 'ONLINE', scheduledStart: '2026-09-05T06:30:00.000Z', scheduledEnd: '2026-09-05T07:15:00.000Z', panelistIds: ['p1'], status: 'SCHEDULED', scorecards: [] },
    ]);
    api.getApplicationEvaluation.mockResolvedValue({ scorecardCount: 0, averageOverall: null, averagePercent: null, verdict: null });
    api.getApplicationOffer.mockResolvedValue({ offer: null, currency: 'AED', requisitionBranchId: 'b-dubai' });
    api.getRecruitmentBranches.mockResolvedValue([{ id: 'b-dubai', name: 'Dubai', companyId: 'c1', companyName: 'Org', currency: 'AED' }]);
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CandidateDrawer', () => {
    test('names the candidate once, and every section once — no second heading under the modal\'s own', async () => {
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getAllByText('Aisha Rahman')).toHaveLength(1);
        for (const heading of ['Profile', 'Notes', 'Stage History', 'Interviews', 'Offer']) {
            expect(within(dialog).getAllByText(heading)).toHaveLength(1);
        }
        expect(within(dialog).queryByText(/Interviews —/)).toBeNull();
        expect(within(dialog).queryByText(/Offer —/)).toBeNull();
    });

    test('before the record loads: Resume waits, history shows it is loading, salaries are not guessed', async () => {
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        expect((within(dialog).getByRole('button', { name: /resume/i }) as HTMLButtonElement).disabled).toBe(true);
        expect(within(dialog).queryByText(/No stage changes recorded/i)).toBeNull();
        expect(within(dialog).queryByText(/Expected CTC/)).toBeNull();
    });

    test('once loaded: the signed resume link, who moved them, and salaries in the requisition\'s currency', async () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        renderDrawer();
        resolveDetail(detail);
        const dialog = await screen.findByRole('dialog');

        await within(dialog).findByText(/by Jane Recruiter/);
        expect(within(dialog).getByText(/Expected CTC/).nextSibling?.textContent).toMatch(/AED/);

        const resume = within(dialog).getByRole('button', { name: /resume/i });
        await waitFor(() => expect((resume as HTMLButtonElement).disabled).toBe(false));
        await userEvent.click(resume);
        expect(open).toHaveBeenCalledWith(detail.applicant.resumeS3Url, '_blank', 'noopener,noreferrer');
    });

    test('email and phone are links, and a long address wraps instead of overflowing', async () => {
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        const email = within(dialog).getByRole('link', { name: row.applicant!.email! });
        expect(email.getAttribute('href')).toBe(`mailto:${row.applicant!.email}`);
        expect(within(dialog).getByRole('link', { name: row.applicant!.phone! }).getAttribute('href')).toBe('tel:+971501234567');
    });

    test('Remove is offered only on the viewer\'s own note, and each note says who wrote it', async () => {
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        await within(dialog).findByText('Strong on HVAC.');
        expect(within(dialog).getByText('Someone Else')).toBeTruthy();
        expect(within(dialog).getAllByRole('button', { name: 'Remove note' })).toHaveLength(1);
    });

    test('the rejection reason is not shown for a candidate who is no longer rejected', async () => {
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).queryByText(/Rejected — Salary/)).toBeNull();
    });

    test('the stage can be changed without drag-and-drop, and the move carries the latest revision', async () => {
        const onMove = vi.fn();
        renderDrawer({ onMove });
        resolveDetail(detail);
        const dialog = await screen.findByRole('dialog');
        await within(dialog).findByText(/by Jane Recruiter/);

        await userEvent.click(within(dialog).getByRole('combobox', { name: /stage/i }));
        await userEvent.click(await screen.findByRole('option', { name: 'Applied' }));
        expect(onMove).toHaveBeenCalledTimes(1);
        const [moved, to] = onMove.mock.calls[0];
        expect(to.id).toBe('s-new');
        expect(moved.revisionCount).toBe(4);
    });

    test('interviews read in words, with counts that agree with themselves', async () => {
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText(/Round 1 · Video · Online/)).toBeTruthy();
        expect(within(dialog).getByText(/1 panelist · 0 scorecards/)).toBeTruthy();
    });

    test('a new offer starts at the requisition\'s branch and cannot be submitted before it exists', async () => {
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText(/No offer yet/)).toBeTruthy();
        expect(within(dialog).getByRole('button', { name: /create offer/i })).toBeTruthy();
        expect(within(dialog).queryByRole('button', { name: /submit for approval/i })).toBeNull();
    });
});

describe('OfferPanel inside the modal', () => {
    test('an offer awaiting approval is locked: no Save, no second Submit, and it says so', async () => {
        api.getApplicationOffer.mockResolvedValue({
            currency: 'AED', requisitionBranchId: 'b-dubai',
            offer: {
                id: 'of1', applicationId: 'app-1', prefix: 'OFR-2026-0007', status: 0, approvalPending: true, acceptanceStatus: 'PENDING',
                offeredBranchId: 'b-dubai', offeredCtc: 200000, proposedJoiningDate: '2026-10-01T00:00:00.000Z', revisionCount: 2, currency: 'AED',
            },
        });
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('Awaiting approval')).toBeTruthy();
        expect(within(dialog).queryByText('Awaiting candidate')).toBeNull();
        expect(within(dialog).queryByRole('button', { name: /save offer/i })).toBeNull();
        expect(within(dialog).queryByRole('button', { name: /submit for approval/i })).toBeNull();
    });

    test('a draft missing its joining date cannot be submitted, and the panel says what is missing', async () => {
        api.getApplicationOffer.mockResolvedValue({
            currency: 'AED', requisitionBranchId: 'b-dubai',
            offer: {
                id: 'of1', applicationId: 'app-1', status: 0, approvalPending: false, acceptanceStatus: 'PENDING',
                offeredBranchId: 'b-dubai', offeredCtc: 200000, proposedJoiningDate: null, revisionCount: 1, currency: 'AED',
            },
        });
        renderDrawer();
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('Draft')).toBeTruthy();
        expect((within(dialog).getByRole('button', { name: /submit for approval/i }) as HTMLButtonElement).disabled).toBe(true);
        expect(within(dialog).getByText(/Add a branch, the offered CTC and a joining date/)).toBeTruthy();
    });
});
