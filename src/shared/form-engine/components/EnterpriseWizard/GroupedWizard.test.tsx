// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik, useFormikContext } from 'formik';
import { toast } from '@app/modules/common/components/ui';
import { GroupedWizard, type WizardGroup } from './GroupedWizard';

vi.mock('@app/modules/common/components/ui', () => ({
  toast: vi.fn(),
  TRIO: { blue: { c: 'tone-blue' }, green: { c: 'tone-green' }, purple: { c: 'tone-purple' }, amber: { c: 'tone-amber' }, rose: { c: 'tone-rose' }, cyan: { c: 'tone-cyan' }, slate: { c: 'tone-slate' } },
  T: { color: { brandGradientLeftToRight: 'linear-gradient(90deg, navy, blue)', onBrand: '#fff', brandSoft: '#eef2ff', brand: '#1e3a8a', line: '#e5e7eb' } },
  AppIcon: () => null, IconBox: () => null,
  FormSection: ({ children, title, desc, tone }: any) => <section data-testid="form-section" data-title={title} data-desc={desc} data-tone={tone?.c}>{children}</section>,
  GlassDialogActions: ({ children }: any) => <footer>{children}</footer>,
  WtStepper: ({ steps, onStepClick }: any) => <div>{steps.map((step: any, index: number) => <button key={step.label} type="button" onClick={() => onStepClick(index)}>{step.label}</button>)}</div>,
  WtButton: ({ children, onClick, disabled, 'aria-label': ariaLabel }: any) => <button type="button" aria-label={ariaLabel} onClick={onClick} disabled={disabled}>{children}</button>,
  WtIconButton: ({ children, onClick, title }: any) => <button type="button" aria-label={title} onClick={onClick}>{children}</button>,
  DetailGrid: ({ children }: any) => <div>{children}</div>,
  DetailCard: ({ title, subtitle, action, children, tone }: any) => <article aria-label={title} data-tone={tone?.c}><div>{subtitle}</div>{action}{children}</article>,
  KeyValueList: ({ rows }: any) => <dl>{rows.map((row: any) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>,
  SectionDivider: ({ label }: any) => <h2>{label}</h2>,
}));

/** A real input bound to Formik, so focus can be asserted. */
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

const baseProps = {
  sectionProps: {}, headerTitle: 'Profile', isSubmitting: false, isEditMode: false,
  onCancel: () => {}, submitText: 'Create',
};

const twoLeafGroups = (extra: Partial<WizardGroup<object>['children'][number]> = {}): WizardGroup<object>[] => [{
  id: 'profile', label: 'Profile', icon: 'profile-circle', children: [
    { id: 'identity', label: 'Identity', title: 'Identity', subtitle: 'Who they are', icon: null, fields: ['name', 'email'], render: () => <><span>Identity editor</span><Field name="name" /><Field name="email" /></>, ...extra },
    { id: 'notes', label: 'Notes', title: 'Notes', icon: null, fields: ['notes'], render: () => <><span>Notes editor</span><Field name="notes" /></> },
  ],
}];

describe('shared grouped wizard', () => {
  it('requires validation of an opened optional section before counting completion', async () => {
    const groups: WizardGroup<object>[] = [{
      id: 'profile', label: 'Profile', icon: null, children: [
        { id: 'identity', label: 'Identity', title: 'Identity', icon: null, fields: ['name'], render: () => <span>Identity editor</span> },
        { id: 'notes', label: 'Notes', title: 'Notes', icon: null, fields: ['notes'], render: () => <span>Notes editor</span> },
      ],
    }];
    render(<Formik initialValues={{ name: '', notes: '' }} onSubmit={() => {}}>
      <GroupedWizard groups={groups} sectionProps={{}} headerTitle="Profile" isSubmitting={false} isEditMode={false} onCancel={() => {}} onFinalSave={() => {}} submitText="Create" />
    </Formik>);
    expect(screen.getByText('0 of 2 sections completed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Profile · 1 of 2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByText('Notes editor')).toBeTruthy();
    expect(screen.getByText('0 of 2 sections completed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(screen.getByText('1 of 2 sections completed')).toBeTruthy());
    expect(screen.getByText('Notes editor')).toBeTruthy();
  });

  it('routes a failed final submit to the first section with an error and focuses the field', async () => {
    const onFinalSave = vi.fn();
    render(<Formik initialValues={{ name: '', email: '', notes: '' }} validate={(v) => (v.email ? {} : { email: 'Required' })} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups()} initialLeafId="notes" onFinalSave={onFinalSave} />
    </Formik>);
    expect(screen.getByText('Notes editor')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('Identity editor')).toBeTruthy());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'email' })));
    expect(onFinalSave).not.toHaveBeenCalled();
  });

  it('adds a Review step that lists missing required counts, edits back and carries the submit', async () => {
    const onFinalSave = vi.fn();
    render(<Formik initialValues={{ name: '', email: '', notes: 'Met at fair' }} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups({ requiredFields: ['name', 'email'] })} onFinalSave={onFinalSave}
        review={{ rows: (stepId, values) => (stepId === 'notes' ? [{ label: 'Notes', value: values.notes }] : []) }} />
    </Formik>);
    // Standing on Identity (exempt from the forward gate), jump to Review from the rail.
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Review' })).toBeTruthy();
    expect(screen.getByText('2 required missing')).toBeTruthy();
    expect(screen.getByText('Met at fair')).toBeTruthy();
    // The review is never a section to complete.
    expect(screen.getByText('0 of 2 sections completed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();

    // An empty row list leaves the card body out.
    expect(screen.getByRole('article', { name: 'Identity' }).querySelector('dl')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Identity' }));
    expect(screen.getByText('Identity editor')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull();
    // Focus follows the jump to the section heading instead of dropping to <body>.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Identity' })));
  });

  it('refuses to submit from the review while a section still misses a requirement', async () => {
    const onFinalSave = vi.fn();
    render(<Formik initialValues={{ name: '', email: '', notes: '' }} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups({ requiredFields: ['name'] })} onFinalSave={onFinalSave} review={{}} />
    </Formik>);
    // Standing on Identity (exempt from the rail gate), jump straight to Review.
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('Identity editor')).toBeTruthy());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', title: 'Complete the required fields in "Identity" first.' }));
    expect(onFinalSave).not.toHaveBeenCalled();
  });

  it('turns the last leaf into Continue when a review is configured, and submits from the review', async () => {
    const onFinalSave = vi.fn();
    render(<Formik initialValues={{ name: 'Asha', email: 'a@b.co', notes: '' }} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups()} initialLeafId="notes" onFinalSave={onFinalSave} review={{ title: 'Check & submit' }} />
    </Formik>);
    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Check & submit' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onFinalSave).toHaveBeenCalledTimes(1));
  });

  it('never shows "Saved" when the draft save failed or conflicted', () => {
    const view = (draftStatus: any) => <Formik initialValues={{ name: '', email: '', notes: '' }} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups()} onFinalSave={() => {}} draftStatus={draftStatus} />
    </Formik>;
    const { rerender } = render(view('failed'));
    expect(document.querySelector('[data-draft-status]')?.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Save failed — your changes are still here')).toBeTruthy();
    expect(screen.queryByText('Saved')).toBeNull();
    rerender(view('conflict'));
    expect(screen.getByText('Conflict — reload to see the latest')).toBeTruthy();
    expect(screen.queryByText('Saved')).toBeNull();
    rerender(view('saved'));
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('falls back to TRIO.blue, passes the subtitle as the section description and keeps one heading', () => {
    const { unmount } = render(<Formik initialValues={{ name: '', email: '', notes: '' }} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups()} onFinalSave={() => {}} />
    </Formik>);
    const section = screen.getByTestId('form-section');
    expect(section.getAttribute('data-tone')).toBe('tone-blue');
    expect(section.getAttribute('data-desc')).toBe('Who they are');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Identity']);
    expect(document.querySelector('[data-group-icon]')).not.toBeNull();
    unmount();

    render(<Formik initialValues={{ name: '', email: '', notes: '' }} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups({ tone: { c: 'tone-custom', bg: '', bd: '' } })} onFinalSave={() => {}} />
    </Formik>);
    expect(screen.getByTestId('form-section').getAttribute('data-tone')).toBe('tone-custom');
  });

  it('renders the identity slot at the top of the rail', () => {
    render(<Formik initialValues={{ name: '', email: '', notes: '' }} onSubmit={() => {}}>
      <GroupedWizard {...baseProps} groups={twoLeafGroups()} onFinalSave={() => {}} identity={<div>Asha Rao</div>} />
    </Formik>);
    const nav = screen.getByRole('navigation', { name: 'Wizard sections' });
    expect(nav.firstElementChild?.textContent).toBe('Asha Rao');
  });
});
