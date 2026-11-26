// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { IFormSection } from '@models/company';
import FormSchemaManager from './index';

afterEach(cleanup);

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
      }),
    });
  }
});

const SECTIONS: IFormSection[] = [
  {
    id: 'basic', title: 'BASIC INFORMATION', isSystem: true,
    fields: [{ id: 'name', label: 'Name', type: 'text', required: true, isSystem: true, value: '', showOnInfoPage: true }],
  },
  {
    id: 'extra', title: 'EXTRA', isSystem: false,
    fields: [
      { id: 'moved', label: 'GST number', type: 'text', required: false, isSystem: true, value: '', showOnInfoPage: true },
      { id: 'custom', label: 'Emergency contact', type: 'text', required: false, isSystem: false, value: '', showOnInfoPage: true },
    ],
  },
];

function setup() {
  const onSave = vi.fn();
  render(<FormSchemaManager show sections={SECTIONS} onSave={onSave} onClose={() => {}} />);
  return { onSave, dialog: screen.getByRole('dialog', { name: /manage form fields/i }) };
}

const sectionButton = (dialog: HTMLElement, title: string) =>
  within(within(dialog).getByRole('navigation', { name: 'Sections' })).getByRole('button', { name: new RegExp(`^${title}`, 'i') });

describe('FormSchemaManager', () => {
  it('never offers Delete on a built-in field, only on custom ones', () => {
    const { dialog } = setup();
    fireEvent.click(sectionButton(dialog, 'EXTRA'));
    expect(within(dialog).queryByRole('button', { name: 'Delete GST number' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Delete Emergency contact' })).toBeTruthy();
  });

  it('deleting a custom section sends its built-in fields back to the first built-in section', async () => {
    const { dialog, onSave } = setup();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete EXTRA' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /apply changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls[0][0] as IFormSection[];
    expect(saved.map(s => s.id)).toEqual(['basic']);
    expect(saved[0].fields.map(f => f.id)).toEqual(['name', 'moved']);
  });

  it('refuses to apply while a field has no label, and says why', async () => {
    const { dialog, onSave } = setup();
    fireEvent.change(within(dialog).getByLabelText(/field label/i), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /apply changes/i }));
    await waitFor(() => expect(within(dialog).getByText('Label is required')).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('applies edits: the section title is stored in capitals', async () => {
    const { dialog, onSave } = setup();
    fireEvent.change(within(dialog).getByLabelText(/section name/i), { target: { value: 'Company basics' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /apply changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect((onSave.mock.calls[0][0] as IFormSection[])[0].title).toBe('COMPANY BASICS');
  });
});
