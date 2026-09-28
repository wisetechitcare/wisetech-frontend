/**
 * What KIND of meeting is being booked, and which field that kind asks for.
 *
 * Its own module rather than a private helper inside MeetingFormBody, for the same reason
 * `meetingOpening`, `meetingLimits` and `meetingAddress` live out here: this is a rule worth
 * checking, and the component drags the whole app layout in behind it.
 *
 * ─── MIRRORS THE SERVER ──────────────────────────────────────────────────────────────
 * `wisetech-backend/src/utils/meetingType.ts` holds the same two values and the same
 * required-field rule, and the API enforces it independently — a rule that lives only in a
 * screen is one anything else can skip, which is how that table acquired eight project-less
 * meetings while the create schema insisted a project was mandatory. This copy exists because
 * the two repositories cannot import from each other, NOT because the screen is the authority.
 * If you change one, change both; the tests on each side describe the same behaviour.
 */

export const MEETING_KINDS = ['PROJECT', 'GENERAL'] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];

export const isMeetingKind = (v: unknown): v is MeetingKind =>
    typeof v === 'string' && (MEETING_KINDS as readonly string[]).includes(v);

/**
 * The switch's own words.
 *
 * `hint` is what the type is FOR, in the case a person would recognise — the switch is the one
 * place someone decides this, and "Contact" alone does not say when to reach for it.
 *
 * ─── THE HINTS CHANGED WHEN THE TABS STOPPED SWAPPING FIELDS ─────────────────────────
 * They used to describe the shape of the form each tab produced ("Nothing to file it against"),
 * which stopped being true once every tab showed the same fields. Each now says what the type
 * is CLAIMING about the meeting, and names the one field it insists on — because that is the
 * only difference left between them, and a switch whose effect is invisible is one people
 * choose at random.
 */
export const MEETING_KIND_META: Record<MeetingKind, { label: string; icon: string; hint: string }> = {
    PROJECT: {
        label: 'Project',
        icon: 'briefcase',
        hint: 'About a project or a lead, and shown on its record. Needs the project.',
    },
    GENERAL: {
        label: 'General',
        icon: 'people',
        hint: 'Anything else — a call with a contact, an internal sync. Needs nothing, but may still name a project and outside guests.',
    },
};

export interface MeetingKindLinks {
    projectId?: string;
    contactIds?: string[];
}

/**
 * The one field this kind requires. Null when the meeting is fine to save.
 *
 * This is now the ONLY thing the kind decides. It used to also clear the links a kind "did not
 * own" — see the server's `normalizeMeetingLinks` for why that stopped: an internal review of a
 * project is both, and the form shows every field on every tab precisely because such meetings
 * are ordinary.
 *
 * Worded as an instruction rather than "X is required", because the reader has just chosen a
 * type and the useful sentence names what to do next.
 */
export const validateMeetingKind = (kind: MeetingKind, links: MeetingKindLinks): string | null => {
    switch (kind) {
        case 'PROJECT':
            return links.projectId ? null : 'Pick the project or lead this meeting is for.';
        case 'GENERAL':
            return null;
    }
};

/**
 * The kind an EXISTING meeting is, for the edit form.
 *
 * Rows written before the column existed carry no type, so fall back to the project link.
 */
export const kindOfExisting = (
    meeting: { meetingType?: string | null; projectId?: string | null } | null | undefined,
): MeetingKind => {
    if (isMeetingKind(meeting?.meetingType)) return meeting.meetingType;
    return meeting?.projectId ? 'PROJECT' : 'GENERAL';
};
