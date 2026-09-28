/**
 * Headline capitalisation — one implementation, applied by the kit's heading
 * components so every title in the app reads the same way.
 *
 * WHY A FUNCTION AND NOT `text-transform: capitalize`:
 *   • CSS capitalises EVERY word, so "Rules of the road" becomes
 *     "Rules Of The Road" — wrong in every style guide.
 *   • CSS cannot leave an acronym alone. "FAQ sections" would survive, but
 *     lowercase input like "faq sections" can never become "FAQ Sections".
 *   • A transformed heading still copies out of the page in its original case,
 *     so what a user pastes into an email does not match what they read.
 *
 * WHAT IT DOES NOT TOUCH — deliberately:
 *   • Any word already containing a capital is left EXACTLY as written. That
 *     preserves acronyms (FAQ, HR, KPI, PF, CTC), product names, and anything
 *     an admin typed a specific way ("WISETECH MEP CONSULTANTS Pvt. Ltd.").
 *     Titles are frequently user data here — FAQ sections, leave types, project
 *     categories — so the rule has to be conservative or it corrupts content.
 *   • Minor words (of, and, the, to …) stay lowercase unless they open or close
 *     the headline, which is standard title case.
 *
 * It is therefore safe to apply blindly: a correctly-cased headline passes
 * through unchanged, and only genuinely lowercase words are lifted.
 */

/** Words kept lowercase inside a headline. Articles, short conjunctions and prepositions. */
const MINOR_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor',
    'of', 'on', 'onto', 'or', 'over', 'per', 'so', 'the', 'to', 'up', 'via', 'vs', 'with', 'yet',
]);

const capitaliseWord = (word: string): string => {
    // Leading punctuation ("(draft") must not eat the capital.
    const match = word.match(/^([^\p{L}\p{N}]*)(.*)$/u);
    if (!match) return word;
    const [, lead, rest] = match;
    if (!rest) return word;
    return `${lead}${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
};

/**
 * Title-case a headline, preserving anything already capitalised.
 *
 * @example toTitleCase('faq sections')            // 'FAQ sections' stays; 'Faq Sections' from lowercase
 * @example toTitleCase('rules of the road')       // 'Rules of the Road'
 * @example toTitleCase('FAQ sections')            // 'FAQ Sections'  (FAQ untouched)
 * @example toTitleCase('WISETECH MEP Pvt. Ltd.')  // unchanged
 */
export const toTitleCase = (value: string): string => {
    if (!value) return value;

    const words = value.split(/(\s+)/); // keep whitespace so spacing is preserved verbatim
    const contentIndexes = words
        .map((word, index) => (word.trim() ? index : -1))
        .filter((index) => index !== -1);

    if (!contentIndexes.length) return value;
    const firstIndex = contentIndexes[0];
    const lastIndex = contentIndexes[contentIndexes.length - 1];

    return words
        .map((word, index) => {
            if (!word.trim()) return word;

            // Already carries a capital: an acronym, a proper noun, or a
            // deliberate spelling. Never rewrite user content.
            if (/\p{Lu}/u.test(word)) return word;

            const bare = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
            if (index !== firstIndex && index !== lastIndex && MINOR_WORDS.has(bare)) return word;

            return capitaliseWord(word);
        })
        .join('');
};

/**
 * Apply to a heading value that may not be a string (headings accept nodes).
 * Non-strings pass through untouched — a caller rendering an element has
 * already decided how it looks.
 */
export const titleCaseNode = <T,>(value: T): T =>
    (typeof value === 'string' ? (toTitleCase(value) as unknown as T) : value);

/**
 * The house style for a STRUCTURAL HEADING — a title that names a region of the
 * screen: a dialog header, a page/list header, a section lead-in, a column
 * header, a stat caption. Those read as uppercase.
 *
 * WHY CSS AND NOT AN UPPERCASED STRING:
 *   • The accessible name stays the real words. A screen reader given "DEVICES"
 *     as text may spell it D-E-V-I-C-E-S; given `text-transform` it reads the
 *     word and announces the heading normally.
 *   • Copying a heading out of the page yields "Biometric Devices", not
 *     "BIOMETRIC DEVICES" — what a person pastes into an email still reads.
 *   • Search-in-page keeps matching what the user typed.
 *   • It is reversible in one place. An uppercased STRING loses the original
 *     casing forever, so acronyms and user-entered names could never be
 *     recovered if the style changes again.
 *
 * Pair it with `toTitleCase`, never instead of it: the string stays title-cased
 * underneath, so the two answers agree if this style is ever lifted.
 *
 * The small letter-spacing is not decoration. Capitals set at normal tracking
 * read tighter than lowercase because every glyph is full height; a little air
 * restores the word shape that capitals take away.
 *
 * DELIBERATELY NOT APPLIED TO:
 *   • Buttons. All-caps labels are measurably slower to read (the word outline
 *     that the eye matches on is flattened), they truncate sooner, and they
 *     shout on a destructive action. Material moved away from them in v3 for
 *     exactly this. `WtButton` stays title-cased.
 *   • Input labels. MUI measures the label text to cut the notch in the outline,
 *     and it does not see CSS — an uppercased label grows while its gap does
 *     not, and lands on the border. See the kit README.
 *   • Card and tile titles that carry CONTENT (a device name, a person, a
 *     navigation destination). Those are data, not a region name.
 */
export const HEADING_CASE_SX = {
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
};
