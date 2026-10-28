// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { UnderlineTabs } from './patterns';

afterEach(cleanup);

describe('UnderlineTabs responsiveness', () => {
  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'projects', label: 'Projects' },
    { key: 'access', label: 'Access' },
  ] as const;

  test('scrolls the selected tab into view when it is clipped', () => {
    const { rerender } = render(
      <UnderlineTabs tabs={tabs} value="details" onChange={() => {}} />,
    );
    const tabList = screen.getByRole('tablist');
    const accessTab = screen.getByRole('tab', { name: 'Access' });

    Object.defineProperty(tabList, 'scrollLeft', { configurable: true, writable: true, value: 0 });
    tabList.getBoundingClientRect = () => ({
      left: 0, right: 200, top: 0, bottom: 40, width: 200, height: 40, x: 0, y: 0, toJSON: () => ({}),
    });
    accessTab.getBoundingClientRect = () => ({
      left: 180, right: 260, top: 0, bottom: 40, width: 80, height: 40, x: 180, y: 0, toJSON: () => ({}),
    });

    act(() => {
      rerender(<UnderlineTabs tabs={tabs} value="access" onChange={() => {}} />);
    });

    expect(tabList.scrollLeft).toBe(60);
  });

  test('keeps the selected tab visible when the viewport resizes', () => {
    render(<UnderlineTabs tabs={tabs} value="access" onChange={() => {}} />);
    const tabList = screen.getByRole('tablist');
    const accessTab = screen.getByRole('tab', { name: 'Access' });

    Object.defineProperty(tabList, 'scrollLeft', { configurable: true, writable: true, value: 0 });
    tabList.getBoundingClientRect = () => ({
      left: 0, right: 200, top: 0, bottom: 40, width: 200, height: 40, x: 0, y: 0, toJSON: () => ({}),
    });
    accessTab.getBoundingClientRect = () => ({
      left: 180, right: 260, top: 0, bottom: 40, width: 80, height: 40, x: 180, y: 0, toJSON: () => ({}),
    });

    act(() => fireEvent(window, new Event('resize')));

    expect(tabList.scrollLeft).toBe(60);
  });
});
