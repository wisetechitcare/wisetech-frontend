/**
 * Dial code ↔ country, for the phone input's flag button.
 *
 * `PhoneNumberInput` keeps the dial code out of the text field and prints it beside the
 * flag, so on mount it has to turn a STORED dial code ("91") back into a country ("in").
 * That table used to be 44 entries typed out by hand — the countries someone thought of.
 * Any code outside it fell through to the default, so the form showed a confident "+91"
 * over a record holding something else: one employee sat on a stored "504" that no form
 * would admit to, because Honduras had never been added to the list.
 *
 * Derived from `react-international-phone`'s country table — already a dependency — so
 * the button can restore every country the dropdown offers (218, not 44) and a hand-kept
 * list can no longer fall behind. Only the DATA is used from that package; the input
 * itself is still `react-phone-input-2`.
 */
import { defaultCountries, parseCountry } from 'react-international-phone';

const COUNTRIES = defaultCountries.map(parseCountry);

/**
 * Dial codes are NOT unique — +1 covers US/CA/PR/DO/KY, +7 Russia and Kazakhstan. The
 * dataset already marks the primary country of each code with the lowest `priority`, so
 * sort worst-first and let the last write win, rather than keeping a second hand-written
 * list of preferences that would rot the same way the first one did.
 */
export const DIAL_CODE_TO_ISO: Record<string, string> = Object.fromEntries(
  [...COUNTRIES]
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .map((country) => [country.dialCode, country.iso2]),
);

/** Not an inverse of the above — exact, because every country has one dial code. */
export const ISO_TO_DIAL_CODE: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((country) => [country.iso2, country.dialCode]),
);
