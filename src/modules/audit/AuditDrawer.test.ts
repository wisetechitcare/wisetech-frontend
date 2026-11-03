// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isChildCreate, isCreate } from './AuditDrawer';

const cs = (changedAt: string) => ({ changedAt, changes: [], revisionNumber: 1 } as any);

describe('isCreate', () => {
  it('is the revision saved with the record', () => {
    expect(isCreate(cs('2026-10-29T11:53:20Z'), '2026-10-29T11:53:19Z')).toBe(true);
  });
  it('a first audited edit of an older record (e.g. adding a note) is not a create', () => {
    expect(isCreate(cs('2026-10-29T11:53:00Z'), '2026-04-09T12:09:00Z')).toBe(false);
  });
  it('without the record\'s createdAt nothing is called a create', () => {
    expect(isCreate(cs('2026-10-29T11:53:00Z'), undefined)).toBe(false);
  });
});

describe('isChildCreate', () => {
  const change = (fieldName: string, changeType: string) => ({ fieldName, changeType } as any);
  it('a new branch / sub-company sets its name', () => {
    expect(isChildCreate({ changes: [change('name', 'ADDED'), change('phone', 'ADDED')] } as any)).toBe(true);
    expect(isChildCreate({ changes: [change('subCompanyName', 'ADDED')] } as any)).toBe(true);
  });
  it('adding a phone to an existing branch, or renaming it, is an edit', () => {
    expect(isChildCreate({ changes: [change('phone', 'ADDED')] } as any)).toBe(false);
    expect(isChildCreate({ changes: [change('name', 'MODIFIED')] } as any)).toBe(false);
  });
});
