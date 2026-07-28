/**
 * utils/visibility.ts — THE Visibility Layer.
 *
 * The single frontend abstraction for "can the current user SEE this?". Sidebar
 * items, tabs, dashboard widgets, buttons, and (later) the role Preview all derive
 * their visibility from here — no component invents its own logic, hardcodes
 * `true`, or calls the legacy `hasPermission()` / block-only helpers for visibility.
 *
 * Principle (RULE 1 — "No View = No Feature"): something is visible only when the
 * user holds the required capability. Reads from the same capability set the
 * runtime enforces (`authz.capabilities`, via `evaluateCapability`) so the editor,
 * navigation, routes, backend and Preview all agree.
 *
 * The admin BLOCK mechanism (`authz.blockedSections`) is separate from permission:
 * an explicitly-blocked module is hidden even if granted. Blocking a parent hides
 * its children. Both are combined here so callers get one answer.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { store } from '@redux/store';
import { evaluateCapability } from '@utils/can';

const SCOPE_TIERS = ['self', 'team', 'department', 'all', 'global'] as const;

/** A requirement describing what's needed to SEE something. */
export type VisibilityReq =
  | 'universal' // every authenticated user (e.g. Dashboard, Inbox) — declared, not hardcoded
  | { module: string } // VIEW on the module at any scope (pages, sidebar items, tabs)
  | { module: string; action: string } // an ACTION at any scope (buttons: create/update/delete/export…)
  | { capability: string } // an exact capability key (scope-widening applies)
  | { anyOf: VisibilityReq[] }; // any sub-requirement passes (groups, mixed gates)

// A grant on a PARENT module covers its children (registry parent-child, e.g.
// `finance` covers `finance.salary`, `crm` covers `crm.leads`). So checking a
// dotted module also checks its ancestors — a role granted the parent sees all
// children, while a role granted only one child sees only that one.
const moduleChain = (module: string): string[] => {
  const parts = module.split('.');
  const chain: string[] = [];
  for (let i = parts.length; i >= 1; i--) chain.push(parts.slice(0, i).join('.'));
  return chain; // e.g. ['finance.salary', 'finance']
};

const hasAtAnyScope = (caps: unknown, module: string, action: string): boolean =>
  moduleChain(module).some((m) => SCOPE_TIERS.some((s) => evaluateCapability(caps, `${m}.${action}.${s}`)));

// `manage` inherits the CRUD/view actions (RBAC inheritance), so a manage grant
// implies the action even when no explicit `view`/`create`/… key is present.
const hasActionOrManage = (caps: unknown, module: string, action: string): boolean =>
  hasAtAnyScope(caps, module, action) || (action !== 'manage' && hasAtAnyScope(caps, module, 'manage'));

/** The owning module of a capability key (drops trailing `.action.scope`), for block checks. */
const moduleOfCapability = (capability: string): string => {
  const parts = capability.split('.');
  return parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];
};

/** True if `module` — or any ancestor section — is explicitly blocked by an admin. */
const isBlocked = (blocked: string[] | undefined, module: string): boolean => {
  if (!blocked?.length) return false;
  const parts = module.split('.');
  return parts.some((_, i) => blocked.includes(parts.slice(0, parts.length - i).join('.')));
};

/** THE single visibility decision. Everything else is a thin wrapper over this. */
export const isVisible = (caps: unknown, blocked: string[] | undefined, req: VisibilityReq): boolean => {
  if (req === 'universal') return true;
  if ('anyOf' in req) return req.anyOf.some((r) => isVisible(caps, blocked, r));
  if ('capability' in req) {
    return evaluateCapability(caps, req.capability) && !isBlocked(blocked, moduleOfCapability(req.capability));
  }
  if ('action' in req) {
    return hasActionOrManage(caps, req.module, req.action) && !isBlocked(blocked, req.module);
  }
  return hasActionOrManage(caps, req.module, 'view') && !isBlocked(blocked, req.module);
};

export interface VisibilityAPI {
  /** Sidebar item / page: VIEW on the module at any scope. */
  canSeeModule: (module: string) => boolean;
  /** Alias of canSeeModule for page-level call sites (readability). */
  canSeePage: (module: string) => boolean;
  /** Tab visibility — a tab is navigation, so it follows the same rule. */
  canSeeTab: (req: VisibilityReq) => boolean;
  /** Button / action affordance: the module.action at any scope. */
  canSeeAction: (module: string, action: string) => boolean;
  /** Dashboard widget / card visibility. */
  canSeeWidget: (req: VisibilityReq) => boolean;
  /** A parent group is visible iff at least one child is — drives auto-collapse. */
  canSeeGroup: (children: VisibilityReq[]) => boolean;
  /** Escape hatch for an explicit requirement. */
  canSee: (req: VisibilityReq) => boolean;
}

const bind = (caps: unknown, blocked: string[] | undefined): VisibilityAPI => ({
  canSeeModule: (m) => isVisible(caps, blocked, { module: m }),
  canSeePage: (m) => isVisible(caps, blocked, { module: m }),
  canSeeTab: (req) => isVisible(caps, blocked, req),
  canSeeAction: (m, a) => isVisible(caps, blocked, { module: m, action: a }),
  canSeeWidget: (req) => isVisible(caps, blocked, req),
  canSeeGroup: (children) => children.some((r) => isVisible(caps, blocked, r)),
  canSee: (req) => isVisible(caps, blocked, req),
});

/**
 * Reactive hook — sidebar, tabs, widgets and buttons consume this. Re-renders when
 * capabilities or blocked sections change (so a live grant/revoke updates the UI).
 */
export const useVisibility = (): VisibilityAPI => {
  const caps = useSelector((s: RootState) => (s as any).authz?.capabilities ?? []);
  const blocked = useSelector((s: RootState) => (s as any).authz?.blockedSections ?? []);
  return useMemo(() => bind(caps, blocked), [caps, blocked]);
};

/** Non-reactive snapshot for imperative call sites (route guards, one-off checks). */
export const visibility = (): VisibilityAPI => {
  const st = store.getState() as any;
  return bind(st.authz?.capabilities ?? [], st.authz?.blockedSections ?? []);
};
