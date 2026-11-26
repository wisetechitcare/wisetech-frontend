/**
 * Geocoding — the ONE place the app talks to a geocoder.
 *
 * **SSOT today: Nominatim (OpenStreetMap)** — no key, no billing. Funded upgrade later: Google Places /
 * Mapbox / Loqate behind the same `searchPlaces` / `geocodeAddress` / `toGeoPick` surface so
 * LocationFields typeahead does not rewrite when billing lands.
 *
 * Dead keys in env (do not revive without billing): VITE_APP_OPEN_CAGE_API_KEY (401), VITE_APP_GOOGLE_MAP_KEY
 * (REQUEST_DENIED). Nominatim asks for ≤1 request/sec — debounce typeahead; progressive fallbacks sleep
 * between candidates.
 *
 * Plain `fetch`, never the app's axios: that instance carries our JWT and treats any 401 as a session end,
 * so a geocoder rejecting a request would otherwise log the user out mid-form.
 *
 * Consumers: LocationFields typeahead + Get Coordinates (Create Tenant / Branches), SmartLocationPicker.
 */

export const NOMINATIM = 'https://nominatim.openstreetmap.org';

/**
 * Reverse-geocoding detail levels.
 *
 * POINT_ZOOM (18, building) resolves the street under the pin. Nominatim happens to default to it, but the
 * default is not contractual and a coarser one would quietly return a suburb centroid instead of the address.
 *
 * AREA_ZOOM (14, suburb/locality) is only used to read the postcode. Postcodes tagged on individual buildings
 * are sparse and inconsistent in OSM, so reading them at building level makes the same locality report
 * different codes from click to click; the locality boundary carries one code for the whole area.
 */
export const POINT_ZOOM = 18;
export const AREA_ZOOM = 14;

/** Nominatim polite-use gap between progressive fallback queries (ms). */
const NOMINATIM_GAP_MS = 1100;

export interface GeoPick {
  lat: number;
  lng: number;
  /** Nominatim's full display_name — street through to country. */
  formatted: string;
  /**
   * Just the street line: house number, road, and the named place it sits in.
   *
   * `formatted` repeats the city, district, state, postcode and country that a form already collects in
   * their own fields, so writing it into an "Address" input duplicates half the form. Callers that have
   * those fields separately want this.
   */
  street: string;
  country: string;
  state: string;
  city: string;
  locality: string;
  postcode: string;
  googleMapLink: string;
}

/**
 * One Nominatim result as a GeoPick. Nominatim's `address` bag varies by country — a city arrives as `city`,
 * `town`, `village` or `municipality` depending on how OSM classifies the place; this collapses those to the
 * single field a form actually has.
 */
export const toGeoPick = (result: any): GeoPick => {
  const a = result?.address ?? {};
  const lat = Number(result?.lat);
  const lng = Number(result?.lon);

  // Street line, most specific first. `name` catches a named building or complex that OSM records without
  // a house number. Duplicates are dropped because Nominatim often repeats the same string across
  // name/road/neighbourhood for a single-entity result.
  const street = Array.from(
    new Set(
      [
        result?.name,
        [a.house_number, a.road].filter(Boolean).join(' '),
        a.neighbourhood ?? a.residential,
        a.suburb,
      ]
        .map((part) => (part ?? '').toString().trim())
        .filter(Boolean),
    ),
  ).join(', ');

  return {
    lat,
    lng,
    formatted: result?.display_name ?? '',
    street,
    country: a.country ?? '',
    state: a.state ?? a.province ?? '',
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '',
    locality: a.suburb ?? a.neighbourhood ?? a.city_district ?? a.residential ?? '',
    postcode: a.postcode ?? '',
    googleMapLink: `https://www.google.com/maps/@${lat},${lng},17z`,
  };
};

const tidyQuery = (q: string) =>
  q
    .replace(/\s*,\s*/g, ', ')
    .replace(/^,+|,+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Progressive Nominatim queries for a noisy registered / branch address.
 *
 * Floor lines, "opp. …", and long compound names often return zero hits for the full string;
 * peeling those off and then falling back to locality + PIN recovers coordinates without a key.
 * Cap is small so a button click stays inside Nominatim's ≤1 req/sec budget.
 */
export function geocodeQueryCandidates(address: string): string[] {
  const raw = tidyQuery(address);
  if (!raw) return [];

  const out: string[] = [];
  const push = (q: string) => {
    const t = tidyQuery(q);
    if (t && !out.includes(t)) out.push(t);
  };

  push(raw);

  const cleaned = tidyQuery(
    raw
      .replace(/\b\d+(?:st|nd|rd|th)\s+floor\b/gi, '')
      .replace(/\b(?:ground|first|second|third|basement)\s+floor\b/gi, '')
      .replace(/\bopp\.?\s+[^,]+/gi, '')
      .replace(/\b(?:near|behind|beside|facing)\s+[^,]+/gi, '')
      .replace(/\b\d+\s*\/\s*\d+\b/g, ''),
  );
  push(cleaned);

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) push(parts.slice(-3).join(', '));
  if (parts.length >= 2) push(parts.slice(-2).join(', '));

  const pin = raw.match(/\b\d{6}\b/);
  if (pin) {
    const locality = parts.find((p) =>
      /\b(mumbai|pune|delhi|bengaluru|bangalore|hyderabad|chennai|kolkata|ahmedabad|jaipur|surat)\b/i.test(p),
    );
    if (locality) push(`${locality} ${pin[0]}`);
    else push(pin[0]);
  }

  return out.slice(0, 4);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Places matching free text, best first (raw Nominatim results; map them with {@link toGeoPick}). */
export async function searchPlaces(query: string, limit = 6): Promise<any[]> {
  const res = await fetch(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** The place at a point, or null when Nominatim has no address there. */
export async function reverseGeocode(lat: number, lng: number, zoom: number = POINT_ZOOM): Promise<any | null> {
  const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=${zoom}&lat=${lat}&lon=${lng}`);
  const data = await res.json();
  return data?.address ? data : null;
}

/**
 * The best match for a typed address, as a GeoPick — or null when nothing matches or the lookup fails.
 * Tries progressive simplifications when the full line misses (registered addresses with floor / opp. noise).
 * One button press; respects Nominatim's ≤1 request/sec between fallbacks.
 */
export async function geocodeAddress(address: string): Promise<GeoPick | null> {
  const queries = geocodeQueryCandidates(address);
  if (!queries.length) return null;
  try {
    for (let i = 0; i < queries.length; i++) {
      if (i > 0) await sleep(NOMINATIM_GAP_MS);
      const [best] = await searchPlaces(queries[i]!, 1);
      if (!best) continue;
      const pick = toGeoPick(best);
      if (Number.isFinite(pick.lat) && Number.isFinite(pick.lng)) return pick;
    }
    return null;
  } catch {
    return null;
  }
}
