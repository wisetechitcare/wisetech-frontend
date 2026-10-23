// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik, useFormikContext } from 'formik';
import { toast } from '@app/modules/common/components/ui';
import { EnterpriseFormWizard } from './EnterpriseFormWizard';

vi.mock('@app/modules/common/components/ui', () => ({
  toast: vi.fn(),
  TRIO: { blue: { c: 'tone-blue' }, green: { c: 'tone-green' }, purple: { c: 'tone-purple' }, amber: { c: 'tone-amber' }, rose: { c: 'tone-rose' }, cyan: { c: 'tone-cyan' }, slate: { c: 'tone-slate' } },
  AppIcon: () => null,
  useUnsavedChangesGuard: (_dirty: boolean, close: () => void) => ({ requestClose: close, dialog: null }),
  FormSection: ({ children, title, tone }: any) => <section aria-label={title} data-testid="form-section" data-tone={tone?.c}>{children}</section>,
  GlassDialogActions: ({ children }: any) => <footer>{children}</footer>,
  WtButton: ({ children, onClick, disabled, 'aria-label': ariaLabel }: any) => <button type="button" aria-label={ariaLabel} onClick={onClick} disabled={disabled}>{children}</button>,
  WtIconButton: ({ children, onClick, title }: any) => <button type="button" aria-label={title} onClick={onClick}>{children}</button>,
  WtStepper: () => null,
  DetailGrid: ({ children }: any) => <div>{children}</div>,
  DetailCard: ({ title, subtitle, action, children }: any) => <article aria-label={title}><div>{subtitle}</div>{action}{children}</article>,
  KeyValueList: ({ rows }: any) => <dl>{rows.map((row: any) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>,
  SectionDivider: ({ label }: any) => <h2>{label}</h2>,
}));

function Field({ name }: { name: string }) {
  const { values, handleChange } = useFormikContext<any>();
  return <input aria-label={name} name={name} value={values[name] ?? ''} onChange={handleChange} />;
}

afterEach(() => {
  cleanup();
  vi.mocked(toast).mockClear();
});
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
});

const twoSteps = (profileExtra: Record<string, unknown> = {}) => [
  { id: 'profile', label: 'Profile', title: 'Profile', fields: ['name'], render: () => <><span>Profile editor</span><Field name="name" /></>, ...profileExtra },
  { id: 'contact', label: 'Contact', title: 'Contact', fields: ['email'], render: () => <><span>Contact editor</span><Field name="email" /></> },
];

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

  it('routes a failed submit to the first step with an error and focuses the field', async () => {
    const submit = vi.fn();
    render(<Formik initialValues={{ name: '', email: 'a@b.co' }} validate={(v) => (v.name ? {} : { name: 'Required' })} onSubmit={submit}>
      <EnterpriseFormWizard module="company" steps={twoSteps()} initialStep={1} summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn(), submitText: 'Create Company' }} />
    </Formik>);
    expect(screen.getByText('Contact editor')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create Company' }));
    await waitFor(() => expect(screen.getByText('Profile editor')).toBeTruthy());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'name' })));
    expect(submit).not.toHaveBeenCalled();
  });
});

describe('flat wizard review step', () => {
  it('moves submit onto the review, lists missing required counts and edits back', async () => {
    const submit = vi.fn();
    render(<Formik initialValues={{ name: '', email: '' }} onSubmit={submit}>
      <EnterpriseFormWizard module="company" steps={twoSteps({ requiredFields: ['name'] })} initialStep={1}
        summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn(), submitText: 'Create Company' }}
        review={{ rows: (stepId, values) => (stepId === 'profile' ? [{ label: 'Name', value: values.name }] : []) }} />
    </Formik>);
    // The last real step continues instead of submitting.
    expect(screen.queryByRole('button', { name: 'Create Company' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Review' })).toBeTruthy());
    expect(screen.getByText('1 required missing')).toBeTruthy();
    expect(screen.getByText('Optional · nothing entered')).toBeTruthy();
    // Denominator is the real steps only.
    expect(screen.getByText(/of 2 steps completed/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Company' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    expect(screen.getByText('Profile editor')).toBeTruthy();
  });

  it('submits from the review step', async () => {
    const submit = vi.fn();
    render(<Formik initialValues={{ name: 'Acme', email: '' }} onSubmit={submit}>
      <EnterpriseFormWizard module="company" steps={twoSteps()} initialStep={2}
        summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn(), submitText: 'Create Company' }} review={{}} />
    </Formik>);
    fireEvent.click(screen.getByRole('button', { name: 'Create Company' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });
});

describe('flat wizard draft status and tone', () => {
  const view = (actions: Record<string, unknown>) => <Formik initialValues={{ name: '' }} onSubmit={vi.fn()}>
    <EnterpriseFormWizard module="lead" steps={twoSteps()} summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn(), onSaveDraft: vi.fn(), ...actions }} />
  </Formik>;

  it('never shows "Saved" when the draft save failed or conflicted', () => {
    const { rerender } = render(view({ draftStatus: 'failed' }));
    expect(document.querySelector('[data-draft-status]')?.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Save failed — your changes are still here')).toBeTruthy();
    expect(screen.queryByText('Saved')).toBeNull();
    rerender(view({ draftStatus: 'conflict' }));
    expect(screen.getByText('Conflict — reload to see the latest')).toBeTruthy();
    expect(screen.queryByText('Saved')).toBeNull();
    // An in-flight save wins over the last outcome.
    rerender(view({ draftStatus: 'saved', isSavingDraft: true }));
    expect(screen.queryByText('Saved')).toBeNull();
    expect(document.querySelector('[data-draft-status]')?.getAttribute('data-draft-status')).toBe('saving');
    rerender(view({ draftStatus: 'saved' }));
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('falls back to TRIO.blue and honours a step tone', () => {
    const { unmount } = render(view({}));
    expect(screen.getByTestId('form-section').getAttribute('data-tone')).toBe('tone-blue');
    unmount();
    render(<Formik initialValues={{ name: '' }} onSubmit={vi.fn()}>
      <EnterpriseFormWizard module="lead" steps={twoSteps({ tone: { c: 'tone-custom', bg: '', bd: '' } })} summary={{ title: 'Summary', rows: [] }} actions={{ onCancel: vi.fn() }} />
    </Formik>);
    expect(screen.getByTestId('form-section').getAttribute('data-tone')).toBe('tone-custom');
  });
});
