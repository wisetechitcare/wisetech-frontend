// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { hasSeatsLeft, isRoleOpenForCandidates } from './requisitions';

// Three pickers asked "can I put someone against this role?" and none of them asked about seats.

describe('hasSeatsLeft', () => {
    test('seats remaining', () => {
        expect(hasSeatsLeft({ headcount: 3, filledCount: 0 })).toBe(true);
        expect(hasSeatsLeft({ headcount: 3, filledCount: 2 })).toBe(true);
    });

    test('every seat filled', () => {
        expect(hasSeatsLeft({ headcount: 3, filledCount: 3 })).toBe(false);
    });

    test('over-filled stays closed — two acceptances against one seat is not a vacancy', () => {
        expect(hasSeatsLeft({ headcount: 1, filledCount: 2 })).toBe(false);
    });

    test('no headcount set counts as open, so a config gap is visible rather than hidden', () => {
        expect(hasSeatsLeft({ headcount: null, filledCount: 4 })).toBe(true);
        expect(hasSeatsLeft({ headcount: 0, filledCount: 4 })).toBe(true);
        expect(hasSeatsLeft({})).toBe(true);
    });
});

describe('isRoleOpenForCandidates', () => {
    const open = { status: 1, isActive: true, headcount: 2, filledCount: 0 };

    test('approved, active and hiring', () => {
        expect(isRoleOpenForCandidates(open)).toBe(true);
    });

    test('a draft or rejected role is never offered', () => {
        expect(isRoleOpenForCandidates({ ...open, status: 0 })).toBe(false);
        expect(isRoleOpenForCandidates({ ...open, status: 2 })).toBe(false);
    });

    test('an archived role is never offered', () => {
        expect(isRoleOpenForCandidates({ ...open, isActive: false })).toBe(false);
    });

    test('a full role is never offered — the case all three pickers got wrong', () => {
        expect(isRoleOpenForCandidates({ ...open, filledCount: 2 })).toBe(false);
    });
});
