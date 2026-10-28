// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDiscardConfirm } from './useDiscardConfirm';

afterEach(cleanup);

function Host({ dirty, onClose }: { dirty: boolean; onClose: () => void }) {
  const discard = useDiscardConfirm(() => dirty, onClose, { title: 'Discard this role?' });
  return <><button type="button" onClick={discard.requestClose}>Cancel wizard</button>{discard.dialog}</>;
}

describe('useDiscardConfirm', () => {
  it('closes straight away when nothing changed', () => {
    const onClose = vi.fn();
    render(<Host dirty={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel wizard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard this role?')).toBeNull();
  });

  it('asks first when dirty; Keep editing stays, Discard closes', async () => {
    const onClose = vi.fn();
    render(<Host dirty onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel wizard' }));
    expect(screen.getByText('Discard this role?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /keep editing/i }));
    expect(onClose).not.toHaveBeenCalled();
    // MUI keeps the page aria-hidden until the closing transition ends.
    fireEvent.click(await waitFor(() => screen.getByRole('button', { name: 'Cancel wizard' })));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
