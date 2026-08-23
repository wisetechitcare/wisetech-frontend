/**
 * Runnable check for the grouping rollup:
 *   node src/app/modules/common/components/employeeStatGrouping.check.ts
 * (Node strips the types; no framework, no deps.) Exists because `time` ordering is the
 * one part of this module that breaks silently — a wrong comparator still returns a
 * plausible-looking list, so only an assertion catches it.
 */
import { groupEmployeeStatItems, sortEmployeeStatGroups } from './employeeStatGrouping.ts';

const DAY = '2026-08-07';
const NEXT = '2026-08-08';
const at = (day: string, h: number, m = 0) =>
    new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`).getTime();

const eq = (actual: unknown, expected: unknown, what: string) => {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${what}\n  expected ${e}\n  actual   ${a}`);
};
const names = (gs: { name: string }[]) => gs.map((g) => g.name);

// One day, three people, different check-in times. This is the case that used to fall
// through to the name tiebreak, because date ordering can't separate rows sharing a date.
const oneDay = [
    { key: 'c', employeeId: '3', name: 'Cara', date: DAY, time: at(DAY, 9, 5) },
    { key: 'a', employeeId: '1', name: 'Abe', date: DAY, time: at(DAY, 11, 30) },
    { key: 'b', employeeId: '2', name: 'Bo', date: DAY, time: at(DAY, 10) },
];
eq(names(sortEmployeeStatGroups(groupEmployeeStatItems(oneDay), 'checkin-asc')),
    ['Cara', 'Bo', 'Abe'], 'checkin-asc on a single day = clock order');
eq(names(sortEmployeeStatGroups(groupEmployeeStatItems(oneDay), 'checkin-desc')),
    ['Abe', 'Bo', 'Cara'], 'checkin-desc on a single day = reverse clock order');

// Untimed rows (leave / absent) must sort last rather than compare as time 0.
const mixed = [...oneDay, { key: 'd', employeeId: '4', name: 'Dev', date: DAY }];
eq(names(sortEmployeeStatGroups(groupEmployeeStatItems(mixed), 'checkin-asc')).pop(),
    'Dev', 'untimed group sorts last');

// Occurrences inside a group: date first, clock breaks a same-day tie.
const repeat = groupEmployeeStatItems([
    { key: '2', employeeId: '1', name: 'Abe', date: NEXT, time: at(NEXT, 9) },
    { key: '1b', employeeId: '1', name: 'Abe', date: DAY, time: at(DAY, 18) },
    { key: '1a', employeeId: '1', name: 'Abe', date: DAY, time: at(DAY, 8) },
])[0];
eq(repeat.items.map((i) => i.key), ['1a', '1b', '2'], 'occurrences ordered by date then clock');
eq([repeat.firstTime, repeat.lastTime], [at(DAY, 8), at(NEXT, 9)], 'group tracks earliest/latest time');
eq([repeat.firstDate, repeat.lastDate, repeat.count], [DAY, NEXT, 3], 'group tracks date bounds + count');

// Half-day weighting still reconciles with the On-Leave card (the 0.5 policy).
eq(groupEmployeeStatItems([
    { key: 'l1', employeeId: '1', name: 'Abe', date: DAY, weight: 0.5 },
    { key: 'l2', employeeId: '1', name: 'Abe', date: NEXT },
])[0].total, 1.5, 'half-day leave totals 1.5');

console.log('employeeStatGrouping: all checks passed');
