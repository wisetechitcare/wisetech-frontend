/**
 * Coordinates for an attendance cell's map pin.
 *
 * Pure and dependency-free so it can be unit-tested without mounting a table. The type and
 * `hasValidMapCoordinates` used to live in `AttendanceCheckCell.tsx`, which re-exports both,
 * so every existing import keeps working.
 */

export interface AttendanceCoordinates {
  lat: number;
  lng: number;
}

/**
 * A usable map point.
 *
 * `0,0` is rejected on purpose: it is the null island in the Atlantic, and it is what the
 * write paths store when a punch carried no geolocation (`Number(undefined) || 0`). Linking
 * to it would claim an employee punched in off the coast of Africa.
 */
export function hasValidMapCoordinates(
  coordinates?: AttendanceCoordinates | null
): coordinates is AttendanceCoordinates {
  if (!coordinates) return false;
  const { lat, lng } = coordinates;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    !(lat === 0 && lng === 0)
  );
}

/** A row in the `location` prop — one entry per attendance row, holding its CHECK-IN point. */
interface RowLocationEntry {
  id?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/**
 * The point a cell should link to, or null when it should render no link at all.
 *
 * `allowRowFallback` exists because the two halves of a day are NOT symmetric. The row entry
 * in the `location` prop holds the CHECK-IN's coordinates, so falling back to it for a
 * check-out draws the morning pin inside an empty evening cell. That reads as "checked out
 * here" and hides the fact that no checkout exists — it is how a missing checkout went
 * unnoticed for WT-107 on 16 Sept 2026: the row showed "Check out missing" and a live Maps
 * link at the same time, and the link was believed.
 *
 * So: the check-in cell may fall back to the row entry; the check-out cell must not. A
 * check-out links to its own recorded coordinates or to nothing.
 */
export function resolveAttendanceCoordinates(
  rowId: string | undefined,
  locationProp: RowLocationEntry[] | undefined,
  lat?: number | null,
  lng?: number | null,
  allowRowFallback: boolean = true
): AttendanceCoordinates | null {
  const entry =
    allowRowFallback && Array.isArray(locationProp) && rowId
      ? locationProp.find((item) => item.id === rowId)
      : undefined;

  const resolvedLat = lat ?? entry?.latitude;
  const resolvedLng = lng ?? entry?.longitude;
  if (resolvedLat == null || resolvedLng == null) return null;

  const coords = { lat: Number(resolvedLat), lng: Number(resolvedLng) };
  return hasValidMapCoordinates(coords) ? coords : null;
}
