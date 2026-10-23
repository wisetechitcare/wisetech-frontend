// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WtWizardDialog } from './WtWizardDialog';
import { useUnsavedChangesRegistration } from './UnsavedChangesProvider';

function DirtyContent() {
  useUnsavedChangesRegistration(true);
  return <input aria-label="Edited field" />;
}

afterEach(cleanup);

describe('WtWizardDialog', () => {
  it('renders the branded workflow identity once and exposes its close action', async () => {
    const close = vi.fn();
    render(<WtWizardDialog open onClose={close} title="Candidate" closeLabel="Close candidate"><form><input aria-label="First name" /></form></WtWizardDialog>);
    expect(screen.getByRole('dialog', { name: 'Candidate' })).toBeTruthy();
    expect(screen.getAllByText('Candidate')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close candidate' }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('draws a neutral 1px rule under the header, not the 3px brand accent', () => {
    render(<WtWizardDialog open onClose={vi.fn()} title="Employee"><input aria-label="First name" /></WtWizardDialog>);
    const header = screen.getByText('Employee').closest('div')?.parentElement?.parentElement as HTMLElement;
    expect(getComputedStyle(header).borderBottomWidth).toBe('1px');
  });

  it('routes Escape through the dialog close boundary', async () => {
    const close = vi.fn();
    render(<WtWizardDialog open onClose={close} title="Company"><input aria-label="Company name" /></WtWizardDialog>);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Company' }), { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('waits for one discard confirmation when the dialog owns the guard', async () => {
    const close = vi.fn();
    render(<WtWizardDialog open onClose={close} title="Company"><DirtyContent /></WtWizardDialog>);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: /keep editing/i }));
    expect(close).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('delegates to a host guard without opening a second discard dialog', async () => {
    const hostClose = vi.fn();
    render(<WtWizardDialog open onClose={hostClose} title="Candidate" closeGuard="host"><DirtyContent /></WtWizardDialog>);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(hostClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
  });
});
