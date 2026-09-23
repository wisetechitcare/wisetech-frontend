/**
 * HOW a meeting is attended: on a call, in a room, or both at once.
 *
 * Its own module rather than a private helper inside MeetingFormBody, for the same reason
 * `meetingTypes`, `meetingOpening`, `meetingLimits` and `meetingAddress` live out here: this is
 * a rule worth checking, and the component drags the whole app layout in behind it.
 *
 * ─── MIRRORS THE SERVER ──────────────────────────────────────────────────────────────
 * `wisetech-backend/src/utils/meetingMode.ts` holds the same three values, the same
 * which-field-does-this-mode-own rule and the same one-line "where" sentence, and the API
 * enforces its half independently. This copy exists because the two repositories cannot import
 * from each other, NOT because the screen is the authority. If you change one, change both;
 * the tests on each side describe the same behaviour.
 *
 * ─── WHY THIS REPLACED A BOOLEAN ─────────────────────────────────────────────────────
 * `isOnline` could say two things, and a hybrid meeting is a third: some people in the room and
 * some on the link, which is how most client reviews actually run. The organiser had to pick
 * the half that was less wrong and paste the other half into the agenda — and the API's read
 * filter NULLED whichever field the flag said was unused, so the discarded half could not have
 * survived even if it had been typed.
 */

export const MEETING_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];

export const isMeetingMode = (v: unknown): v is MeetingMode =>
    typeof v === 'string' && (MEETING_MODES as readonly string[]).includes(v);

/**
 * The switch's own words and glyph.
 *
 * ─── THE GLYPHS CARRY THE MEANING, NOT THE WORDS ─────────────────────────────────────
 * Three same-sized buttons whose only difference is a word are read one at a time; with a
 * glyph they are read by shape and confirmed by the word. So each one is a picture of the
 * thing itself, from the app's single icon family (Lucide, through `iconRegistry`):
 *
 *   · ONLINE  — a camera. It is a call.
 *   · OFFLINE — a map pin. It is a place you travel to. (The word changed from "In person";
 *               the pin did not, because a pin is what a place looks like either way.)
 *   · HYBRID  — two overlapping circles. Not a screen and not a room: the OVERLAP of the two,
 *               which is the only thing about this mode that needs saying.
 *
 * `hint` is what the mode is FOR. "Hybrid" alone does not say who is expected where, and the
 * switch is the one place anybody decides it.
 */
export const MEETING_MODE_META: Record<MeetingMode, { label: string; icon: string; hint: string }> = {
    ONLINE: {
        label: 'Online',
        icon: 'video',
        hint: 'Everyone joins on a link.',
    },
    OFFLINE: {
        label: 'Offline',
        icon: 'geolocation',
        hint: 'Everyone is in the same room.',
    },
    HYBRID: {
        label: 'Hybrid',
        icon: 'hybrid',
        hint: 'Some in the room, some on the link — so give both.',
    },
};

/**
 * Which of the two "where" fields this mode owns.
 *
 * Both are true for HYBRID, and that is the whole point: the form shows a field when its mode
 * owns it rather than testing the mode by name, so the link box and the address box are not two
 * branches of one `isOnline ? … : …` that can only ever show one of them.
 */
export const modeHasLink = (mode: MeetingMode): boolean => mode !== 'OFFLINE';
export const modeHasPlace = (mode: MeetingMode): boolean => mode !== 'ONLINE';

/**
 * The boolean the legacy screens still read. HYBRID is online — it has a link.
 *
 * Sent alongside `meetingMode` on save so a row stays readable to the parts of the app that
 * have not moved off the flag yet. The server recomputes it and ignores what we send, so this
 * is about not transmitting a contradiction rather than about being trusted.
 */
export const isOnlineFor = (mode: MeetingMode): boolean => modeHasLink(mode);

/**
 * The mode of an EXISTING meeting, for the edit form.
 *
 * Rows written before the column existed carry no mode, so fall back to the same derivation the
 * server's backfill used. No such row can be HYBRID — there was no way to book one.
 */
export const modeOfExisting = (
    meeting: { meetingMode?: string | null; isOnline?: boolean | null } | null | undefined,
): MeetingMode => {
    if (isMeetingMode(meeting?.meetingMode)) return meeting.meetingMode;
    return meeting?.isOnline ? 'ONLINE' : 'OFFLINE';
};

/**
 * WHERE the meeting is, as one line a person can read.
 *
 * Shared because three screens and a server-side notification each had their own
 * `isOnline ? 'Online' : (location || 'In person')` — four copies of one sentence, which is how
 * the same meeting came to read "In person" on the calendar and "Offline" in the table.
 *
 * A hybrid names the room AND says it is hybrid: "Hybrid" alone throws away the only thing
 * somebody attending in person needs, and the address alone hides that there is a link.
 */
export const meetingWhere = (mode: MeetingMode, location?: string | null): string => {
    const place = location?.trim();
    if (mode === 'ONLINE') return MEETING_MODE_META.ONLINE.label;
    if (mode === 'OFFLINE') return place || MEETING_MODE_META.OFFLINE.label;
    return place ? `${MEETING_MODE_META.HYBRID.label} · ${place}` : MEETING_MODE_META.HYBRID.label;
};
