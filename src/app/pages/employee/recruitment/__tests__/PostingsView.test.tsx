// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Job adverts: the public link comes from the SERVER (it used to be one company's domain
// hardcoded in this bundle), adverts are editable after creation, a failed load is not
// "nothing published yet", and only approved, open roles can be advertised.

vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {}, authz: { tier: 'SUPER_ADMIN' } }) } }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => navigate,
}));

const api = vi.hoisted(() => ({
    getPostings: vi.fn(),
    getRequisitions: vi.fn(),
    createPosting: vi.fn(),
    updatePosting: vi.fn(),
    deletePosting: vi.fn(),
}));
vi.mock('@services/recruitment', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/recruitment')>()),
    ...api,
}));

const feedback = vi.hoisted(() => ({ toast: vi.fn(), confirmDialog: vi.fn(async () => true) }));
vi.mock('@app/modules/common/components/ui/feedback', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@app/modules/common/components/ui/feedback')>()),
    ...feedback,
}));

import PostingsView from '../PostingsView';

const written: string[] = [];
beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false, media: query, onchange: null,
            addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
        }),
    });
    Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        value: { writeText: async (text: string) => { written.push(text); } },
    });
});

const roles = [
    { id: 'r-open', title: 'Site Engineer', status: 1, isActive: true, headcount: 1, filledCount: 0, revisionCount: 0, createdAt: '', updatedAt: '' },
    { id: 'r-draft', title: 'Draft Role', status: 0, isActive: true, headcount: 1, filledCount: 0, revisionCount: 0, createdAt: '', updatedAt: '' },
    { id: 'r-archived', title: 'Archived Role', status: 1, isActive: false, headcount: 1, filledCount: 0, revisionCount: 0, createdAt: '', updatedAt: '' },
];
const posting = {
    id: 'p-1', requisitionId: 'r-open', publicSlug: 'site-engineer-ab12cd34', title: 'Site Engineer',
    location: 'Mumbai', isRemote: false, employmentType: 'Full-time', isPublished: true,
    publicUrl: 'https://careers.example.com/careers/site-engineer-ab12cd34',
    requisition: { id: 'r-open', title: 'Site Engineer', prefix: 'REQ-004' },
};

const renderView = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    return render(<Provider store={store}><QueryClientProvider client={client}><PostingsView /></QueryClientProvider></Provider>);
};

beforeEach(() => {
    api.getPostings.mockResolvedValue([posting]);
    api.getRequisitions.mockResolvedValue(roles);
    api.createPosting.mockResolvedValue({});
    api.updatePosting.mockResolvedValue({});
    api.deletePosting.mockResolvedValue({});
    written.length = 0;
    navigate.mockClear();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PostingsView', () => {
    test('a failed load is an error with Retry, not "nothing published yet"', async () => {
        api.getPostings.mockRejectedValue({ response: { data: { detail: 'Service unavailable' } } });
        renderView();
        expect(await screen.findByText('Could not load the adverts')).toBeTruthy();
        expect(await screen.findByText('Service unavailable')).toBeTruthy();
        expect(screen.queryByText('Nothing published yet')).toBeNull();

        api.getPostings.mockResolvedValue([posting]);
        await userEvent.click(screen.getByRole('button', { name: /retry/i }));
        expect(await screen.findByText('Site Engineer')).toBeTruthy();
    });

    test('the copied link is the one the server built — never a domain from this bundle', async () => {
        renderView();
        await screen.findByText('Site Engineer');
        await userEvent.click(screen.getByRole('button', { name: /copy public link/i }));
        await waitFor(() => expect(written).toEqual(['https://careers.example.com/careers/site-engineer-ab12cd34']));
    });

    test('with no careers site configured, Copy is not offered', async () => {
        api.getPostings.mockResolvedValue([{ ...posting, publicUrl: null }]);
        renderView();
        await screen.findByText('Site Engineer');
        expect(screen.queryByRole('button', { name: /copy public link/i })).toBeNull();
        expect(written).toEqual([]);
    });

    test('New Advert opens the attach wizard once an open role exists', async () => {
        api.getPostings.mockResolvedValue([]);
        renderView();
        const [headerNew] = await screen.findAllByRole('button', { name: /^new advert$/i });
        await userEvent.click(headerNew);
        expect(navigate).toHaveBeenCalledWith('/recruitment/jobs/adverts/new');
    });

    test('clicking an advert card opens the edit wizard (no pencil button)', async () => {
        renderView();
        await screen.findByText('Site Engineer');
        expect(screen.queryByRole('button', { name: /edit advert/i })).toBeNull();
        await userEvent.click(screen.getByText('Site Engineer'));
        expect(navigate).toHaveBeenCalledWith('/recruitment/jobs/adverts/p-1/edit');
    });

    test('taking an advert down says what happened, in the server\'s words when it fails', async () => {
        api.updatePosting.mockRejectedValue({ response: { data: { detail: 'Posting not found' } } });
        renderView();
        await screen.findByText('Site Engineer');
        await userEvent.click(screen.getByRole('checkbox', { name: /publish/i }));
        await waitFor(() => expect(feedback.toast).toHaveBeenCalled());
        expect(feedback.toast.mock.calls.at(-1)![0]).toEqual({ icon: 'error', title: 'Posting not found' });
    });
});
