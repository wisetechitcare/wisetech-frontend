/**
 * An imported Google contact → the EXISTING Contact form's initial values.
 *
 * ─── THIS IS THE WHOLE INTEGRATION ───────────────────────────────────────────────────
 * There is no Google-specific contact form, no Google-specific create endpoint and no
 * Google-specific write path. The import hands `ClientContactsForm` its opening values and then
 * gets out of the way: the form validates, the form submits, the existing service creates the
 * contact. So an imported contact cannot end up in a state a manually typed one could not, a
 * field added to the form later is automatically part of the import, and there is exactly one
 * place where contact validation lives.
 *
 * PURE — no React, no network. The mapping is the part worth testing and it is testable alone.
 */

import type { ContactFormValues } from '@models/companies';

/** What the backend's projection hands us. Mirrors MappedGoogleContact in the API. */
export interface GoogleContactCandidate {
    googleResourceId: string | null;
    displayLabel: string;
    organizationName: string | null;
    photoUrl: string | null;
    unmapped: string[];
    verdict: 'EXACT' | 'LIKELY' | 'POSSIBLE' | 'NEW';
    reason: string;
    matchedContactId: string | null;
    /** The colliding CRM row's own details, so the picker can show both sides side by side. */
    matchedContact: { id: string; fullName: string; phone: string | null; email: string | null } | null;
    /** The SERVER's answer on whether this may be imported. The UI reads it, never re-derives it. */
    importBlocked: boolean;
    fields: {
        fullName: string;
        phone: string | null;
        phone2: string | null;
        email: string | null;
        roleInCompany: string | null;
        address: string | null;
        area: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        zipCode: string | null;
        dateOfBirth: string | null;
        anniversary: string | null;
        gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
        note: string | null;
    };
}

/**
 * The shape `ClientContactsForm` actually reads off `initialData`.
 *
 * Typed against what the component READS, not against `ContactFormValues` — the component's
 * prop is declared as `Partial<ContactFormValues>` but its body reads `dateOfBirth`,
 * `serviceMappings` and `branch`, which are Contact ROW field names. Writing this interface
 * against the real reads is what keeps the prefill from silently missing a field.
 */
export interface ContactFormPrefill {
    fullName?: string;
    phone?: string;
    phone2?: string;
    email?: string;
    roleInCompany?: string;
    address?: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    dateOfBirth?: string;
    anniversary?: string;
    gender?: string;
    note?: string;
    /**
     * The form's own vocabulary: a DISPLAY label, which its submit upper-cases and
     * underscores into the enum (`'Everyone'` → `EVERYONE`). Typed against
     * `ContactFormValues` so a future rename of those labels breaks here rather than
     * silently saving a visibility nobody chose.
     */
    visibility?: ContactFormValues['visibility'];
    googleResourceId?: string;
    /** The Google-hosted address. The SERVER copies it into our storage; it is never stored. */
    googlePhotoUrl?: string;
}

/** The form renders `initialData.x || ""`, so a null would print "null" in the box. */
const s = (v: string | null | undefined): string | undefined => (v == null || v === '' ? undefined : v);

export const toContactFormPrefill = (candidate: GoogleContactCandidate): ContactFormPrefill => {
    const f = candidate.fields;
    const prefill: ContactFormPrefill = {
        fullName: s(f.fullName),
        phone: s(f.phone),
        phone2: s(f.phone2),
        email: s(f.email),
        roleInCompany: s(f.roleInCompany),
        address: s(f.address),
        area: s(f.area),
        city: s(f.city),
        state: s(f.state),
        country: s(f.country),
        zipCode: s(f.zipCode),
        dateOfBirth: s(f.dateOfBirth),
        anniversary: s(f.anniversary),
        gender: s(f.gender),
        note: s(f.note),
        /**
         * "Everyone", where a manually created contact opens on "Only Me".
         *
         * Deliberate, and the one place this diverges from the manual form's defaults. The
         * requirement for an imported contact is that it belongs to the COMPANY rather than to
         * the admin who happened to click import, and `EVERYONE` is that sentence written in
         * the column that exists to hold it. Defaulting it to "Only Me" would have the record
         * claim to be the importer's private contact, which is precisely the outcome the
         * ownership requirement rules out.
         *
         * (The column is inert today — no query reads `visibility`, and the form's own radio
         * group for it is commented out. This sets it correctly anyway, so that if either is
         * ever switched on, imported contacts do not all have to be repaired.)
         */
        visibility: 'Everyone',
        googleResourceId: s(candidate.googleResourceId),
        googlePhotoUrl: s(candidate.photoUrl),
    };

    // Strip the keys we resolved to undefined so the form's own `|| ""` defaults take over
    // rather than being handed a key whose value is undefined.
    (Object.keys(prefill) as Array<keyof ContactFormPrefill>).forEach((k) => {
        if (prefill[k] === undefined) delete prefill[k];
    });
    return prefill;
};

/**
 * A picked contact as the CREATE-API payload, for the bulk path.
 *
 * Sibling of `toContactFormPrefill`, not a replacement for it. They target different consumers
 * and their vocabularies genuinely differ: the form speaks in display labels it upper-cases on
 * submit ("Everyone"), the API speaks the stored enum ("EVERYONE"). Collapsing them into one
 * shape would mean one of the two callers translating, which is the translation layer arriving
 * by the back door.
 *
 * What it sends is a SUBSET of what the form sends, deliberately. No `statusId`, no
 * `contactRoleId`, no `companyId`, no `serviceIds` — Google supplies none of them, and the
 * server's `stripUnknown` validation would drop anything else anyway. Everything omitted falls
 * to the same column default a hand-typed contact gets.
 */
export const toContactCreatePayload = (candidate: GoogleContactCandidate): Record<string, unknown> => {
    const f = candidate.fields;
    const payload: Record<string, unknown> = {
        fullName: f.fullName,
        phone: f.phone,
        phone2: f.phone2,
        email: f.email,
        roleInCompany: f.roleInCompany,
        address: f.address,
        area: f.area,
        city: f.city,
        state: f.state,
        country: f.country,
        zipCode: f.zipCode,
        dateOfBirth: f.dateOfBirth,
        anniversary: f.anniversary,
        gender: f.gender,
        note: f.note,
        // The enum, not the form's label — this goes straight to the API. Same meaning as the
        // form path's 'Everyone': the contact belongs to the company, not to the importer.
        visibility: 'EVERYONE',
        googleResourceId: candidate.googleResourceId,
        googlePhotoUrl: candidate.photoUrl,
    };
    // `status` is deliberately absent: the manual form does not send it either, so both paths
    // take the column's own DRAFT default. An imported contact should not be a different KIND
    // of record from a typed one.
    Object.keys(payload).forEach((k) => {
        if (payload[k] === null || payload[k] === undefined || payload[k] === '') delete payload[k];
    });
    return payload;
};

/**
 * Country / state / city arrive as NAMES, and the form's selectors are ID-driven dropdowns fed
 * by the geo master (`/api/location/geo/...`).
 *
 * The values still SAVE correctly: the form's submit falls back to the raw string when an id
 * does not resolve (`selectedCountryData?.name || formValues.country`), and the column stores a
 * name anyway. What the admin sees is the text in place with the dropdown not highlighting a
 * match — the same thing that already happens when editing any existing contact, because those
 * rows also store names.
 *
 * ponytail: names not resolved to geo ids. Resolving all three would mean driving the form's
 * country→state→city cascade from outside it, in a 1,557-line component, for a display nicety
 * on a limitation that already exists on the edit path. If the dropdowns are made to match on
 * edit, fix both there in one change rather than teaching the import its own cascade.
 */
export const UNRESOLVED_LOCATION_NOTE =
    'Country, state and city are filled in as text. Re-pick them from the dropdowns if you want them matched to the location list.';
