/**
 * GSTIN rules for forms. MIRRORS wisetech-backend/src/utils/gstin.ts — the server
 * enforces the same rule on save; keep the two tables identical.
 */
export const GST_STATE_CODES: Record<string, string> = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
    "24": "Gujarat", "25": "Daman and Diu", "26": "Dadra and Nagar Haveli", "27": "Maharashtra",
    "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
    "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
};

/** The two-digit state code embedded in a GSTIN, or null if it isn't one. */
export const gstStateCode = (gstin?: string | null): string | null => {
    const code = (gstin ?? "").trim().slice(0, 2);
    return /^\d{2}$/.test(code) ? code : null;
};

/** "Maharashtra" → "27". Case/space-insensitive; null when the name isn't a GST state. */
export const gstStateCodeByName = (name?: string | null): string | null => {
    const wanted = (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!wanted) return null;
    const hit = Object.entries(GST_STATE_CODES).find(([, n]) => n.toLowerCase() === wanted);
    return hit ? hit[0] : null;
};

export const gstStateName = (gstin?: string | null, fallback?: string | null): string => {
    const code = gstStateCode(gstin);
    return (code && GST_STATE_CODES[code]) || fallback || "";
};

/** Base-36 alphabet the GSTIN check character is computed over. */
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * The 15th (check) character for the first 14 of a GSTIN — the GSTN algorithm:
 * weights alternate 1,2; each product folds to quotient + remainder in base 36;
 * check = (36 − sum mod 36) mod 36. Null when the input isn't 14 base-36 chars.
 */
export const gstinChecksum = (first14: string): string | null => {
    const s = first14.toUpperCase();
    if (!/^[0-9A-Z]{14}$/.test(s)) return null;
    let sum = 0;
    for (let i = 0; i < 14; i++) {
        const p = GSTIN_CHARS.indexOf(s[i]) * (i % 2 ? 2 : 1);
        sum += Math.floor(p / 36) + (p % 36);
    }
    return GSTIN_CHARS[(36 - (sum % 36)) % 36];
};

/**
 * Why a GSTIN is invalid, or null when it is valid. Offline only: valid means
 * well-formed and checksum-correct — NOT that it is registered or active.
 */
export const gstinError = (gstin?: string | null): string | null => {
    const g = (gstin ?? "").trim().toUpperCase();
    if (!g) return "GSTIN is empty";
    if (!/^[0-9A-Z]+$/.test(g)) return "GSTIN can only contain letters and digits";
    if (g.length !== 15) return `GSTIN must be 15 characters (got ${g.length})`;
    if (!GST_STATE_CODES[g.slice(0, 2)]) return `${g.slice(0, 2)} is not a GST state code`;
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(g.slice(2, 12))) return "Characters 3–12 are not a valid PAN";
    if (g[12] === "0") return "Entity number (13th character) cannot be 0";
    if (g[13] !== "Z") return "14th character must be Z";
    if (gstinChecksum(g.slice(0, 14)) !== g[14]) return "Checksum doesn't match — check for a typo";
    return null;
};

export const isValidGstin = (gstin?: string | null): boolean => gstinError(gstin) === null;

/** The PAN embedded in a valid GSTIN, else null. */
export const gstinPan = (gstin?: string | null): string | null =>
    isValidGstin(gstin) ? (gstin as string).trim().toUpperCase().slice(2, 12) : null;

/** Why a PAN is invalid or differs from the GSTIN's PAN, or null. Blank is allowed. */
export const panError = (pan?: string | null, gstin?: string | null): string | null => {
    const p = (pan ?? "").trim().toUpperCase();
    if (!p) return null;
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(p)) return "PAN must be 5 letters, 4 digits, then 1 letter (e.g. ABCDE1234F)";
    const fromGstin = gstinPan(gstin);
    return fromGstin && fromGstin !== p ? `PAN doesn't match the GST number (${fromGstin})` : null;
};

/** What each position may hold while typing. */
const GSTIN_SLOTS = [/\d/, /\d/, ...Array(5).fill(/[A-Z]/), ...Array(4).fill(/\d/), /[A-Z]/, /[1-9A-Z]/, /Z/, /[0-9A-Z]/] as RegExp[];
const PAN_SLOTS = [...Array(5).fill(/[A-Z]/), ...Array(4).fill(/\d/), /[A-Z]/] as RegExp[];

/**
 * Keystroke filter: upper-cases, drops spaces/symbols, and refuses a character that can't
 * go in its position or past the max length (keeps `prev`). Deletions always go through.
 */
const typedIn = (slots: RegExp[]) => (next: string, prev: string): string => {
    const v = next.toUpperCase().replace(/[^0-9A-Z]/g, "");
    const fits = v.length <= slots.length && [...v].every((c, i) => slots[i].test(c));
    return fits || v.length < prev.length ? v : prev;
};
export const typeGstin = typedIn(GSTIN_SLOTS);
export const typePan = typedIn(PAN_SLOTS);

/**
 * Why a GSTIN and a GST-address state disagree, or null when they agree (or there
 * is nothing to compare — a blank on either side is allowed).
 */
export const gstinStateMismatch = (gstin?: string | null, state?: string | null): string | null => {
    if (!(gstin ?? "").trim() || !(state ?? "").trim()) return null;
    const invalid = gstinError(gstin);
    if (invalid) return `GST Number: ${invalid}`;
    const code = gstStateCode(gstin) as string;
    const expected = GST_STATE_CODES[code];
    return gstStateCodeByName(state) === code
        ? null
        : `GST Number ${code}… is registered in ${expected}, but the GST state is ${state!.trim()}`;
};

/** GST state names, alphabetical — the GST State dropdown's full list. */
export const GST_STATE_NAMES = Object.values(GST_STATE_CODES).sort((a, b) => a.localeCompare(b));
