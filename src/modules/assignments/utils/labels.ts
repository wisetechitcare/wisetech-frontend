/**
 * Access Control → Assignments — display maps for the enumerated backend
 * values (scope, status, history actions). Kept in one place so the table,
 * dialogs and timeline all speak the same language.
 */
import type { AssignmentScope, AssignmentStatus, HistoryAction } from '../types';

export const SCOPE_LABELS: Record<AssignmentScope, string> = {
  platform: 'Platform-wide',
  tenant: 'Whole tenant',
  unit_subtree: 'Unit & below',
  unit: 'This unit only',
};

export const SCOPE_CAPTIONS: Record<AssignmentScope, string> = {
  platform: 'Applies across every tenant',
  tenant: 'Applies to the entire organization',
  unit_subtree: 'Applies to this unit and all units beneath it',
  unit: 'Applies to this single unit',
};

export const scopeLabel = (scope: AssignmentScope): string => SCOPE_LABELS[scope] ?? scope;

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  expired: 'Expired',
  revoked: 'Removed',
};

/** Human sentence for each audited action, used by the history timeline. */
export const ACTION_LABELS: Record<HistoryAction, string> = {
  ASSIGNMENT_ADDED: 'Assignment created',
  ASSIGNMENT_REMOVED: 'Assignment removed',
  ASSIGNMENT_UPDATED: 'Assignment updated',
  ASSIGNMENT_RESTORED: 'Assignment restored',
  ASSIGNMENT_EXPIRED: 'Assignment expired',
  ASSIGNMENT_ACTIVATED: 'Assignment activated',
  ASSIGNMENT_SCOPE_CHANGED: 'Scope changed',
  ASSIGNMENT_ROLE_CHANGED: 'Role changed',
};

export const actionLabel = (action: string): string =>
  ACTION_LABELS[action as HistoryAction] ??
  action.replace(/^ASSIGNMENT_/, '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** Actions that read as additive/positive vs. removals — drives the timeline dot colour. */
export const actionTone = (action: string): 'success' | 'error' | 'warning' | 'info' => {
  switch (action) {
    case 'ASSIGNMENT_ADDED':
    case 'ASSIGNMENT_RESTORED':
    case 'ASSIGNMENT_ACTIVATED':
      return 'success';
    case 'ASSIGNMENT_REMOVED':
      return 'error';
    case 'ASSIGNMENT_EXPIRED':
      return 'warning';
    default:
      return 'info';
  }
};
