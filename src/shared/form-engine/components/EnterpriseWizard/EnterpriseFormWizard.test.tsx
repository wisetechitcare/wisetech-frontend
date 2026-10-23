// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Form, Formik } from 'formik';
import { toast } from 'react-toastify';
import { EnterpriseFormWizard } from './EnterpriseFormWizard';

// The steps layout (Lead / Company / Contact) is the production design restored as-is; it
// reports through react-toastify. The sections layout is covered by GroupedWizard.test.tsx.
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@app/pages/employee/forms/shared/Workspace.css', () => ({}));
vi.mock('./GroupedWizard', () => ({ GroupedWizard: () => <div>grouped layout</div> }));

afterEach(() => {
  cleanup();
  vi.mocked(toast.error).mockClear();
});

const steps = [{ id: 'profile', label: 'Profile', title: 'Profile', fields: ['name'], render: () => <span>Profile editor</span> }];

describe('EnterpriseFormWizard', () => {
  it('routes layout="sections" to GroupedWizard', () => {
    render(<Formik initialValues={{}} onSubmit={vi.fn()}>
      {/* GroupedWizard is mocked; only the routing decision is under test. */}
      <EnterpriseFormWizard {...({ layout: 'sections', groups: [] } as any)} />
    </Formik>);
    expect(screen.getByText('grouped layout')).toBeTruthy();
  });

  it('submits the Formik form for company/contact-style hosts', async () => {
    const submit = vi.fn();
    // The final button is a native submit: production hosts wrap the wizard in Formik's <Form>.
    render(<Formik initialValues={{ name: 'Acme' }} onSubmit={submit}>
      <Form>
        <EnterpriseFormWizard module="company" steps={steps} summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn(), submitText: 'Create Company' }} />
      </Form>
    </Formik>);
    fireEvent.click(screen.getByRole('button', { name: 'Create Company' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });

  it('validates before invoking update and revision callbacks', async () => {
    const update = vi.fn();
    const revision = vi.fn();
    const view = (invalid: boolean) => <Formik initialValues={{ name: '' }} validate={() => invalid ? { name: 'Required' } : {}} onSubmit={vi.fn()}>
      <EnterpriseFormWizard module="lead" steps={steps} summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn(), onSaveUpdate: update, onSaveRevision: revision }} />
    </Formik>;
    const { rerender } = render(view(true));
    fireEvent.click(screen.getByRole('button', { name: /Save as Update/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(update).not.toHaveBeenCalled();
    rerender(view(false));
    fireEvent.click(screen.getByRole('button', { name: /Save as Revision/ }));
    await waitFor(() => expect(revision).toHaveBeenCalledTimes(1));
    expect(update).not.toHaveBeenCalled();
  });
});
