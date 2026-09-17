/**
 * Joins the parts of an address, skipping any already said.
 *
 * Needed because the sources feeding the meeting form's location picker are not the same
 * shape. A geocoded `projectAddress` is a COMPLETE address — "Thakurwadi, Matheran, Karjat
 * Taluka, Raigad, Maharashtra, 410102, India" — and appending its own city, state and zip
 * after it produced "…Maharashtra, 410102, India, Maharashtra, 410102". Other rows carry no
 * full string at all and only make sense assembled from the parts. Rather than a branch per
 * source, every part is offered and the repeats are dropped.
 *
 * ponytail: a plain substring test, so a genuinely different part that happens to be contained
 * in an earlier one ("Thane" inside "Thanewadi") is dropped too. It costs a redundant-looking
 * token in a label nobody would have read twice anyway; a token-boundary match is the upgrade
 * if that ever turns up in a real address.
 */
export const joinAddress = (parts: Array<string | null | undefined>): string => {
    const kept: string[] = [];
    for (const raw of parts) {
        const part = String(raw ?? '').trim();
        if (!part) continue;
        if (kept.join(', ').toLowerCase().includes(part.toLowerCase())) continue;
        kept.push(part);
    }
    return kept.join(', ').trim();
};

/**
 * A Google Maps link for an address we only have as TEXT.
 *
 * The meeting location is a string — what the picker wrote, and what somebody standing outside
 * needs their phone to navigate to. Every other maps link in this app is built from a lat/lng
 * pair, which meetings do not store, so this uses Maps' documented text-query form instead of
 * inventing coordinates it does not have.
 *
 * Empty in, null out: the caller renders plain text rather than a link to a search for nothing.
 */
export const mapsUrl = (address?: string | null): string | null => {
    const q = String(address ?? '').trim();
    if (!q) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};
