import axios from "axios";
import type { GoogleContactCandidate } from "@pages/employee/companies/contacts/components/googleContactPrefill";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Google Contacts import — the browser's whole share of the OAuth flow.
 *
 * ─── THERE IS NO CLIENT SECRET HERE, AND THERE MUST NEVER BE ─────────────────────────
 * Vite inlines every `VITE_`-prefixed variable into the production bundle, where it is public
 * to anyone who opens devtools. The client id, the secret and the code exchange all live on the
 * backend. What crosses this boundary is a consent URL to open, and a projected list of
 * contacts to show — never a token, never a raw Google payload.
 */

const BASE = `${API_BASE_URL}/api/crm/contacts/google`;

export interface GoogleAuthStart {
    /** The Google consent URL to open. Minted by the backend with a signed state + PKCE. */
    authUrl: string;
}

export interface GoogleContactsResult {
    contacts: GoogleContactCandidate[];
    /** True when the account holds more contacts than one request will walk. */
    truncated: boolean;
    /** Which Google account these came from, so the admin can see they picked the right one. */
    googleAccountEmail: string | null;
    /** The organization the imported contacts will belong to. */
    organizationName: string | null;
}

/** Ask the backend for a consent URL. Nothing is fetched from Google until the admin consents. */
export const startGoogleContactsAuth = async (): Promise<GoogleAuthStart> => {
    const { data } = await axios.get(`${BASE}/auth-url`);
    return data.data;
};

/**
 * Trade the one-time code for the projected, match-annotated contact list.
 *
 * The access token never reaches this function — the backend exchanges the code, calls Google,
 * projects the response down to the fields this CRM can actually store, annotates each row with
 * its duplicate verdict, and drops the token. One round trip, nothing retained.
 */
export const fetchGoogleContacts = async (code: string, state: string): Promise<GoogleContactsResult> => {
    const { data } = await axios.post(`${BASE}/contacts`, { code, state });
    return data.data;
};

export interface GoogleImportResult {
    imported: Array<{ id: string; fullName: string }>;
    skipped: Array<{ fullName: string; reason: string }>;
}

/**
 * Create many CRM contacts from a picker selection.
 *
 * Sends only the mapped CRM fields — never the whole candidate. The verdict, the display label
 * and the photo URL are picker concerns; the server re-derives the verdict for itself anyway,
 * because a value that travelled through a browser is not evidence about the database.
 */
export const importGoogleContacts = async (
    contacts: Array<Record<string, unknown>>,
): Promise<GoogleImportResult> => {
    const { data } = await axios.post(`${BASE}/import`, { contacts });
    return data.data;
};
