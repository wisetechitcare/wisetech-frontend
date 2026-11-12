import { describe, expect, it, vi } from 'vitest';

// The ABAC check is the unit under policy elsewhere; here it is a stand-in: "own" = employeeId 'me',
// "others" = everyone except 'blocked'.
vi.mock('@utils/authAbac', () => ({
  hasPermission: (_resource: string, action: string, row: { employeeId?: string }) =>
    action === 'readOwn' ? row.employeeId === 'me' : row.employeeId !== 'blocked',
}));
vi.mock('@constants/statistics', () => ({
  permissionConstToUseWithHasPermission: { readOwn: 'readOwn', readOthers: 'readOthers' },
}));

import { filterPermittedRows } from './usePermittedRows';

type Row = { id: number; employeeId?: string };
const mine: Row = { id: 1, employeeId: 'me' };
const theirs: Row = { id: 2, employeeId: 'colleague' };
const blocked: Row = { id: 3, employeeId: 'blocked' };
const total: Row = { id: 4 }; // a row that is nobody's record (a group total)
const ROWS: Row[] = [mine, theirs, blocked, total];

describe('filterPermittedRows', () => {
  it('shows everything when no resource is given', () => {
    expect(filterPermittedRows(ROWS, {})).toEqual(ROWS);
  });

  it('viewOwn keeps only the user\'s own rows (plus unowned rows)', () => {
    expect(filterPermittedRows(ROWS, { resource: 'reimbursement', viewOwn: true })).toEqual([mine, total]);
  });

  it('viewOthers keeps what readOthers allows, never a blocked row', () => {
    expect(filterPermittedRows(ROWS, { resource: 'reimbursement', viewOthers: true })).toEqual([mine, theirs, total]);
  });

  it('with no view flag, only unowned rows survive (fail closed for records)', () => {
    expect(filterPermittedRows(ROWS, { resource: 'reimbursement' })).toEqual([total]);
  });

  it('a row passing two checks appears once', () => {
    const out = filterPermittedRows(ROWS, { resource: 'reimbursement', viewOthers: true, checkOwnWithOthers: true });
    expect(out.filter((r) => r === mine)).toHaveLength(1);
  });
});
