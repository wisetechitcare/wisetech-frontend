import { V2ChangeSet, V2DiffResult, EntityInsights, ResetPreview, RestorePreview } from './types';

/**
 * DESIGN SANDBOX — realistic mock data so every view renders without a backend.
 */

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

const fc = (over: Partial<V2ChangeSet['changes'][number]>): V2ChangeSet['changes'][number] => ({
  fieldName: 'title',
  fieldLabel: 'Title',
  fieldType: 'scalar',
  fieldCategory: 'BASIC_INFO',
  changeType: 'MODIFIED',
  oldValue: null,
  newValue: null,
  oldValueFormatted: '(empty)',
  newValueFormatted: '(empty)',
  isKeyField: false,
  isSensitive: false,
  changeImpact: 'MINOR',
  ...over,
});

export const MOCK_VERSIONS: V2ChangeSet[] = [
  {
    id: 'r6',
    revisionNumber: 6,
    changedAt: ago(4),
    changedByEmployeeId: 'e1',
    changedByFirstName: 'Irfan',
    changedByLastName: 'Labbai',
    summary: '3 Fields Updated',
    category: 'MULTIPLE',
    changeSource: 'UI_FORM',
    ipAddress: '127.0.0.1',
    browserName: 'Chrome',
    deviceType: 'DESKTOP',
    rowHash: 'fc62c6765b9a1d3e7f0',
    changes: [
      fc({ fieldName: 'title', fieldLabel: 'Title', changeType: 'MODIFIED', oldValue: 'Bungalow at Benaulim', newValue: 'Bungalow project at Benaulim, Goa', oldValueFormatted: 'Bungalow at Benaulim', newValueFormatted: 'Bungalow project at Benaulim, Goa', isKeyField: true, changeImpact: 'MAJOR' }),
      fc({ fieldName: 'statusId', fieldLabel: 'Status', fieldType: 'relation', fieldCategory: 'STATUS', changeType: 'MODIFIED', oldValue: 's1', newValue: 's2', oldValueFormatted: 'Enquiry', newValueFormatted: 'Proposal Sent', changeImpact: 'CRITICAL' }),
      fc({ fieldName: 'assignedToId', fieldLabel: 'Assigned To', fieldType: 'relation', fieldCategory: 'TEAM', changeType: 'MODIFIED', oldValue: 'u1', newValue: 'u2', oldValueFormatted: 'Aisha Khan', newValueFormatted: 'Rahul Verma' }),
    ],
  },
  {
    id: 'r5',
    revisionNumber: 5,
    changedAt: ago(95),
    changedByEmployeeId: 'e2',
    changedByFirstName: 'Rahul',
    changedByLastName: 'Verma',
    summary: 'Financial Information Modified',
    category: 'FINANCIAL',
    changeSource: 'UI_FORM',
    ipAddress: '10.0.0.42',
    browserName: 'Edge',
    deviceType: 'DESKTOP',
    rowHash: 'a17b9920cd4e88f1',
    changes: [
      fc({ fieldName: 'value', fieldLabel: 'Deal Value', fieldType: 'currency', fieldCategory: 'FINANCIAL', changeType: 'MODIFIED', oldValue: 1800000, newValue: 2400000, oldValueFormatted: '₹18,00,000', newValueFormatted: '₹24,00,000', changeImpact: 'MAJOR' }),
      fc({ fieldName: 'commercials', fieldLabel: 'Commercials', fieldType: 'collection', fieldCategory: 'COMMERCIAL', changeType: 'MODIFIED', oldValueFormatted: '2 item(s)', newValueFormatted: '1 added' }),
    ],
  },
  {
    id: 'r4',
    revisionNumber: 4,
    changedAt: ago(60 * 26),
    changedByEmployeeId: 'e1',
    changedByFirstName: 'Irfan',
    changedByLastName: 'Labbai',
    summary: 'Rolled back to Version 2',
    category: 'ROLLBACK',
    changeSource: 'ROLLBACK',
    ipAddress: '127.0.0.1',
    browserName: 'Chrome',
    deviceType: 'DESKTOP',
    rowHash: '77cd00aa31bb',
    changes: [
      fc({ fieldName: 'title', fieldLabel: 'Title', changeType: 'MODIFIED', oldValue: 'Goa Villa', newValue: 'Bungalow at Benaulim', oldValueFormatted: 'Goa Villa', newValueFormatted: 'Bungalow at Benaulim' }),
    ],
  },
  {
    id: 'r3',
    revisionNumber: 3,
    changedAt: ago(60 * 50),
    changedByEmployeeId: 'e3',
    changedByFirstName: 'Aisha',
    changedByLastName: 'Khan',
    summary: 'Additional Details Updated',
    category: 'LOCATION',
    changeSource: 'UI_FORM',
    ipAddress: '10.0.0.7',
    browserName: 'Safari',
    deviceType: 'MOBILE',
    rowHash: 'bb12fe7790aa',
    changes: [
      fc({ fieldName: 'additionalDetails', fieldLabel: 'Additional Details', fieldType: 'json', fieldCategory: 'LOCATION', changeType: 'MODIFIED', oldValueFormatted: 'previous details', newValueFormatted: 'updated city, zipCode, mapLocation' }),
      fc({ fieldName: 'salary', fieldLabel: 'Budget (Confidential)', fieldType: 'currency', fieldCategory: 'FINANCIAL', changeType: 'MODIFIED', isSensitive: true, oldValue: '***REDACTED***', newValue: '***REDACTED***', oldValueFormatted: '***REDACTED***', newValueFormatted: '***REDACTED***' }),
    ],
  },
  {
    id: 'r2',
    revisionNumber: 2,
    changedAt: ago(60 * 72),
    changedByEmployeeId: 'e3',
    changedByFirstName: 'Aisha',
    changedByLastName: 'Khan',
    summary: 'Contact Added',
    category: 'CONTACT',
    changeSource: 'UI_FORM',
    ipAddress: '10.0.0.7',
    browserName: 'Safari',
    deviceType: 'MOBILE',
    rowHash: '9f0aa11cc',
    changes: [
      fc({ fieldName: 'contactId', fieldLabel: 'Contact', fieldType: 'relation', fieldCategory: 'CONTACT', changeType: 'ADDED', oldValue: null, newValue: 'c1', oldValueFormatted: '(empty)', newValueFormatted: 'Maria Fernandes' }),
    ],
  },
  {
    id: 'r1',
    revisionNumber: 1,
    changedAt: ago(60 * 96),
    changedByEmployeeId: 'e1',
    changedByFirstName: 'Irfan',
    changedByLastName: 'Labbai',
    summary: 'Title Updated',
    category: 'BASIC_INFO',
    changeSource: 'UI_FORM',
    ipAddress: '127.0.0.1',
    browserName: 'Chrome',
    deviceType: 'DESKTOP',
    rowHash: '01abef33',
    changes: [
      fc({ fieldName: 'title', fieldLabel: 'Title', changeType: 'ADDED', oldValue: null, newValue: 'Goa Villa', oldValueFormatted: '(empty)', newValueFormatted: 'Goa Villa' }),
    ],
  },
];

export const MOCK_DIFF: V2DiffResult = {
  from: 2,
  to: 6,
  summary: 'Changes from Version 2 to Version 6',
  stats: { added: 1, removed: 0, modified: 3, total: 4 },
  diffs: [
    fc({ fieldName: 'title', fieldLabel: 'Title', changeType: 'MODIFIED', oldValue: 'Goa Villa', newValue: 'Bungalow project at Benaulim, Goa', oldValueFormatted: 'Goa Villa', newValueFormatted: 'Bungalow project at Benaulim, Goa' }),
    fc({ fieldName: 'statusId', fieldLabel: 'Status', fieldType: 'relation', fieldCategory: 'STATUS', changeType: 'MODIFIED', oldValueFormatted: 'Enquiry', newValueFormatted: 'Proposal Sent' }),
    fc({ fieldName: 'contactId', fieldLabel: 'Contact', fieldType: 'relation', fieldCategory: 'CONTACT', changeType: 'ADDED', oldValueFormatted: '(empty)', newValueFormatted: 'Maria Fernandes' }),
    fc({ fieldName: 'value', fieldLabel: 'Deal Value', fieldType: 'currency', fieldCategory: 'FINANCIAL', changeType: 'MODIFIED', oldValueFormatted: '₹0', newValueFormatted: '₹24,00,000' }),
  ],
};

export const MOCK_INSIGHTS: EntityInsights = {
  totalRevisions: 6,
  totalChanges: 12,
  distinctEditors: 3,
  restoreCount: 1,
  firstChangedAt: ago(60 * 96),
  lastChangedAt: ago(4),
  categoryMix: [
    { category: 'BASIC_INFO', count: 4 },
    { category: 'FINANCIAL', count: 3 },
    { category: 'STATUS', count: 2 },
    { category: 'CONTACT', count: 2 },
    { category: 'LOCATION', count: 1 },
  ],
  hotFields: [
    { field: 'title', label: 'Title', count: 4 },
    { field: 'statusId', label: 'Status', count: 3 },
    { field: 'value', label: 'Deal Value', count: 2 },
    { field: 'assignedToId', label: 'Assigned To', count: 2 },
    { field: 'contactId', label: 'Contact', count: 1 },
  ],
  topEditors: [
    { actorId: 'e1', name: 'Irfan Labbai', count: 3 },
    { actorId: 'e3', name: 'Aisha Khan', count: 2 },
    { actorId: 'e2', name: 'Rahul Verma', count: 1 },
  ],
  volume: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(now - (13 - i) * 86_400_000).toISOString().slice(0, 10),
    count: [0, 0, 1, 0, 2, 0, 0, 1, 0, 3, 0, 1, 0, 2][i],
  })),
};

export const MOCK_RESET_PREVIEW: ResetPreview = {
  currentVersion: 6,
  targetVersion: 2,
  versionsToDelete: [3, 4, 5, 6],
  restorableCount: 3,
  skippedCount: 1,
  changes: [
    fc({ fieldName: 'title', fieldLabel: 'Title', changeType: 'MODIFIED', oldValueFormatted: 'Bungalow project at Benaulim, Goa', newValueFormatted: 'Goa Villa', restorable: true }),
    fc({ fieldName: 'statusId', fieldLabel: 'Status', fieldCategory: 'STATUS', changeType: 'MODIFIED', oldValueFormatted: 'Proposal Sent', newValueFormatted: 'Enquiry', restorable: true }),
    fc({ fieldName: 'assignedToId', fieldLabel: 'Assigned To', fieldCategory: 'TEAM', changeType: 'MODIFIED', oldValueFormatted: 'Rahul Verma', newValueFormatted: 'Aisha Khan', restorable: true }),
    fc({ fieldName: 'commercials', fieldLabel: 'Commercials', fieldType: 'collection', fieldCategory: 'COMMERCIAL', changeType: 'MODIFIED', restorable: false }),
  ],
};

export const MOCK_RESTORE_PREVIEW: RestorePreview = {
  targetRev: 2,
  currentRev: 6,
  restorableCount: 3,
  skippedCount: 1,
  changes: MOCK_RESET_PREVIEW.changes,
};
