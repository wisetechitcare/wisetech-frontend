/**
 * What a meeting form insists on, and what it merely caps.
 *
 * ─── REQUIRED IS FOR WHAT THE RECORD CANNOT BE WITHOUT ───────────────────────
 * A meeting needs a name and a when. Everything else — the link, the room, who is coming, the
 * agenda — is something you often do not know at the moment you are booking the slot, and
 * refusing the whole save until you do just means the meeting gets booked somewhere else. The
 * server agrees: its schema requires only title and the two dates.
 *
 * The caps exist for the opposite reason — not to make somebody fill a field in, but to stop
 * one field swallowing a screen or a database column.
 */
export const TITLE_MAX_CHARS = 20;
export const AGENDA_MAX_WORDS = 200;

/** Words as a person counts them: runs of non-space, however much space is between them. */
export const countWords = (text: string): number =>
    text.trim().split(/\s+/).filter(Boolean).length;
