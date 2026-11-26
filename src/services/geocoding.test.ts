import { afterEach, describe, expect, it, vi } from 'vitest';
import { geocodeAddress, geocodeQueryCandidates, toGeoPick } from './geocoding';

describe('toGeoPick', () => {
  it('collapses town / village / municipality into city and builds the street line without repeats', () => {
    const pick = toGeoPick({
      lat: '19.07',
      lon: '72.87',
      display_name: 'Loonawat Compound, SV Road, Jogeshwari West, Mumbai, Maharashtra, 400102, India',
      name: 'Loonawat Compound',
      address: { road: 'SV Road', house_number: '12', suburb: 'Jogeshwari West', town: 'Mumbai', state: 'Maharashtra', postcode: '400102', country: 'India' },
    });
    expect(pick.lat).toBe(19.07);
    expect(pick.lng).toBe(72.87);
    expect(pick.city).toBe('Mumbai');
    expect(pick.street).toBe('Loonawat Compound, 12 SV Road, Jogeshwari West');
    expect(pick.postcode).toBe('400102');
  });

  it('reads a province as the state when there is no state', () => {
    expect(toGeoPick({ address: { province: 'Ontario' } }).state).toBe('Ontario');
  });
});

describe('geocodeQueryCandidates', () => {
  it('strips floor / opp noise and keeps locality + PIN fallbacks for a registered address', () => {
    const q = geocodeQueryCandidates(
      '1ST FLOOR, LOONAWAT COMPOUND, Ghaswala Estate, 142/147, Swami Vivekanand Rd, opp. 24 Karat, Shastri Nagar, Jogeshwari West, Mumbai, Maharashtra 400102',
    );
    expect(q[0]).toMatch(/1ST FLOOR/i);
    expect(q.some((c) => !/floor|opp\./i.test(c))).toBe(true);
    expect(q.some((c) => /Mumbai.*400102|400102/.test(c))).toBe(true);
    expect(q.length).toBeGreaterThan(1);
    expect(q.length).toBeLessThanOrEqual(4);
  });
});

describe('geocodeAddress', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the best match as a GeoPick', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => [{ lat: '18.52', lon: '73.85', address: { city: 'Pune' } }] })));
    const pick = await geocodeAddress('FC Road, Pune');
    expect(pick?.lat).toBe(18.52);
    expect(pick?.city).toBe('Pune');
  });

  it('returns null for an empty address without calling the geocoder', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await geocodeAddress('   ')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null when nothing matches or the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => [] })));
    vi.useFakeTimers();
    const pending = geocodeAddress('nowhere at all');
    await vi.runAllTimersAsync();
    expect(await pending).toBeNull();
    vi.useRealTimers();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await geocodeAddress('anywhere')).toBeNull();
  });

  it('falls back to a simpler query when the full address misses', async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      const q = decodeURIComponent(String(url).split('q=')[1] ?? '');
      if (/1ST FLOOR/i.test(q)) return { json: async () => [] };
      return { json: async () => [{ lat: '19.14', lon: '72.84', address: { city: 'Mumbai', postcode: '400102' } }] };
    });
    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers();
    const pending = geocodeAddress(
      '1ST FLOOR, LOONAWAT COMPOUND, Swami Vivekanand Rd, Jogeshwari West, Mumbai, Maharashtra 400102',
    );
    await vi.runAllTimersAsync();
    const pick = await pending;
    expect(pick?.lat).toBe(19.14);
    expect(pick?.city).toBe('Mumbai');
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });
});
