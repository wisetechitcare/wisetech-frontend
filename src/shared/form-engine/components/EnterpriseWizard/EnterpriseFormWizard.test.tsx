// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik } from 'formik';
import { toast } from '@app/modules/common/components/ui';
import { EnterpriseFormWizard } from './EnterpriseFormWizard';

vi.mock('@app/modules/common/components/ui', () => ({
  toast: vi.fn(), TRIO: { blue: {} }, AppIcon: () => null,
  useUnsavedChangesGuard: (_dirty: boolean, close: () => void) => ({ requestClose: close, dialog: null }),
  FormSection: ({ children, title }: any) => <section aria-label={title}>{children}</section>,
  GlassDialogActions: ({ children }: any) => <footer>{children}</footer>,
  WtButton: ({ children, onClick, disabled }: any) => <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
  WtIconButton: ({ children, onClick, title }: any) => <button type="button" aria-label={title} onClick={onClick}>{children}</button>,
  WtStepper: () => null,
}));

afterEach(cleanup);

describe('flat wizard save actions', () => {
  const steps = [{ id: 'profile', label: 'Profile', title: 'Profile', fields: ['name'], render: () => <span>Profile editor</span> }];

  it('submits the Formik form for company/contact-style hosts', async () => {
    const submit = vi.fn();
    render(<Formik initialValues={{ name: 'Acme' }} onSubmit={submit}>
      <EnterpriseFormWizard module="company" steps={steps} summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn(), submitText: 'Create Company' }} />
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
    fireEvent.click(screen.getByRole('button', { name: 'Save as Update' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error' })));
    expect(update).not.toHaveBeenCalled();
    rerender(view(false));
    fireEvent.click(screen.getByRole('button', { name: 'Save as Revision' }));
    await waitFor(() => expect(revision).toHaveBeenCalledTimes(1));
    expect(update).not.toHaveBeenCalled();
  });
});
