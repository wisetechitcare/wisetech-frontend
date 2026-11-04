import { describe, expect, it } from 'vitest';
import { rosterFirst } from './momAttendeeOptions';

const people = ['Asha', 'Bilal', 'Chen', 'Divya'].map((n) => ({ value: n.toLowerCase(), label: n }));

describe('rosterFirst', () => {
  it('puts project people first, drops anyone already attending, heads each section', () => {
    const out = rosterFirst(people, new Set(['chen', 'asha']), new Set(['asha']), ['Project team', 'All employees']);
    expect(out.map((o) => o.label)).toEqual(['Project team', 'Chen', 'All employees', 'Bilal', 'Divya']);
    expect(out.filter((o) => o.isHeader).map((o) => o.label)).toEqual(['Project team', 'All employees']);
  });

  it('without a project roster lists everybody under one heading', () => {
    const out = rosterFirst(people, null, new Set(), ['Project team', 'All employees']);
    expect(out.map((o) => o.label)).toEqual(['All employees', 'Asha', 'Bilal', 'Chen', 'Divya']);
  });

  it('drops a section that ends up empty', () => {
    const out = rosterFirst(people, new Set(['asha']), new Set(['asha']), ['Project team', 'All employees']);
    expect(out[0].label).toBe('All employees');
  });
});
