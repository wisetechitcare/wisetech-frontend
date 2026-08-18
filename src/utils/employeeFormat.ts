/**
 * Display formatters for employee fields whose STORED shape differs from their
 * readable one. Both of these existed as private copies inside
 * `ShowEmployeeDetailsById`; they live here because the ID card needed the same two
 * conversions and reimplementing them produced "9987221079 × 91" and "AB_POS" on a
 * printed badge. One definition, every surface.
 *
 * Formatting is deliberately CLIENT-side. The API sends the stored values unchanged —
 * same rule the company date standard follows (wire stays ISO, display is applied at
 * the render site, see utils/dateFormats.ts).
 */

/**
 * Merge a phone number with its country dial code: `+91 9987221079`.
 *
 * The onboarding phone input stores the dial code (e.g. `"91"`) in the *Extension*
 * field — it is a country code, not a PBX extension. Appending it as one produced
 * "9987221079 x 91", which reads as an extension and puts the code at the wrong end.
 *
 * Returns the bare number when no code is stored. That is correct rather than
 * defaulting to a country: some records lost their code, and a badge must not invent
 * one. Those rows need backfilling in the data, not a guess here.
 */
export const formatPhoneWithCode = (
  number?: string | null,
  code?: string | null,
  fallback = '-NA-',
): string => {
  const trimmedNumber = number?.trim();
  if (!trimmedNumber) return fallback;

  const trimmedCode = code?.trim().replace(/^\+/, '');
  if (!trimmedCode) return trimmedNumber;

  // Guard against double-prefixing a number that already carries its code.
  if (trimmedNumber.startsWith('+')) return trimmedNumber;

  return `+${trimmedCode} ${trimmedNumber}`;
};

/**
 * Enum name → the notation people actually write: `AB_POS` → `AB+`.
 *
 * Blood group is stored as the Prisma enum's NAME in two places — `Users.bloodGroup`
 * (a real enum, whose `@map("AB+")` is the DB value, NOT what the client receives) and
 * `EmployeeEmergencyDetails.bloodGroup` (a plain string column the onboarding form
 * fills with the same `AB_POS` tokens). Either can reach a display surface.
 *
 * Unrecognised input passes through untouched, so a legacy row that already holds
 * `"AB+"` renders correctly instead of being blanked.
 */
const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A-',
  B_POS: 'B+', B_NEG: 'B-',
  AB_POS: 'AB+', AB_NEG: 'AB-',
  O_POS: 'O+', O_NEG: 'O-',
};

export const formatBloodGroup = (bloodGroup?: string | null, fallback = '-NA-'): string => {
  const trimmed = bloodGroup?.trim();
  if (!trimmed) return fallback;
  return BLOOD_GROUP_LABELS[trimmed.toUpperCase()] ?? trimmed;
};

/**
 * The blood-group picker's options, DERIVED from the same map the formatter uses.
 *
 * The onboarding form used to declare its own copy of these pairs. Two lists that must
 * agree is how a token ends up selectable in the form but unrenderable everywhere else
 * — deriving them means adding a group is a one-line change that cannot go half-done.
 */
export const BLOOD_GROUP_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => ({ value, label }));
