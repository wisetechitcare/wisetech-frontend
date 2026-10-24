// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EntityIdentityHeader } from './EntityIdentityHeader';

afterEach(cleanup);

describe('EntityIdentityHeader', () => {
  it('renders the name, the meta line with falsy items dropped, and initials without a photo', () => {
    const { container } = render(
      <EntityIdentityHeader
        title="Asha Verma"
        avatar={{ name: 'Asha Verma', status: 'active' }}
        meta={['Engineer', null, '', false, 'Platform', '#E-104']}
      />,
    );
    expect(screen.getByText('Asha Verma')).toBeTruthy();
    expect(screen.getByText('Engineer')).toBeTruthy();
    expect(screen.getByText('Platform')).toBeTruthy();
    expect(screen.getByText('#E-104')).toBeTruthy();
    // 3 surviving items → 2 separators.
    expect(screen.getAllByText('·')).toHaveLength(2);
    expect(screen.getByText('AV')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders a photo when src is given', () => {
    const { container } = render(
      <EntityIdentityHeader title="Asha" avatar={{ name: 'Asha', src: 'https://example.com/a.png' }} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('accepts a ready-made avatar node', () => {
    render(<EntityIdentityHeader title="Acme" avatar={<span data-testid="custom-avatar" />} />);
    expect(screen.getByTestId('custom-avatar')).toBeTruthy();
  });

  it('renders contact links, with plain text when there is no href', () => {
    render(
      <EntityIdentityHeader
        title="Asha"
        links={[
          { icon: 'phone', label: '+91 98765 43210', href: 'tel:+919876543210' },
          { icon: 'geolocation', label: 'Pune' },
        ]}
      />,
    );
    const phone = screen.getByRole('link', { name: '+91 98765 43210' });
    expect(phone.getAttribute('href')).toBe('tel:+919876543210');
    expect(screen.getByText('Pune').closest('a')).toBeNull();
  });

  it('calls onBack from an accessible Back button and renders actions', () => {
    const back = vi.fn();
    render(
      <EntityIdentityHeader title="Asha" onBack={back} actions={<button type="button">Edit details</button>} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeTruthy();
  });

  it('has no Back button without onBack', () => {
    render(<EntityIdentityHeader title="Asha" />);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('compact variant hides links but keeps title, chips and meta', () => {
    render(
      <EntityIdentityHeader
        variant="compact"
        title="Asha Verma"
        avatar={{ name: 'Asha Verma' }}
        chips={<span>Active</span>}
        meta={['Engineer', 'Platform']}
        links={[{ icon: 'sms', label: 'asha@example.com', href: 'mailto:asha@example.com' }]}
      />,
    );
    expect(screen.getByText('Asha Verma')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Engineer')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText('asha@example.com')).toBeNull();
  });

  it('exposes a long string name in full via title for the truncated text', () => {
    const long = 'Asha Verma With An Exceptionally Long Legal Name That Will Not Fit';
    render(<EntityIdentityHeader title={long} />);
    expect(screen.getByText(long).getAttribute('title')).toBe(long);
  });
});
