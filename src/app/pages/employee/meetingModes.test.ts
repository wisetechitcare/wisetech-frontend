import { describe, it, expect } from 'vitest';
import {
    MEETING_MODES, MEETING_MODE_META, isMeetingMode, isOnlineFor,
    meetingWhere, modeHasLink, modeHasPlace, modeOfExisting,
} from './meetingModes';

/**
 * Mirrors `wisetech-backend/src/utils/__tests__/meetingMode.test.ts`. The two repositories
 * cannot import from each other, so the guarantee is that both suites describe the same rules
 * — if one changes, the other has to.
 */
describe('meeting modes', () => {
    it('is exactly three, and nothing else is one', () => {
        expect([...MEETING_MODES]).toEqual(['ONLINE', 'OFFLINE', 'HYBRID']);
        expect(isMeetingMode('HYBRID')).toBe(true);
        for (const junk of ['IN_PERSON', 'online', '', null, undefined, 7, true]) {
            expect(isMeetingMode(junk)).toBe(false);
        }
    });

    it('every mode has switch copy and a glyph', () => {
        // The switch is the one place a person decides this, so none may render blank — and
        // the glyph is what makes three same-sized buttons readable at a glance.
        for (const mode of MEETING_MODES) {
            expect(MEETING_MODE_META[mode].label.length).toBeGreaterThan(0);
            expect(MEETING_MODE_META[mode].hint.length).toBeGreaterThan(0);
            expect(MEETING_MODE_META[mode].icon.length).toBeGreaterThan(0);
        }
    });

    it('gives each mode its own glyph — three buttons that look alike are read one at a time', () => {
        const icons = MEETING_MODES.map((m) => MEETING_MODE_META[m].icon);
        expect(new Set(icons).size).toBe(icons.length);
    });
});

describe('which field a mode owns', () => {
    it('HYBRID owns BOTH — that is the whole reason it exists', () => {
        expect(modeHasLink('HYBRID')).toBe(true);
        expect(modeHasPlace('HYBRID')).toBe(true);
    });

    it('ONLINE has a link and no place, OFFLINE the reverse', () => {
        expect(modeHasLink('ONLINE')).toBe(true);
        expect(modeHasPlace('ONLINE')).toBe(false);
        expect(modeHasLink('OFFLINE')).toBe(false);
        expect(modeHasPlace('OFFLINE')).toBe(true);
    });

    it('every mode owns at least one — none is a meeting with no way in', () => {
        for (const m of MEETING_MODES) expect(modeHasLink(m) || modeHasPlace(m)).toBe(true);
    });
});

describe('the legacy boolean mirror', () => {
    it('a hybrid reads as online, because it has a link', () => {
        expect(isOnlineFor('ONLINE')).toBe(true);
        expect(isOnlineFor('HYBRID')).toBe(true);
        expect(isOnlineFor('OFFLINE')).toBe(false);
    });

    it('an existing row prefers its mode and falls back to the boolean', () => {
        expect(modeOfExisting({ meetingMode: 'HYBRID', isOnline: false })).toBe('HYBRID');
        // Rows written before the column. No such row can be HYBRID — there was no way to
        // book one — so the fallback never returns it.
        expect(modeOfExisting({ isOnline: true })).toBe('ONLINE');
        expect(modeOfExisting({ isOnline: false })).toBe('OFFLINE');
        expect(modeOfExisting({ meetingMode: 'IN_PERSON', isOnline: true })).toBe('ONLINE');
        expect(modeOfExisting(null)).toBe('OFFLINE');
    });
});

describe('meetingWhere', () => {
    it('a hybrid names the room AND says it is hybrid', () => {
        // Either half alone loses something: "Hybrid" hides the address from whoever is
        // walking there, the address alone hides that there is a link.
        expect(meetingWhere('HYBRID', 'Tunga Hotel, Vashi')).toBe('Hybrid · Tunga Hotel, Vashi');
    });

    it('falls back to the mode name when there is no address to give', () => {
        expect(meetingWhere('HYBRID', '')).toBe('Hybrid');
        expect(meetingWhere('OFFLINE', null)).toBe('Offline');
        expect(meetingWhere('OFFLINE', '   ')).toBe('Offline');
    });

    it('an online meeting never prints a stale address', () => {
        // The API blanks the unused side, but a cached row may still carry one.
        expect(meetingWhere('ONLINE', 'Tunga Hotel, Vashi')).toBe('Online');
    });
});
