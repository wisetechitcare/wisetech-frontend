import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axios from 'axios';
import { createRole, fetchRoles } from './roles';
import { invalidateRequestCache } from './_requestCache';

// Guards the contract that stopped /api/roles being hit 20+ times per page load:
// concurrent callers share one request, and any mutation makes the next read fresh.
describe('roles service request cache', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset().mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
    vi.mocked(axios.post).mockReset().mockResolvedValue({ data: {} });
    invalidateRequestCache();
  });

  it('shares one in-flight request across concurrent callers', async () => {
    const [a, , c] = await Promise.all([fetchRoles(), fetchRoles(), fetchRoles()]);
    expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(1);
    expect(a).toEqual(c);
  });

  it('serves a repeat read from cache', async () => {
    await fetchRoles();
    await fetchRoles();
    expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(1);
  });

  it('refetches after a mutation invalidates the key', async () => {
    await fetchRoles();
    await createRole({ name: 'x' });
    await fetchRoles();
    expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2);
  });
});
