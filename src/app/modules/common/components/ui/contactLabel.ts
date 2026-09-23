/**
 * What a CRM contact is CALLED in a list: "Manish (A2O Realty)".
 *
 * ─── WHY THE COMPANY IS PART OF THE NAME ─────────────────────────────────────────────
 * The address book holds six thousand contacts and plenty of repeated first names. A row that
 * says only "Manish" is not a row anybody can pick from — the company is the thing that tells
 * nine of them apart, and it is the word a person reaches for when narrowing ("manish a2o").
 * The contacts table has shown the name this way for a long time; every picker did not, which
 * is how the same person read as identifiable on one screen and ambiguous on the next.
 *
 * ─── A SUB-COMPANY NAMES ITS PARENT TOO ──────────────────────────────────────────────
 * "(Vashi)" alone says nothing — there are branches called Vashi under three different groups.
 * So a sub-company reads "A&O Realty (Vashi)", the same shape the contacts table's Company
 * column uses. The parent comes from the row; the table resolves it from a map of every company
 * it has loaded, which a paged picker holding 25 rows cannot do — hence `company` and
 * `subCompany.mainCompany` in the API's light projection.
 *
 * PURE — no React, no fetch. This is the rule the label, the search and the tests all share.
 */

/** The fields of a contact this module reads. Narrower than the row, on purpose. */
export interface ContactNameFields {
    fullName?: string | null;
    company?: { companyName?: string | null } | null;
    subCompany?: {
        subCompanyName?: string | null;
        mainCompany?: { companyName?: string | null } | null;
    } | null;
}

/**
 * The company half, or empty when the contact has none on file.
 *
 * Direct company first: it is the common case and the more specific answer. A contact with
 * BOTH is filed under the company, and the sub-company is a detail of where — the table makes
 * the same choice.
 */
export const contactCompanyName = (c: ContactNameFields): string => {
    const direct = c.company?.companyName?.trim();
    if (direct) return direct;
    const sub = c.subCompany?.subCompanyName?.trim();
    if (!sub) return '';
    const parent = c.subCompany?.mainCompany?.companyName?.trim();
    return parent ? `${parent} (${sub})` : sub;
};

/**
 * "Manish (A2O Realty)", or just the name when there is no company to add.
 *
 * Never the uuid, and never an empty string: a contact with no name still has to be pickable
 * and un-pickable again, which takes a label. Same fallback the people pickers already use.
 */
export const contactLabel = (c: ContactNameFields): string => {
    const name = c.fullName?.trim() || 'Unnamed contact';
    const company = contactCompanyName(c);
    return company ? `${name} (${company})` : name;
};

/** Named in full up to this many; past it the rest are counted. */
const MAX_NAMED = 3;

/**
 * "Bipradip and Manish have no email address on file — the invitation cannot reach them."
 *
 * ─── WHY THIS IS SAID AT ALL ─────────────────────────────────────────────────────────
 * A contact with no email is a guest the invitation silently does not go to. Nothing said so:
 * the meeting saved, the toggle said the invitation was sent, and the one person who most
 * needed telling never heard. The recipient list is built from whoever HAS an address, so the
 * gap is invisible at every later step too — there is no bounce to notice.
 *
 * NAMED, not counted. "1 participant has no email" asks the reader to open each chip and work
 * out which; the name is the only part they can act on. Past three the list is longer than the
 * sentence it is in, so the rest are counted — the reader has the point by then, and the chips
 * carry their own marker.
 *
 * Returns '' for nobody, so a caller renders nothing rather than an empty notice.
 */
export const missingEmailNotice = (names: string[]): string => {
    const clean = names.map((n) => n.trim()).filter(Boolean);
    if (!clean.length) return '';
    const shown = clean.slice(0, MAX_NAMED);
    const rest = clean.length - shown.length;
    const last = rest
        ? `${rest} other${rest === 1 ? '' : 's'}`
        : shown.pop() as string;
    const list = shown.length ? `${shown.join(', ')} and ${last}` : last;
    // "has" for one person, "have" for any number above it — including "and 2 others".
    // "them" either way: it is the right singular pronoun for a name whose bearer we do not
    // know the pronouns of, which is every name in a CRM.
    const verb = clean.length === 1 ? 'has' : 'have';
    return `${list} ${verb} no email address on file, so the invitation cannot reach them.`;
};
