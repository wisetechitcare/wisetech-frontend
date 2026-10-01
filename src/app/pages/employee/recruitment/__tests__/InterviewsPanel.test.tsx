// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// One dialog books an interview and reschedules one. Before this the only control on a booked
// interview was Status, so moving it meant cancelling and booking a second — which left the
// candidate holding an invitation to a slot nobody was attending.

vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {}, authz: { tier: 'SUPER_ADMIN' } }) } }));
vi.mock('@utils/can', () => ({ canSection: () => true }));

const api = vi.hoisted(() => ({
    getApplicationInterviews: vi.fn(),
    getApplicationEvaluation: vi.fn(async () => ({ scorecardCount: 0, averageOverall: null, averagePercent: null, verdict: null })),
    getScorecardTemplateForInterview: vi.fn(async () => ({ template: null, scale: null, decisions: null })),
    createInterview: vi.fn(async () => ({})),
    updateInterview: vi.fn(async () => ({})),
    submitScorecard: vi.fn(async () => ({})),
}));
vi.mock('@services/recruitment', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/recruitment')>()),
    ...api,
}));
const feedback = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@app/modules/common/components/ui/feedback', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@app/modules/common/components/ui/feedback')>()),
    ...feedback,
}));
// The panelist picker opens its own employee dialog and fetches a directory. The stand-in does
// the two things these tests need: show the ids it was handed, and hand some back.
vi.mock('@app/modules/common/components/EmployeePickerField', () => ({
    EmployeePickerField: ({ label, value, onChange }: { label: string; value: string[]; onChange: (ids: string[]) => void }) => (
        <div>
            <div data-testid="panelists" aria-label={label}>{(value ?? []).join(',')}</div>
            <button type="button" onClick={() => onChange(['e9'])}>pick panelist</button>
        </div>
    ),
}));

import InterviewsPanel from '../InterviewsPanel';

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
    });
});

const booked = {
    id: 'iv-1',
    round: 2,
    type: 'ONSITE',
    mode: 'OFFLINE',
    status: 'SCHEDULED',
    scheduledStart: '2026-09-17T04:30:00Z',
    scheduledEnd: '2026-09-17T05:15:00Z',
    meetingLink: null,
    location: 'Mumbai',
    panelistIds: ['e1', 'e2'],
    scorecards: [],
};

const wrap = () => {
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    return render(
        <Provider store={store}>
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <InterviewsPanel applicationId="app-1" applicantName="Suhel Pathan" />
            </QueryClientProvider>
        </Provider>,
    );
};

beforeEach(() => { api.getApplicationInterviews.mockResolvedValue([booked]); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('InterviewsPanel — rescheduling', () => {
    test('a booked interview can be opened for edit, prefilled with what was booked', async () => {
        wrap();
        await userEvent.click(await screen.findByRole('button', { name: /reschedule or edit/i }));

        expect(await screen.findByText('Reschedule Interview')).toBeTruthy();
        // Prefilled from the row, not from the "tomorrow at 9" defaults a new booking gets.
        expect((screen.getByLabelText(/round/i) as HTMLInputElement).value).toBe('2');
        expect(screen.getByTestId('panelists').textContent).toBe('e1,e2');
        expect((screen.getByLabelText(/location/i) as HTMLInputElement).value).toBe('Mumbai');
    });

    test('saving an edit PUTs to that interview and never creates a second one', async () => {
        wrap();
        await userEvent.click(await screen.findByRole('button', { name: /reschedule or edit/i }));
        await userEvent.click(await screen.findByRole('button', { name: /save & notify/i }));

        await waitFor(() => expect(api.updateInterview).toHaveBeenCalledTimes(1));
        expect(api.updateInterview.mock.calls[0][0]).toBe('iv-1');
        // Cancelling and rebooking was the only way to move an interview before this.
        expect(api.createInterview).not.toHaveBeenCalled();
    });

    test('the new-booking button still creates, after an edit was opened and closed', async () => {
        wrap();
        await userEvent.click(await screen.findByRole('button', { name: /reschedule or edit/i }));
        await userEvent.click(await screen.findByRole('button', { name: /^cancel$/i }));
        // The dialog is still mounted through its exit transition, and MUI aria-hides the page
        // behind it while it is — so the Schedule button is not reachable until it has gone.
        await waitFor(() => expect(screen.queryByText('Reschedule Interview')).toBeNull());
        await userEvent.click(await screen.findByRole('button', { name: /schedule an interview/i }));

        expect(await screen.findByText('Schedule Interview')).toBeTruthy();
        // A new booking is not submittable without a panel — the same rule that was already
        // there, and the reason the form is reset rather than carried over from the edit.
        await userEvent.click(screen.getByRole('button', { name: /pick panelist/i }));
        await userEvent.click(screen.getByRole('button', { name: /schedule & invite/i }));
        await waitFor(() => expect(api.createInterview).toHaveBeenCalledTimes(1));
        // `openSchedule` clears the edit target along with the rest of the form. Without that
        // this would have quietly PUT over iv-1 instead of booking a new round.
        expect(api.updateInterview).not.toHaveBeenCalled();
    });

    test('an interview that is over or off offers no edit', async () => {
        api.getApplicationInterviews.mockResolvedValue([
            { ...booked, id: 'iv-2', status: 'COMPLETED' },
            { ...booked, id: 'iv-3', status: 'CANCELLED' },
        ]);
        wrap();
        await waitFor(() => expect(api.getApplicationInterviews).toHaveBeenCalled());
        await waitFor(() => expect(screen.getAllByRole('button', { name: /add scorecard/i }).length).toBe(2));
        expect(screen.queryByRole('button', { name: /reschedule or edit/i })).toBeNull();
    });
});
