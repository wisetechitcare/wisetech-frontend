/**
 * Robust, predictable text search.
 *
 * Matching rules (per query keyword, AND across keywords):
 *  - plain substring match, OR
 *  - space/punctuation-insensitive match on the compacted (alphanumeric-only) form.
 *
 * This makes "dmart", "d mart", "d-mart" and "d_mart" all match "D Mart",
 * while a multi-word query still narrows the result set (every word must match).
 */

/** Lowercase + collapse whitespace + treat dashes/underscores as spaces. */
export const normalizeSearchText = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
};

/** Strip everything except a–z and 0–9 (drops spaces, @, punctuation…). */
const compact = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * True when `query` matches `text`: every word in the query must be found in the
 * text, either as a plain substring or in the compacted (no-space) form.
 */
export const flexibleTextMatch = (text: string, query: string): boolean => {
  if (!query || !query.trim()) return true;
  if (!text) return false;

  const normalizedText = normalizeSearchText(text);
  const textCompact = compact(text);
  const queryWords = normalizeSearchText(query).split(' ').filter(Boolean);
  if (queryWords.length === 0) return true;

  return queryWords.every((word) => {
    if (normalizedText.includes(word)) return true;
    const w = compact(word);
    return w.length > 0 && textCompact.includes(w);
  });
};

/**
 * True when `query` matches ANY of the provided fields (OR across fields,
 * AND across the words within the query — handled by flexibleTextMatch).
 */
export const searchAcrossFields = (query: string, fields: (string | undefined | null)[]): boolean => {
  if (!query || !query.trim()) return true;
  return fields.some((field) => flexibleTextMatch(String(field ?? ''), query));
};
