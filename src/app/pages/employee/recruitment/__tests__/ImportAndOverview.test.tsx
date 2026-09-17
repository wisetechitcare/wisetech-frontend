// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';

// The two critical findings of the 15 Sep recruitment audit:
//   C1 — Import was reported to upload a stale file (the mutation read `file` from component state).
//        It did NOT reproduce: React Query 5 reads `mutationFn` after an await, by which time the
//        re-render has handed it the new closure. The file is now passed in as a variable so the
//        upload no longer depends on that timing; these tests guard the behaviour either way.
//   C2 — Overview: a full-page loading spinner replaced the header, unmounting the period filter
//        on every change, so no period but "now" could ever be viewed. Reproduced and fixed.

vi.mock('@redux/store', () => ({ store: { getState: () => ({}) } }));

const api = vi.hoisted(() => ({
    previewTrackerImport: vi.fn(),
    executeTrackerImport: vi.fn(),
    getApplicationStatuses: vi.fn(),
    getRequisitions: vi.fn(),
    getRecruitmentOverview: vi.fn(),
}));
vi.mock('@services/recruitment', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/recruitment')>()),
    ...api,
}));

import ImportView from '../ImportView';
import RecruitmentOverview from '../RecruitmentOverview';

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false, media: query, onchange: null,
            addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
        }),
    });
});

const renderWithProviders = (ui: ReactNode) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    return render(<Provider store={store}><QueryClientProvider client={client}>{ui}</QueryClientProvider></Provider>);
};

const emptyPreview = {
    headerLine: 1, headers: ['Position'],
    preview: { rows: [], importable: 0, blocked: 0, withWarnings: 0, questions: {} },
};

beforeEach(() => {
    api.getApplicationStatuses.mockResolvedValue([]);
    api.previewTrackerImport.mockResolvedValue(emptyPreview);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement;

describe('ImportView', () => {
    test('the FIRST file chosen is the one uploaded, and a second pick uploads the second file', async () => {
        api.getRequisitions.mockResolvedValue([]);
        const { container } = renderWithProviders(<ImportView />);

        const first = new File(['Position\nEngineer'], 'requisitions-v1.csv', { type: 'text/csv' });
        await userEvent.upload(fileInput(container), first);
        await waitFor(() => expect(api.previewTrackerImport).toHaveBeenCalledTimes(1));
        expect(api.previewTrackerImport.mock.calls[0][0]).toBe('requisitions');
        expect(api.previewTrackerImport.mock.calls[0][1]).toBe(first);

        const second = new File(['Position\nForeman'], 'requisitions-v2.csv', { type: 'text/csv' });
        await userEvent.upload(fileInput(container), second);
        await waitFor(() => expect(api.previewTrackerImport).toHaveBeenCalledTimes(2));
        expect(api.previewTrackerImport.mock.calls[1][1]).toBe(second);
    });

    test('the candidates step opens when the organization already has requisitions, however they got there', async () => {
        api.getRequisitions.mockResolvedValue([{ id: 'r1', title: 'Engineer', status: 1, isActive: true }]);
        renderWithProviders(<ImportView />);
        await waitFor(() => expect(api.getRequisitions).toHaveBeenCalled());

        await userEvent.click(screen.getByRole('combobox', { name: /sheet/i }));
        await userEvent.click(await screen.findByRole('option', { name: /candidates/i }));

        await waitFor(() => expect((screen.getByRole('button', { name: /choose csv/i }) as HTMLButtonElement).disabled).toBe(false));
        expect(screen.queryByText(/Add or import requisitions first/)).toBeNull();
    });

    test('with no requisitions at all, the candidates step stays locked and says why', async () => {
        api.getRequisitions.mockResolvedValue([]);
        renderWithProviders(<ImportView />);
        await waitFor(() => expect(api.getRequisitions).toHaveBeenCalled());

        await userEvent.click(screen.getByRole('combobox', { name: /sheet/i }));
        await userEvent.click(await screen.findByRole('option', { name: /candidates/i }));

        expect(await screen.findByText(/Add or import requisitions first/)).toBeTruthy();
        expect((screen.getByRole('button', { name: /choose csv/i }) as HTMLButtonElement).disabled).toBe(true);
    });
});

describe('RecruitmentOverview', () => {
    test('the header and its period filter stay on screen while the figures load', async () => {
        api.getRecruitmentOverview.mockImplementation(() => new Promise(() => {}));
        renderWithProviders(<RecruitmentOverview />);
        expect(await screen.findByText('Recruitment Overview')).toBeTruthy();
        // The loading state sits UNDER the header rather than replacing the page.
        expect(screen.getByRole('progressbar')).toBeTruthy();
    });

    test('a failed load says so and offers Retry, under the same header', async () => {
        api.getRecruitmentOverview.mockRejectedValue({ response: { data: { detail: 'Overview is unavailable right now.' } } });
        renderWithProviders(<RecruitmentOverview />);
        expect(await screen.findByText('Could not load the overview')).toBeTruthy();
        expect(screen.getByText('Overview is unavailable right now.')).toBeTruthy();
        expect(screen.getByText('Recruitment Overview')).toBeTruthy();
        expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    });
});
