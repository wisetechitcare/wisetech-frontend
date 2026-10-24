// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// The timeout is read at module load, so the env is stubbed in a hoisted block — it runs
// before the guard is imported below.
vi.hoisted(() => {
  vi.stubEnv('VITE_APP_IDLE_TIMEOUT_MINUTES', '2');
});

const dispatch = vi.fn();
const logoutApi = vi.fn(() => Promise.resolve());
const removeAuth = vi.fn();
let auth: { token: string; id: number } | undefined = { token: 't', id: 1 };

vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));
vi.mock('@redux/slices/auth', () => ({ logoutUser: () => ({ type: 'auth/logout' }) }));
vi.mock('@services/auth', () => ({ logout: (...args: unknown[]) => logoutApi(...(args as [])) }));
vi.mock('@app/modules/auth/core/AuthHelpers', () => ({
  AUTH_LOCAL_STORAGE_KEY: 'kt-auth-react-v',
  getAuth: () => auth,
  removeAuth: () => removeAuth(),
}));

import { IdleLogoutGuard } from './IdleLogoutGuard';

const ACTIVITY_KEY = 'wt_last_activity_at';
const TIMEOUT_MS = 2 * 60 * 1000; // VITE_APP_IDLE_TIMEOUT_MINUTES=2
const WARN_AT_MS = TIMEOUT_MS - 60 * 1000;

const realLocation = window.location;

beforeAll(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } });
});

afterAll(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  auth = { token: 't', id: 1 };
  dispatch.mockClear();
  logoutApi.mockClear();
  removeAuth.mockClear();
  window.location.href = '';
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

/** Mount and idle until the check loop raises the warning. */
const mountAndIdleToWarning = async () => {
  render(<IdleLogoutGuard />);
  await advance(WARN_AT_MS);
  expect(screen.getByText('Session Expiring')).toBeTruthy();
};

const countdown = () => document.querySelector('strong')?.textContent;

describe('IdleLogoutGuard', () => {
  it('shows the kit warning dialog with a live countdown', async () => {
    await mountAndIdleToWarning();
    expect(countdown()).toBe('60');
    await advance(1000);
    expect(countdown()).toBe('59');
    expect(screen.getByRole('button', { name: /stay signed in/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy();
  });

  it('"Stay signed in" closes the warning, records activity and does not log out', async () => {
    await mountAndIdleToWarning();
    const before = Number(localStorage.getItem(ACTIVITY_KEY));
    fireEvent.click(screen.getByRole('button', { name: /stay signed in/i }));
    await advance(1000);
    expect(screen.queryByText('Session Expiring')).toBeNull();
    expect(Number(localStorage.getItem(ACTIVITY_KEY))).toBeGreaterThan(before);
    // The old deadline passes without a logout — the activity pushed it out.
    await advance(60 * 1000);
    expect(logoutApi).not.toHaveBeenCalled();
    expect(removeAuth).not.toHaveBeenCalled();
  });

  it('"Sign out" logs out through the server and clears the session', async () => {
    await mountAndIdleToWarning();
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await advance(0);
    expect(logoutApi).toHaveBeenCalledWith('t', 1);
    expect(removeAuth).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
    expect(window.location.href).toBe('/auth');
  });

  it('ignores Escape and pointer activity while the warning is open', async () => {
    await mountAndIdleToWarning();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.mouseMove(window);
    await advance(1000);
    expect(screen.getByText('Session Expiring')).toBeTruthy();
    expect(logoutApi).not.toHaveBeenCalled();
  });

  it('logs out when the deadline passes with the warning still open', async () => {
    await mountAndIdleToWarning();
    await advance(60 * 1000);
    expect(logoutApi).toHaveBeenCalledTimes(1);
    expect(removeAuth).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/auth');
  });

  it('activity in another tab dismisses the warning programmatically, with no logout', async () => {
    await mountAndIdleToWarning();
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    await advance(5000);
    await advance(1000);
    expect(screen.queryByText('Session Expiring')).toBeNull();
    expect(logoutApi).not.toHaveBeenCalled();
    expect(removeAuth).not.toHaveBeenCalled();
  });
});
