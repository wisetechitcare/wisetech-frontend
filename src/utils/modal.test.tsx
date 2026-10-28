// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DialogServiceHost, closeDialog } from '@app/modules/common/components/ui/dialogService';
import {
    customConfirmation,
    deleteConfirmation,
    errorConfirmation,
    type LeadUpdateMode,
} from './modal';

afterEach(() => {
    for (let i = 0; i < 20; i += 1) act(() => closeDialog());
    cleanup();
});

const button = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });

describe('utils/modal on the dialog service', () => {
    it('deleteConfirmation: confirm announces success, then resolves true', async () => {
        render(<DialogServiceHost />);
        let res!: Promise<boolean>;
        act(() => { res = deleteConfirmation('Record deleted'); });
        expect(screen.getByText('Confirm Deletion')).toBeTruthy();
        fireEvent.click(button('delete'));
        await waitFor(() => expect(screen.getByText('Record deleted')).toBeTruthy());
        // The success notice's button reads "OK" (it was "Dismiss" — MESSAGE_STYLE, 2026-10-25).
        fireEvent.click(button('ok'));
        await expect(res).resolves.toBe(true);
    });

    it('deleteConfirmation: announce false skips the success notice', async () => {
        render(<DialogServiceHost />);
        let res!: Promise<boolean>;
        act(() => { res = deleteConfirmation('Record deleted', 'Delete', 'Deleted', false); });
        fireEvent.click(button('delete'));
        await expect(res).resolves.toBe(true);
        expect(screen.queryByText('Record deleted')).toBeNull();
    });

    it('deleteConfirmation: cancel resolves false', async () => {
        render(<DialogServiceHost />);
        let res!: Promise<boolean>;
        act(() => { res = deleteConfirmation('Record deleted'); });
        fireEvent.click(button('cancel'));
        await expect(res).resolves.toBe(false);
    });

    it.each<[string, LeadUpdateMode]>([
        ['save revision', 'revision'],
        ['update only', 'updateOnly'],
        ['cancel', 'cancelled'],
    ])('customConfirmation: %s -> %s', async (label, expected) => {
        render(<DialogServiceHost />);
        let res!: Promise<LeadUpdateMode>;
        act(() => { res = customConfirmation(); });
        fireEvent.click(button(label));
        await expect(res).resolves.toBe(expected);
    });

    it('customConfirmation: Escape is an abort, never "update only"', async () => {
        render(<DialogServiceHost />);
        let res!: Promise<LeadUpdateMode>;
        act(() => { res = customConfirmation(); });
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        await expect(res).resolves.toBe('cancelled');
    });

    it('errorConfirmation keeps line breaks and renders plain text as text', async () => {
        render(<DialogServiceHost />);
        act(() => { void errorConfirmation('Line one\nR&D < 5 items'); });
        const body = screen.getByText(/Line one/);
        expect(body.querySelector('br')).toBeTruthy();
        expect(body.textContent).toBe('Line oneR&D < 5 items');
    });

    it('errorConfirmation sanitises caller markup', async () => {
        render(<DialogServiceHost />);
        act(() => { void errorConfirmation('<b>Failed</b><img src="x" onerror="alert(1)">'); });
        expect(screen.getByText('Failed').tagName).toBe('B');
        expect(document.querySelector('img')?.getAttribute('onerror') ?? null).toBeNull();
    });

    it('errorConfirmation resolves a DialogResult from Close', async () => {
        render(<DialogServiceHost />);
        let res!: Promise<unknown>;
        act(() => { res = errorConfirmation('Nope'); });
        // Two "close" buttons: the corner X (aria "Close") and the footer CTA. Click the CTA.
        const closes = screen.getAllByRole('button', { name: /^close$/i });
        fireEvent.click(closes[closes.length - 1]);
        await expect(res).resolves.toMatchObject({ isConfirmed: true, isDenied: false });
    });
});
