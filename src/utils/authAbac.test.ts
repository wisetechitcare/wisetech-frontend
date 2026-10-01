import { describe, expect, it, vi } from 'vitest';

// An Employee: Read on Attendance → Personal only. `emp` is who is signed in.
vi.mock('@redux/store', () => ({
    store: {
        getState: () => ({
            authz: { tier: null, access: { 'attendance.personal': { read: true, write: false } }, keys: [] },
            rolesAndPermissions: { emp: JSON.stringify({ id: 'me' }) },
        }),
    },
}));

const { hasPermission } = await import('./authAbac');

describe('attendance report rows', () => {
    it('shows an employee their own check-ins with Personal only', () => {
        expect(hasPermission('attendancereport', 'readOwn', { employeeId: 'me' })).toBe(true);
    });

    it("hides someone else's without Employees", () => {
        expect(hasPermission('attendancereport', 'readOthers', { employeeId: 'someone-else' })).toBe(false);
    });
});
