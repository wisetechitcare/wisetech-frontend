/**
 * Geocoding — the ONE place the app talks to a geocoder. Nominatim (OpenStreetMap): no key, no billing.
 *
 * Both keys this app carries are dead: VITE_APP_OPEN_CAGE_API_KEY returns "401 unknown API key" and
 * VITE_APP_GOOGLE_MAP_KEY returns REQUEST_DENIED (billing disabled). Nominatim asks for ≤1 request/sec —
 * callers debounce typing, and a pin drop or a button press is one call, so a form stays well inside that.
 *
 * Plain `fetch`, never the app's axios: that instance carries our JWT and treats any 401 as a session end,
 * so a geocoder rejecting a request would otherwise log the user out mid-form.
 *
 * Consumers: SmartLocationPicker (search + pin drop), Branches ("Get coordinates from address").
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
 * One request; for a "fill coordinates from address" button, not for search-as-you-type.
 */
export async function geocodeAddress(address: string): Promise<GeoPick | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const [best] = await searchPlaces(q, 1);
    if (!best) return null;
    const pick = toGeoPick(best);
    return Number.isFinite(pick.lat) && Number.isFinite(pick.lng) ? pick : null;
  } catch {
    return null;
  }
}
