/**
 * What KIND of meeting is being booked, and which field that kind asks for.
 *
 * Its own module rather than a private helper inside MeetingFormBody, for the same reason
 * `meetingOpening`, `meetingLimits` and `meetingAddress` live out here: this is a rule worth
 * checking, and the component drags the whole app layout in behind it.
 *
 * ─── MIRRORS THE SERVER ──────────────────────────────────────────────────────────────
 * `wisetech-backend/src/utils/meetingType.ts` holds the same three values and the same
 * required-field rule, and the API enforces it independently — a rule that lives only in a
 * screen is one anything else can skip, which is how that table acquired eight project-less
 * meetings while the create schema insisted a project was mandatory. This copy exists because
 * the two repositories cannot import from each other, NOT because the screen is the authority.
 * If you change one, change both; the tests on each side describe the same behaviour.
 */

export const MEETING_KINDS = ['PROJECT', 'CONTACT', 'INTERNAL'] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];

export const isMeetingKind = (v: unknown): v is MeetingKind =>
    typeof v === 'string' && (MEETING_KINDS as readonly string[]).includes(v);

/**
 * The switch's own words.
 *
 * `hint` is what the type is FOR, in the case a person would recognise — the switch is the one
 * place someone decides this, and "Contact" alone does not say when to reach for it.
 */
export const MEETING_KIND_META: Record<MeetingKind, { label: string; icon: string; hint: string }> = {
    PROJECT: {
        label: 'Project / Lead',
        icon: 'briefcase',
        hint: 'Filed against a project or a lead, and shown on its record.',
    },
    CONTACT: {
        label: 'Contact',
        icon: 'profile-user',
        hint: 'Someone from the CRM with no project yet — a first call, a pitch, an introduction.',
    },
    INTERNAL: {
        label: 'Internal',
        icon: 'people',
        hint: 'Your own team. Nothing to file it against — the agenda says what it is about.',
    },
};

export interface MeetingKindLinks {
    projectId?: string;
    contactIds?: string[];
}

/**
 * The one field this kind requires. Null when the meeting is fine to save.
 *
 * Worded as an instruction rather than "X is required", because the reader has just chosen a
 * type and the useful sentence names what to do next.
 */
export const validateMeetingKind = (kind: MeetingKind, links: MeetingKindLinks): string | null => {
    switch (kind) {
        case 'PROJECT':
            return links.projectId ? null : 'Pick the project or lead this meeting is for.';
        case 'CONTACT':
            return links.contactIds?.length ? null : 'Pick the contact you are meeting.';
        case 'INTERNAL':
            return null;
    }
};

/**
 * The kind an EXISTING meeting is, for the edit form.
 *
 * Rows written before the column existed carry no type, so fall back to the same derivation
 * the server's backfill used: a project link means it was filed against one, and a row without
 * could not have been a contact meeting because there was no way to book one.
 */
export const kindOfExisting = (
    meeting: { meetingType?: string | null; projectId?: string | null } | null | undefined,
): MeetingKind => {
    if (isMeetingKind(meeting?.meetingType)) return meeting.meetingType;
    return meeting?.projectId ? 'PROJECT' : 'INTERNAL';
};
