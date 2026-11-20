// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Tag } from 'lucide-react';
import ConfigPageLayout, { type ConfigTab } from './ConfigPageLayout';

afterEach(cleanup);

const TABS: ConfigTab[] = [
  { id: 'general', label: 'General', icon: Tag },
  { id: 'rates', label: 'Rates', icon: 'bi-percent', badge: 4 },
];

describe('ConfigPageLayout', () => {
  it('renders each tab with its label and count', () => {
    render(<ConfigPageLayout tabs={TABS} activeTab="general"><p>body</p></ConfigPageLayout>);
    expect(screen.getByRole('tab', { name: /General/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Rates/ })).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  /**
   * The bar used to be a `tablist` of `tab`s that controlled nothing — no panel existed, so the
   * tabs pointed at nowhere however right they looked. The body now sits in a `tabpanel`.
   */
  it('puts the body in a tab panel, and marks the active tab selected', () => {
    render(<ConfigPageLayout tabs={TABS} activeTab="rates"><p>body</p></ConfigPageLayout>);
    expect(screen.getByRole('tabpanel').textContent).toContain('body');
    expect(screen.getByRole('tab', { name: /Rates/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /General/ }).getAttribute('aria-selected')).toBe('false');
  });

  it('reports a tab change to the caller', () => {
    const onTabChange = vi.fn();
    render(<ConfigPageLayout tabs={TABS} activeTab="general" onTabChange={onTabChange}><p>body</p></ConfigPageLayout>);
    fireEvent.click(screen.getByRole('tab', { name: /Rates/ }));
    expect(onTabChange).toHaveBeenCalledWith('rates');
  });

  it('still shows a tab bar before the page has chosen a tab', () => {
    // `activeTab` is optional; a controlled bar with no value would otherwise select nothing.
    render(<ConfigPageLayout tabs={TABS}><p>body</p></ConfigPageLayout>);
    expect(screen.getByRole('tab', { name: /General/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('renders the body with no tab bar when no tabs are given', () => {
    render(<ConfigPageLayout><p>body</p></ConfigPageLayout>);
    expect(screen.getByText('body')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
