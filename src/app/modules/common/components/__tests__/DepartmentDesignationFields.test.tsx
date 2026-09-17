// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Department and Designation, dependent on each other — the pair the offer and requisition forms use.

vi.mock('@redux/store', () => ({ store: { getState: () => ({ appSettings: {} }) } }));

const departments = [
    { id: 'it', name: 'IT' },
    { id: 'accounts', name: 'Accounts' },
    { id: 'design', name: 'Design' },
];
const designations = [
    { id: 'it-trainee', role: 'IT Trainee', parentId: null },
    { id: 'it-specialist', role: 'IT Specialist', parentId: null },
    { id: 'accountant', role: 'Accountant', parentId: null },
    { id: 'draftsman', role: 'Draftsman', parentId: null },
];
// IT and Accounts are configured; Design is not.
const links = [
    { departmentId: 'it', designationId: 'it-trainee' },
    { departmentId: 'it', designationId: 'it-specialist' },
    { departmentId: 'accounts', designationId: 'accountant' },
];

vi.mock('@services/options', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/options')>()),
    fetchDepartments: vi.fn(async () => ({ data: { departments } })),
    fetchDesignations: vi.fn(async () => ({ data: { designations } })),
}));
vi.mock('@services/company', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@services/company')>()),
    getDepartmentDesignations: vi.fn(async () => ({ links, suggestions: [] })),
}));

import { DepartmentDesignationFields, type DepartmentDesignationValue } from '../DepartmentDesignationFields';

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
    });
});

let latest: DepartmentDesignationValue = { departmentId: null, designationId: null };
const Harness = ({ initial }: { initial: DepartmentDesignationValue }) => {
    const [value, setValue] = useState(initial);
    latest = value;
    return <DepartmentDesignationFields {...value} onChange={(next) => { latest = next; setValue(next); }} />;
};

const renderPair = async (initial: DepartmentDesignationValue = { departmentId: null, designationId: null }) => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Harness initial={initial} /></QueryClientProvider>);
    // Ready once the lists have loaded and the fields are enabled.
    await waitFor(() => expect(screen.getByRole('combobox', { name: /department/i }).getAttribute('aria-disabled')).not.toBe('true'));
};

const openAndList = async (name: RegExp) => {
    await userEvent.click(screen.getByRole('combobox', { name }));
    return (await screen.findAllByRole('option')).map((o) => o.textContent);
};

beforeEach(() => { latest = { departmentId: null, designationId: null }; });
afterEach(cleanup);

describe('DepartmentDesignationFields', () => {
    test('a configured department offers only its designations, and says so', async () => {
        await renderPair({ departmentId: 'it', designationId: null });
        expect(await openAndList(/designation/i)).toEqual(['IT Trainee', 'IT Specialist']);
        expect(screen.getByText("Showing IT's designations")).toBeTruthy();
    });

    test('an unconfigured department offers every designation and explains why', async () => {
        await renderPair({ departmentId: 'design', designationId: null });
        expect(await openAndList(/designation/i)).toHaveLength(4);
        expect(screen.getByText(/Design has no designations linked yet, so all are shown/)).toBeTruthy();
    });

    test('changing the department clears a designation the new department does not offer', async () => {
        await renderPair({ departmentId: 'it', designationId: 'it-trainee' });
        await userEvent.click(screen.getByRole('combobox', { name: /department/i }));
        await userEvent.click(await screen.findByRole('option', { name: 'Accounts' }));
        expect(latest).toEqual({ departmentId: 'accounts', designationId: null });
    });

    test('changing to a department that also offers the designation keeps it', async () => {
        await renderPair({ departmentId: 'design', designationId: 'accountant' });
        await userEvent.click(screen.getByRole('combobox', { name: /department/i }));
        await userEvent.click(await screen.findByRole('option', { name: 'Accounts' }));
        expect(latest).toEqual({ departmentId: 'accounts', designationId: 'accountant' });
    });

    test('choosing a designation first fills in its only department', async () => {
        await renderPair();
        await userEvent.click(screen.getByRole('combobox', { name: /designation/i }));
        await userEvent.click(await screen.findByRole('option', { name: 'IT Specialist' }));
        expect(latest).toEqual({ departmentId: 'it', designationId: 'it-specialist' });
    });

    test('an older record whose pairing no longer fits keeps its value and is flagged', async () => {
        await renderPair({ departmentId: 'it', designationId: 'draftsman' });
        expect(screen.getByText("Not a designation of IT. Choose one of IT's designations.")).toBeTruthy();
        expect(await openAndList(/designation/i)).toContain('Draftsman');
    });
});
