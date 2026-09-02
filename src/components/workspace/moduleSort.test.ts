import { describe, expect, it } from 'vitest';
import { sortClusters, sortModules } from './moduleSort';
import type { WorkspaceModule } from './types';

const mod = (title: string, to: string): WorkspaceModule => ({
  id: to, title, to, exact: false,
});

// Nav order deliberately unalphabetical, so "unchanged" and "sorted" cannot look the same.
const MODULES = [mod('Leads', '/leads'), mod('Companies', '/companies'), mod('Contacts', '/contacts')];

describe('sortModules', () => {
  it('sorts A–Z and Z–A', () => {
    expect(sortModules(MODULES, 'az', {}).map((m) => m.title))
      .toEqual(['Companies', 'Contacts', 'Leads']);
    expect(sortModules(MODULES, 'za', {}).map((m) => m.title))
      .toEqual(['Leads', 'Contacts', 'Companies']);
  });

  it('puts the most-used first and keeps nav order for ties', () => {
    expect(sortModules(MODULES, 'frequent', { '/contacts': 5, '/companies': 1 }).map((m) => m.title))
      .toEqual(['Contacts', 'Companies', 'Leads']);
  });

  // The safety property: with no history, the grid must look exactly as it did before the
  // control existed. A non-stable sort would silently shuffle it on every visit.
  it('leaves nav order untouched when nothing has been opened', () => {
    expect(sortModules(MODULES, 'frequent', {}).map((m) => m.title))
      .toEqual(['Leads', 'Companies', 'Contacts']);
  });

  it('does not mutate its input', () => {
    sortModules(MODULES, 'za', {});
    expect(MODULES.map((m) => m.title)).toEqual(['Leads', 'Companies', 'Contacts']);
  });
});

describe('sortClusters', () => {
  const clusters = [
    { id: 'b', title: 'Payroll', modules: [mod('Salary', '/salary'), mod('Bonus', '/bonus')] },
    { id: 'a', title: 'Attendance', modules: [mod('Leaves', '/leaves')] },
  ];

  it('sorts headings and their children alphabetically', () => {
    const sorted = sortClusters(clusters, 'az');
    expect(sorted.map((c) => c.title)).toEqual(['Attendance', 'Payroll']);
    expect(sorted[1].modules.map((m) => m.title)).toEqual(['Bonus', 'Salary']);
  });

  it('keeps heading order under "frequent" — a group has no frequency of its own', () => {
    expect(sortClusters(clusters, 'frequent').map((c) => c.title)).toEqual(['Payroll', 'Attendance']);
  });
});
