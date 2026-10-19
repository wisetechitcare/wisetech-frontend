import { describe, expect, test } from 'vitest';
import { resolveHomeRootOrg } from './activeOrg';

const CRAFTECH = {
  id: 'craftech-root',
  name: 'Craftech Engineers Pvt Ltd',
  parentOrganizationId: null,
  logo: 'https://example.com/craftech.png',
  createdAt: '2020-01-01',
};
const WISETECH = {
  id: 'wisetech-root',
  name: 'WISETECH GROUP',
  parentOrganizationId: null,
  logo: 'https://example.com/wisetech.png',
  createdAt: '2019-01-01',
};
const WISETECH_SUB = {
  id: 'wisetech-mep',
  name: 'WISETECH MEP',
  parentOrganizationId: 'wisetech-root',
  logo: null,
  createdAt: '2021-01-01',
};

const overview = [CRAFTECH, WISETECH, WISETECH_SUB];

describe('resolveHomeRootOrg', () => {
  test('walks from the employee company up to their tenant root (not overview[0])', () => {
    const root = resolveHomeRootOrg(overview, 'wisetech-mep');
    expect(root?.id).toBe('wisetech-root');
    expect(root?.name).toBe('WISETECH GROUP');
    expect(root?.logo).toBe('https://example.com/wisetech.png');
  });

  test('uses a home root directly when the employee sits on the root', () => {
    const root = resolveHomeRootOrg(overview, 'wisetech-root');
    expect(root?.id).toBe('wisetech-root');
  });

  test('does not pick CrafTech when the session home is WiseTech', () => {
    // overview[0] is CrafTech — the bug Super Admin hit for "<Org> Team".
    expect(overview[0].id).toBe('craftech-root');
    expect(resolveHomeRootOrg(overview, 'wisetech-root')?.id).toBe('wisetech-root');
  });
});
