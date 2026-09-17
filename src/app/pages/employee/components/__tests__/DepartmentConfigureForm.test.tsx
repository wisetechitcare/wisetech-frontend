// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure › Department: where HR says which designations a department offers. Suggestions come
// from employee records and are only ever applied by HR; saving sends exactly the chosen list.

vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {} }) } }));

const api = vi.hoisted(() => ({
    getDepartmentDesignations: vi.fn(),
    setDepartmentDesignations: vi.fn(),
    createNewDepartment: vi.fn(),
    updateDepartmentById: vi.fn(),
}));
vi.mock('@services/company', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/company')>()),
    ...api,
}));
vi.mock('@services/options', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/options')>()),
    fetchDepartments: vi.fn(async () => ({ data: { departments: [{ id: 'it', name: 'IT' }] } })),
    fetchDesignations: vi.fn(async () => ({
        data: {
            designations: [
                { id: 'it-trainee', role: 'IT Trainee', parentId: null },
                { id: 'it-specialist', role: 'IT Specialist', parentId: null },
                { id: 'junior-eng', role: 'Junior Engineer (E)', parentId: null },
            ],
        },
    })),
}));
const feedback = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@app/modules/common/components/ui/feedback', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@app/modules/common/components/ui/feedback')>()),
    ...feedback,
}));

import DepartmentConfigureForm from '../DepartmentConfigureForm';

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
    });
});

const it_ = { id: 'it', name: 'IT', code: 'IT', description: '', companyId: 'c1', isActive: true };

const renderForm = (props: Partial<React.ComponentProps<typeof DepartmentConfigureForm>> = {}) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <DepartmentConfigureForm show onClose={() => {}} {...props} />
        </QueryClientProvider>,
    );

beforeEach(() => {
    api.getDepartmentDesignations.mockResolvedValue({
        links: [{ departmentId: 'it', designationId: 'it-trainee' }],
        // Employees hold these under IT today; one of them is a filing mistake HR should not accept blindly.
        suggestions: [
            { departmentId: 'it', designationId: 'it-specialist', employees: 3 },
            { departmentId: 'it', designationId: 'junior-eng', employees: 1 },
        ],
    });
    api.setDepartmentDesignations.mockResolvedValue({});
    api.updateDepartmentById.mockResolvedValue({});
    api.createNewDepartment.mockResolvedValue({ data: { departments: [{ id: 'new-dept', name: 'Plumbing', companyId: 'c1' }] } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('DepartmentConfigureForm', () => {
    test('shows the department\'s linked designations and suggests the rest from its employees', async () => {
        renderForm({ isEditing: true, initialData: it_ });
        expect(await screen.findByText('IT Trainee')).toBeTruthy();
        expect(screen.getByText('Suggested from this department\'s employees')).toBeTruthy();
        expect(screen.getByText('IT Specialist · 3 people')).toBeTruthy();
        expect(screen.getByText('Junior Engineer (E) · 1 person')).toBeTruthy();
    });

    test('a suggestion is applied only when HR picks it, and saving sends exactly the chosen list', async () => {
        renderForm({ isEditing: true, initialData: it_ });
        await userEvent.click(await screen.findByText('IT Specialist · 3 people'));
        // The accepted suggestion leaves the suggestion list; the other stays unapplied.
        await waitFor(() => expect(screen.queryByText('IT Specialist · 3 people')).toBeNull());
        expect(screen.getByText('Junior Engineer (E) · 1 person')).toBeTruthy();

        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
        await waitFor(() => expect(api.setDepartmentDesignations).toHaveBeenCalledTimes(1));
        expect(api.setDepartmentDesignations).toHaveBeenCalledWith('it', ['it-trainee', 'it-specialist']);
        expect(api.updateDepartmentById).toHaveBeenCalledWith('it', expect.objectContaining({ companyId: 'c1', isActive: true }));
    });

    test('saving without changing the designations does not rewrite them', async () => {
        renderForm({ isEditing: true, initialData: it_ });
        await screen.findByText('IT Trainee');
        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
        await waitFor(() => expect(api.updateDepartmentById).toHaveBeenCalled());
        expect(api.setDepartmentDesignations).not.toHaveBeenCalled();
    });

    test('a new department links its chosen designations to the id the server returns', async () => {
        renderForm({ companyId: 'c1' });
        await userEvent.type(screen.getByLabelText(/department name/i), 'Plumbing');
        const picker = screen.getByLabelText('Designations in this department');
        await waitFor(() => expect(picker.hasAttribute('disabled')).toBe(false));
        await userEvent.click(picker);
        await userEvent.click(await within(document.body).findByText('IT Specialist'));
        await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
        await waitFor(() => expect(api.setDepartmentDesignations).toHaveBeenCalledWith('new-dept', ['it-specialist']));
    });

    test('a department name is required', async () => {
        renderForm({ companyId: 'c1' });
        await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
        expect(await screen.findByText('Department name is required')).toBeTruthy();
        expect(api.createNewDepartment).not.toHaveBeenCalled();
    });
});
