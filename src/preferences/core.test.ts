import { describe, test, expect } from 'vitest';
import { explain, resolve, type PreferenceSpec } from './core';

const spec: PreferenceSpec<'a' | 'b'> = {
  key: 'demo',
  scopes: ['user', 'branch', 'org'],
  fallback: 'a',
  decode: (raw) => (raw === 'a' || raw === 'b' ? raw : null),
};

describe('preference cascade', () => {
  test.each([
    [{ user: 'b', branch: 'a', org: 'a' }, 'b', 'user'],
    [{ user: undefined, branch: 'b', org: 'a' }, 'b', 'branch'],
    [{ user: 'inherit', branch: null, org: 'b' }, 'b', 'org'],
    [{}, 'a', 'fallback'],
  ] as const)('%o resolves to %s from %s', (layers, value, source) => {
    expect(explain(spec, layers)).toEqual({ value, source });
    expect(resolve(spec, layers)).toBe(value);
  });

  // R1: an unset scope must not collapse to the fallback and shadow the scope below it.
  test('an unset scope never shadows a lower scope', () => {
    expect(resolve(spec, { branch: null, org: 'b' })).toBe('b');
  });

  test('a scope the spec does not declare is ignored', () => {
    const orgOnly = { ...spec, scopes: ['user', 'org'] as const };
    expect(resolve(orgOnly, { branch: 'b' })).toBe('a');
  });
});
