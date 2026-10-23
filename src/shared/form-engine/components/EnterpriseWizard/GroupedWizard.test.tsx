// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik } from 'formik';
import { GroupedWizard, type WizardGroup } from './GroupedWizard';

vi.mock('@app/modules/common/components/ui', () => ({
  toast: vi.fn(), TRIO: { blue: {} },
  T: { color: { brandGradientLeftToRight: 'linear-gradient(90deg, navy, blue)', onBrand: '#fff', brandSoft: '#eef2ff', brand: '#1e3a8a', line: '#e5e7eb' } },
  AppIcon: () => null, IconBox: () => null,
  FormSection: ({ children }: any) => <section>{children}</section>,
  GlassDialogActions: ({ children }: any) => <footer>{children}</footer>,
  WtStepper: ({ steps, onStepClick }: any) => <div>{steps.map((step: any, index: number) => <button key={step.label} type="button" onClick={() => onStepClick(index)}>{step.label}</button>)}</div>,
  WtButton: ({ children, onClick, disabled }: any) => <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
  WtIconButton: ({ children, onClick, title }: any) => <button type="button" aria-label={title} onClick={onClick}>{children}</button>,
}));

afterEach(cleanup);
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

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
});
