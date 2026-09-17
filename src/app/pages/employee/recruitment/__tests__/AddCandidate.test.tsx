// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// The one Add candidate window (Candidates and Pipeline) and "Add to a role" for someone on file.

vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {} }) } }));

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

import { AddCandidateDialog } from '../AddCandidateDialog';
import { AddToRoleDialog } from '../AddToRoleDialog';

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
];

const wrap = (ui: React.ReactNode) => {
    const store = configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-me' } }) } });
    return render(<Provider store={store}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider></Provider>);
};

const lastToast = () => feedback.toast.mock.calls.at(-1)![0] as { icon: string; title: string };

beforeEach(() => {
    api.getRequisitions.mockResolvedValue(roles);
    api.getApplications.mockResolvedValue([]);
    api.createApplication.mockResolvedValue({ application: { id: 'app-9', applicantId: 'cand-9', applicantExisted: false } });
    api.createApplicant.mockResolvedValue({ applicant: { id: 'cand-9' } });
    api.uploadApplicantResume.mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const typeIdentity = async () => {
    await userEvent.type(screen.getByLabelText(/first name/i), 'Suhel');
    await userEvent.type(screen.getByLabelText(/^phone/i), '9920652771');
};
const chooseRole = async (title: string) => {
    await userEvent.click(screen.getByRole('combobox', { name: /^role/i }));
    await userEvent.click(await screen.findByRole('option', { name: title }));
};

describe('AddCandidateDialog', () => {
    test('lists only approved, open roles', async () => {
        wrap(<AddCandidateDialog open onClose={() => {}} roleRequired />);
        await waitFor(() => expect(api.getRequisitions).toHaveBeenCalled());
        await userEvent.click(screen.getByRole('combobox', { name: /^role/i }));
        const names = (await screen.findAllByRole('option')).map((o) => o.textContent);
        expect(names).toEqual(['Site Engineer', 'MEP Supervisor']);
    });

    test('from the pipeline, a role is required before anything is sent', async () => {
        wrap(<AddCandidateDialog open onClose={() => {}} roleRequired />);
        await typeIdentity();
        await userEvent.click(screen.getByRole('button', { name: /add candidate/i }));
        expect(await screen.findByText('Choose the role they are applying for')).toBeTruthy();
        expect(api.createApplication).not.toHaveBeenCalled();
    });

    test('with a role, the person goes onto that role\'s pipeline — blanks sent as null, not ""', async () => {
        wrap(<AddCandidateDialog open onClose={() => {}} roleRequired />);
        await waitFor(() => expect(api.getRequisitions).toHaveBeenCalled());
        await typeIdentity();
        await chooseRole('Site Engineer');
        await userEvent.click(screen.getByRole('button', { name: /add to role/i }));
        await waitFor(() => expect(api.createApplication).toHaveBeenCalledTimes(1));
        const payload = api.createApplication.mock.calls[0][0];
        expect(payload.requisitionId).toBe('r-open');
        expect(payload.applicant).toMatchObject({ firstName: 'Suhel', phone: '9920652771', email: null, lastName: null });
        expect(api.createApplicant).not.toHaveBeenCalled();
        expect(lastToast()).toEqual({ icon: 'success', title: 'Suhel added to "Site Engineer"' });
    });

    test('someone already on file is attached, and the message says so', async () => {
        api.createApplication.mockResolvedValue({ application: { id: 'app-9', applicantId: 'cand-1', applicantExisted: true } });
        wrap(<AddCandidateDialog open onClose={() => {}} roleRequired />);
        await waitFor(() => expect(api.getRequisitions).toHaveBeenCalled());
        await typeIdentity();
        await chooseRole('Site Engineer');
        await userEvent.click(screen.getByRole('button', { name: /add to role/i }));
        await waitFor(() => expect(feedback.toast).toHaveBeenCalled());
        expect(lastToast().title).toBe('Suhel was already on file — added their existing record to "Site Engineer"');
    });

    test('from the directory, no role adds them to the candidate pool', async () => {
        wrap(<AddCandidateDialog open onClose={() => {}} />);
        await typeIdentity();
        await userEvent.click(screen.getByRole('button', { name: /add candidate/i }));
        await waitFor(() => expect(api.createApplicant).toHaveBeenCalledTimes(1));
        expect(api.createApplication).not.toHaveBeenCalled();
    });

    test('a duplicate is refused with the server\'s sentence naming who has it', async () => {
        api.createApplicant.mockRejectedValue({ response: { status: 409, data: { detail: 'Suhel Pathan is already on file with this email or phone. Open their record instead of adding them again.' } } });
        wrap(<AddCandidateDialog open onClose={() => {}} />);
        await typeIdentity();
        await userEvent.click(screen.getByRole('button', { name: /add candidate/i }));
        await waitFor(() => expect(feedback.toast).toHaveBeenCalled());
        expect(lastToast()).toEqual({ icon: 'error', title: 'Suhel Pathan is already on file with this email or phone. Open their record instead of adding them again.' });
    });

    test('a failed resume is reported in the same message as the save, not hidden behind it', async () => {
        api.uploadApplicantResume.mockRejectedValue({ response: { data: { detail: 'Only PDF, DOC or DOCX files are accepted.' } } });
        const { container } = wrap(<AddCandidateDialog open onClose={() => {}} />);
        await typeIdentity();
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
        await userEvent.click(screen.getByRole('button', { name: /add candidate/i }));
        await waitFor(() => expect(feedback.toast).toHaveBeenCalledTimes(1));
        expect(lastToast()).toEqual({ icon: 'warning', title: 'Suhel added, but the resume did not upload: Only PDF, DOC or DOCX files are accepted.' });
        void container;
    });
});

describe('AddToRoleDialog', () => {
    test('offers only roles they are not already in, and adds them by id', async () => {
        api.getApplications.mockResolvedValue([{ id: 'app-1', requisitionId: 'r-open' }]);
        wrap(<AddToRoleDialog open onClose={() => {}} applicantId="cand-1" applicantName="Suhel Pathan" />);
        await waitFor(() => expect(api.getApplications).toHaveBeenCalledWith({ applicantId: 'cand-1' }));
        await waitFor(() => expect(screen.getByRole('combobox', { name: /^role/i }).getAttribute('aria-disabled')).not.toBe('true'));
        await userEvent.click(screen.getByRole('combobox', { name: /^role/i }));
        const names = (await screen.findAllByRole('option')).map((o) => o.textContent);
        expect(names).toEqual(['MEP Supervisor']);
        await userEvent.click(screen.getByRole('option', { name: 'MEP Supervisor' }));
        await userEvent.click(screen.getByRole('button', { name: /add to role/i }));
        await waitFor(() => expect(api.createApplication).toHaveBeenCalledWith({ applicantId: 'cand-1', requisitionId: 'r-other' }));
        expect(lastToast()).toEqual({ icon: 'success', title: 'Suhel Pathan added to "MEP Supervisor"' });
    });
});
