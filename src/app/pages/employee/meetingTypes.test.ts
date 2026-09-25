import { describe, it, expect } from 'vitest';
import {
    MEETING_KINDS, MEETING_KIND_META, isMeetingKind, kindOfExisting, validateMeetingKind,
} from './meetingTypes';

describe('meeting kinds', () => {
    it('is exactly two, and nothing else is one', () => {
        expect([...MEETING_KINDS]).toEqual(['PROJECT', 'GENERAL']);
        expect(isMeetingKind('GENERAL')).toBe(true);
        for (const junk of ['CONTACT', 'INTERNAL', 'PERSONAL', 'project', '', null, undefined, 7]) {
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

    it('GENERAL requires nothing', () => {
        expect(validateMeetingKind('GENERAL', {})).toBeNull();
    });

    it('messages tell you what to do, not that a field is required', () => {
        // The reader has just chosen a type; the useful sentence names the next action.
        expect(validateMeetingKind('PROJECT', {})).not.toMatch(/is required/i);
    });
});

describe('kindOfExisting', () => {
    it('uses the stored type when there is one', () => {
        // Stored type wins even when the links look like something else.
        expect(kindOfExisting({ meetingType: 'GENERAL', projectId: 'lead-1' })).toBe('GENERAL');
    });

    it('falls back to the project link', () => {
        expect(kindOfExisting({ projectId: 'lead-1' })).toBe('PROJECT');
        expect(kindOfExisting({ projectId: null })).toBe('GENERAL');
        expect(kindOfExisting({})).toBe('GENERAL');
        expect(kindOfExisting(null)).toBe('GENERAL');
        expect(kindOfExisting(undefined)).toBe('GENERAL');
    });

    it('ignores a type the API does not recognise', () => {
        expect(kindOfExisting({ meetingType: 'PERSONAL', projectId: 'lead-1' })).toBe('PROJECT');
    });
});
