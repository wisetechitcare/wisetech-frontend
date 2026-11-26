import { afterEach, describe, expect, it, vi } from 'vitest';
import { geocodeAddress, toGeoPick } from './geocoding';

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

describe('geocodeAddress', () => {
  afterEach(() => vi.unstubAllGlobals());

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
    expect(await geocodeAddress('nowhere at all')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await geocodeAddress('anywhere')).toBeNull();
  });
});
