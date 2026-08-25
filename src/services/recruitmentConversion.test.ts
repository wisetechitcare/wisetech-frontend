import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({ default: { patch: vi.fn() } }));

// sessionStorage does not exist in the node test environment.
const store = new Map<string, string>();
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => (store.has(k) ? store.get(k) : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
});

import { stashConversion, takeConversion, clearConversion } from './recruitment';

// Guards the convert-to-employee hand-off. Both halves matter: a hired candidate must
// get linked to the employee they became, and an abandoned conversion must never
// attach a later, unrelated employee to that application.
describe('convert-to-employee hand-off', () => {
  beforeEach(() => {
    store.clear();
    vi.useRealTimers();
  });

  it('hands the stashed application id to the wizard', () => {
    stashConversion('app-1');
    expect(takeConversion()).toBe('app-1');
  });

  it('clears the stash, so one conversion can only link once', () => {
    stashConversion('app-1');
    takeConversion();
    expect(takeConversion()).toBeNull();
  });

  it('drops an abandoned stash once its TTL has passed', () => {
    vi.useFakeTimers();
    stashConversion('app-1');
    vi.advanceTimersByTime(31 * 60_000);
    expect(takeConversion()).toBeNull();
  });

  it('discards a pending stash when the draft is thrown away', () => {
    stashConversion('app-1');
    clearConversion();
    expect(takeConversion()).toBeNull();
  });
});
