// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DialogServiceHost, closeDialog, showDialog, updateDialog, type DialogResult } from './dialogService';
import { alertDialog, confirmDialog } from './feedback';

/** Drain anything a failed test left queued, so the next test starts empty. */
function drain() {
  for (let i = 0; i < 20; i += 1) act(() => closeDialog());
}

afterEach(() => {
  drain();
  cleanup();
});

const button = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });

describe('dialogService', () => {
  it('shows a dialog queued BEFORE the host mounted', async () => {
    const pending = showDialog({ title: 'Queued early', message: 'Before mount' });
    render(<DialogServiceHost />);
    expect(screen.getByText('Queued early')).toBeTruthy();
    expect(screen.getByText('Before mount')).toBeTruthy();
    fireEvent.click(button('confirm'));
    await expect(pending).resolves.toEqual({ isConfirmed: true, isDenied: false, isDismissed: false });
  });

  it('shows one dialog at a time, first in first out', async () => {
    render(<DialogServiceHost />);
    let first!: Promise<DialogResult>;
    let second!: Promise<DialogResult>;
    act(() => {
      first = showDialog({ title: 'First dialog' });
      second = showDialog({ title: 'Second dialog' });
    });
    expect(screen.getByText('First dialog')).toBeTruthy();
    expect(screen.queryByText('Second dialog')).toBeNull();
    fireEvent.click(button('confirm'));
    await expect(first).resolves.toMatchObject({ isConfirmed: true });
    await waitFor(() => expect(screen.getByText('Second dialog')).toBeTruthy());
    fireEvent.click(button('cancel'));
    await expect(second).resolves.toEqual({
      isConfirmed: false, isDenied: false, isDismissed: true, dismiss: 'cancel',
    });
  });

  it('resolves a deny from the secondary button', async () => {
    render(<DialogServiceHost />);
    let res!: Promise<DialogResult>;
    act(() => { res = showDialog({ title: 'Three ways', denyLabel: 'Update Only' }); });
    fireEvent.click(button('update only'));
    await expect(res).resolves.toEqual({ isConfirmed: false, isDenied: true, isDismissed: false });
  });

  it('reports the corner X as dismiss: close', async () => {
    render(<DialogServiceHost />);
    let res!: Promise<DialogResult>;
    act(() => { res = showDialog({ title: 'Closable' }); });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await expect(res).resolves.toMatchObject({ isDismissed: true, dismiss: 'close' });
  });

  it('returns the input value and blocks confirm while a required input is empty', async () => {
    render(<DialogServiceHost />);
    let res!: Promise<DialogResult>;
    act(() => {
      res = showDialog({ title: 'Name it', input: { label: 'Name', required: true } });
    });
    const confirm = button('confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Quarterly' } });
    expect((button('confirm') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button('confirm'));
    await expect(res).resolves.toEqual({
      isConfirmed: true, isDenied: false, isDismissed: false, value: 'Quarterly',
    });
  });

  it('seeds the input from defaultValue', async () => {
    render(<DialogServiceHost />);
    let res!: Promise<DialogResult>;
    act(() => { res = showDialog({ title: 'Rename', input: { defaultValue: 'Copy' } }); });
    fireEvent.click(button('confirm'));
    await expect(res).resolves.toMatchObject({ value: 'Copy' });
  });

  it('closeDialog dismisses the current dialog with dismiss: close', async () => {
    render(<DialogServiceHost />);
    let res!: Promise<DialogResult>;
    act(() => { res = showDialog({ title: 'Programmatic' }); });
    act(() => closeDialog());
    await expect(res).resolves.toEqual({
      isConfirmed: false, isDenied: false, isDismissed: true, dismiss: 'close',
    });
  });

  it('updateDialog patches the open dialog in place', () => {
    render(<DialogServiceHost />);
    act(() => { void showDialog({ title: 'Signing out', message: 'In 30 seconds' }); });
    expect(screen.getByText('In 30 seconds')).toBeTruthy();
    act(() => updateDialog({ message: 'In 29 seconds' }));
    expect(screen.getByText('In 29 seconds')).toBeTruthy();
    expect(screen.queryByText('In 30 seconds')).toBeNull();
  });

  it('sanitises html before rendering it', () => {
    render(<DialogServiceHost />);
    act(() => {
      void showDialog({ title: 'Markup', html: '<b>bold</b><img src="x" onerror="alert(1)">' });
    });
    expect(screen.getByText('bold').tagName).toBe('B');
    const img = document.querySelector('img');
    expect(img?.getAttribute('onerror') ?? null).toBeNull();
  });

  it('showCancel: false renders a single acknowledge button', () => {
    render(<DialogServiceHost />);
    act(() => { void showDialog({ variant: 'success', title: 'Done', showCancel: false }); });
    expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
    expect(button('ok')).toBeTruthy();
  });
});

describe('feedback helpers on the dialog service', () => {
  it('confirmDialog resolves true on confirm and false on cancel', async () => {
    render(<DialogServiceHost />);
    let yes!: Promise<boolean>;
    act(() => { yes = confirmDialog({ title: 'Archive it?', confirmText: 'Archive' }); });
    fireEvent.click(button('archive'));
    await expect(yes).resolves.toBe(true);

    let no!: Promise<boolean>;
    act(() => { no = confirmDialog({ title: 'Delete it?', danger: true }); });
    await waitFor(() => expect(screen.getByText('Delete it?')).toBeTruthy());
    fireEvent.click(button('cancel'));
    await expect(no).resolves.toBe(false);
  });

  it('alertDialog resolves a DialogResult from its single button', async () => {
    render(<DialogServiceHost />);
    let res!: Promise<DialogResult>;
    act(() => { res = alertDialog({ icon: 'error', title: 'Failed', text: 'Try again' }); });
    expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
    fireEvent.click(button('ok'));
    await expect(res).resolves.toMatchObject({ isConfirmed: true });
  });
});
