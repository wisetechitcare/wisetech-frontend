import { describe, it, expect } from 'vitest';
import {
    MEETING_KINDS, MEETING_KIND_META, isMeetingKind, kindOfExisting, validateMeetingKind,
} from './meetingTypes';

describe('meeting kinds', () => {
    it('is exactly three, and nothing else is one', () => {
        expect([...MEETING_KINDS]).toEqual(['PROJECT', 'CONTACT', 'INTERNAL']);
        expect(isMeetingKind('CONTACT')).toBe(true);
        for (const junk of ['PERSONAL', 'project', '', null, undefined, 7]) {
            expect(isMeetingKind(junk)).toBe(false);
        }
    });

    it('every kind has switch copy', () => {
        // The switch is the one place a person decides this, so none of them may render blank.
        for (const kind of MEETING_KINDS) {
            expect(MEETING_KIND_META[kind].label.length).toBeGreaterThan(0);
            expect(MEETING_KIND_META[kind].hint.length).toBeGreaterThan(0);
            expect(MEETING_KIND_META[kind].icon.length).toBeGreaterThan(0);
        }
    });
});

describe('validateMeetingKind', () => {
    it('PROJECT needs a project', () => {
        expect(validateMeetingKind('PROJECT', { projectId: 'lead-1' })).toBeNull();
        expect(validateMeetingKind('PROJECT', {})).toMatch(/project or lead/i);
    });

    it('CONTACT needs a contact, and a project does not substitute', () => {
        expect(validateMeetingKind('CONTACT', { contactIds: ['c-1'] })).toBeNull();
        expect(validateMeetingKind('CONTACT', {})).toMatch(/contact/i);
        expect(validateMeetingKind('CONTACT', { contactIds: [] })).toMatch(/contact/i);
        expect(validateMeetingKind('CONTACT', { projectId: 'lead-1' })).toMatch(/contact/i);
    });

    it('INTERNAL requires nothing', () => {
        expect(validateMeetingKind('INTERNAL', {})).toBeNull();
    });

    it('messages tell you what to do, not that a field is required', () => {
        // The reader has just chosen a type; the useful sentence names the next action.
        expect(validateMeetingKind('PROJECT', {})).not.toMatch(/is required/i);
        expect(validateMeetingKind('CONTACT', {})).not.toMatch(/is required/i);
    });
});

describe('kindOfExisting', () => {
    it('uses the stored type when there is one', () => {
        expect(kindOfExisting({ meetingType: 'CONTACT', projectId: null })).toBe('CONTACT');
        // Stored type wins even when the links look like something else.
        expect(kindOfExisting({ meetingType: 'INTERNAL', projectId: 'lead-1' })).toBe('INTERNAL');
    });

    it('falls back to the same derivation the server backfill used', () => {
        expect(kindOfExisting({ projectId: 'lead-1' })).toBe('PROJECT');
        expect(kindOfExisting({ projectId: null })).toBe('INTERNAL');
        expect(kindOfExisting({})).toBe('INTERNAL');
        expect(kindOfExisting(null)).toBe('INTERNAL');
        expect(kindOfExisting(undefined)).toBe('INTERNAL');
    });

    it('ignores a type the API does not recognise', () => {
        expect(kindOfExisting({ meetingType: 'PERSONAL', projectId: 'lead-1' })).toBe('PROJECT');
    });
});
