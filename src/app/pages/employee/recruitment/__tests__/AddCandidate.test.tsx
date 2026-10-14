// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Add Candidate is wizard-only. These tests cover Add-to-role (existing applicant)
// and the shared open-role / identity helpers the wizard relies on.

vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {}, authz: { tier: 'SUPER_ADMIN' } }) } }));

const api = vi.hoisted(() => ({
    getRequisitions: vi.fn(),
    getApplications: vi.fn(),
    createApplication: vi.fn(),
    createApplicant: vi.fn(),
    uploadApplicantResume: vi.fn(),
    getApplicantSources: vi.fn(async () => []),
}));
vi.mock('@services/recruitment', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/recruitment')>()),
    ...api,
}));
vi.mock('@services/options', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/options')>()),
    fetchAllCountries: vi.fn(async () => []),
}));
vi.mock('@services/employee', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/employee')>()),
    getAllEmployeeLevels: vi.fn(async () => ({ data: { employeeLevels: [] } })),
}));
const feedback = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@app/modules/common/components/ui/feedback', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@app/modules/common/components/ui/feedback')>()),
    ...feedback,
}));

import { AddToRoleDialog } from '../AddToRoleDialog';
import { isRoleOpenForCandidates } from '@utils/requisitions';
import {
    candidateHasContact,
    emptyCandidateFormValues,
    formikToApplicantPayload,
} from '../candidateProfile';

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
    });
});

const base = { headcount: 1, filledCount: 0, revisionCount: 0, createdAt: '', updatedAt: '' };
const roles = [
    { ...base, id: 'r-open', title: 'Site Engineer', status: 1, isActive: true },
    { ...base, id: 'r-other', title: 'MEP Supervisor', status: 1, isActive: true },
    { ...base, id: 'r-draft', title: 'Draft Role', status: 0, isActive: true },
    { ...base, id: 'r-archived', title: 'Archived Role', status: 1, isActive: false },
    { ...base, id: 'r-full', title: 'Full Role', status: 1, isActive: true, headcount: 1, filledCount: 1 },
];

const wrap = (ui: React.ReactNode) => {
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    return render(<Provider store={store}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider></Provider>);
};

const lastToast = () => feedback.toast.mock.calls.at(-1)![0] as { icon: string; title: string };

beforeEach(() => {
    api.getRequisitions.mockResolvedValue(roles);
    api.getApplications.mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
    api.createApplication.mockResolvedValue({ application: { id: 'app-9', applicantId: 'cand-9', applicantExisted: false } });
    api.createApplicant.mockResolvedValue({ applicant: { id: 'cand-9' } });
    api.uploadApplicantResume.mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('isRoleOpenForCandidates', () => {
    test('keeps only approved, active roles with a seat left', () => {
        const open = roles.filter(isRoleOpenForCandidates);
        expect(open.map((r) => r.id)).toEqual(['r-open', 'r-other']);
    });
});

describe('candidate identity helpers (wizard)', () => {
    test('contact requires email or phone', () => {
        const blank = emptyCandidateFormValues();
        expect(candidateHasContact(blank)).toBe(false);
        expect(candidateHasContact({ ...blank, personalEmailId: 'a@b.com' })).toBe(true);
        expect(candidateHasContact({ ...blank, personalPhoneNumber: '9920652771' })).toBe(true);
    });

    test('formik payload sends empty optional text as null', () => {
        const values = emptyCandidateFormValues();
        values.firstName = 'Suhel';
        values.personalPhoneNumber = '9920652771';
        values.personalEmailId = '  ';
        values.lastName = '';
        const payload = formikToApplicantPayload(values);
        expect(payload).toMatchObject({ firstName: 'Suhel', phone: '9920652771', email: null, lastName: null });
    });
});

describe('AddToRoleDialog', () => {
    test('offers only roles they are not already in, and adds them by id', async () => {
        api.getApplications.mockResolvedValue({ items: [{ id: 'app-1', requisitionId: 'r-open' }], hasMore: false, nextCursor: null });
        wrap(<AddToRoleDialog open onClose={() => {}} applicantId="cand-1" applicantName="Suhel Pathan" />);
        await waitFor(() => expect(api.getApplications).toHaveBeenCalledWith({ applicantId: 'cand-1' }));
        await waitFor(() => expect(screen.getByRole('combobox', { name: /^role/i }).getAttribute('aria-disabled')).not.toBe('true'));
        await userEvent.click(screen.getByRole('combobox', { name: /^role/i }));
        const names = (await screen.findAllByRole('option')).map((o) => o.textContent);
        expect(names).toEqual(['MEP Supervisor']);
        await userEvent.click(screen.getByRole('option', { name: 'MEP Supervisor' }));
        await userEvent.click(screen.getByRole('button', { name: /add to role/i }));
        await waitFor(() => expect(api.createApplication).toHaveBeenCalledWith({ applicantId: 'cand-1', requisitionId: 'r-other' }, undefined));
        expect(lastToast()).toEqual({ icon: 'success', title: 'Suhel Pathan added to "MEP Supervisor"' });
    });
});
