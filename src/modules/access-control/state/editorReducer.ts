/**
 * Permission Editor — pure local state (Phase 5.2).
 *
 * Server state stays in React Query; this reducer owns ONLY the working copy
 * being edited plus the baseline it was hydrated from. Dirtiness is derived by
 * comparing the two — never stored as a separate flag that could drift.
 *
 * Pure and dependency-free so it can be unit-tested in isolation.
 */
import type { BusinessCapability, EditorCapability, EditorModule, Reach, SimpleLevel } from '../types';

export interface EditorState {
  /** Working copy, keyed by module. */
  modules: Record<string, EditorModule>;
  /** Pristine server copy, for dirty comparison and discard. */
  baseline: Record<string, EditorModule>;
  hydrated: boolean;
}

export type EditorAction =
  | { type: 'HYDRATE'; modules: EditorModule[] }
  | { type: 'SET_CAPABILITY'; moduleKey: string; action: BusinessCapability; reach: Reach }
  | { type: 'SET_LEVEL'; moduleKey: string; level: Exclude<SimpleLevel, 'custom'>; reach?: Reach }
  | { type: 'DISCARD' };

export const initialEditorState: EditorState = { modules: {}, baseline: {}, hydrated: false };

const byKey = (modules: EditorModule[]): Record<string, EditorModule> =>
  modules.reduce<Record<string, EditorModule>>((acc, m) => { acc[m.key] = m; return acc; }, {});

/** Which capabilities each Simple-Mode level turns on (mirrors the backend). */
const LEVEL_CAPABILITIES: Record<Exclude<SimpleLevel, 'custom'>, BusinessCapability[]> = {
  none: [],
  view: ['view'],
  manage: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
};

/** Derive the card level from a capability set (mirrors the backend). */
export const deriveLevel = (capabilities: EditorCapability[]): SimpleLevel => {
  const granted = capabilities.filter((c) => c.reach !== 'none');
  if (granted.length === 0) return 'none';
  const viewGranted = capabilities.find((c) => c.action === 'view')?.reach !== 'none';
  const allWrites = capabilities.filter((c) => c.action !== 'view').every((c) => c.reach !== 'none');
  if (allWrites && viewGranted) return 'manage';
  if (granted.length === 1 && viewGranted) return 'view';
  return 'custom';
};

const withCapabilities = (module: EditorModule, capabilities: EditorCapability[]): EditorModule => ({
  ...module,
  capabilities,
  level: deriveLevel(capabilities),
});

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'HYDRATE': {
      const map = byKey(action.modules);
      return { modules: map, baseline: map, hydrated: true };
    }

    case 'SET_CAPABILITY': {
      const module = state.modules[action.moduleKey];
      if (!module) return state;
      const capabilities = module.capabilities.map((c) =>
        c.action === action.action ? { ...c, reach: action.reach } : c,
      );
      return { ...state, modules: { ...state.modules, [action.moduleKey]: withCapabilities(module, capabilities) } };
    }

    case 'SET_LEVEL': {
      const module = state.modules[action.moduleKey];
      if (!module) return state;
      const on = new Set(LEVEL_CAPABILITIES[action.level]);
      // Preserve the module's existing reach where possible so "Manage" doesn't
      // silently widen a department-scoped role to company-wide.
      const existingReach = module.capabilities.find((c) => c.reach !== 'none')?.reach;
      const reach: Reach = action.reach ?? (existingReach && existingReach !== 'none' ? existingReach : 'company');
      const capabilities = module.capabilities.map((c) => ({ ...c, reach: on.has(c.action) ? reach : ('none' as Reach) }));
      return { ...state, modules: { ...state.modules, [action.moduleKey]: withCapabilities(module, capabilities) } };
    }

    case 'DISCARD':
      return { ...state, modules: state.baseline };

    default:
      return state;
  }
};

/** True when a module's working copy differs from its baseline. */
export const isModuleDirty = (state: EditorState, key: string): boolean => {
  const current = state.modules[key];
  const original = state.baseline[key];
  if (!current || !original) return false;
  return current.capabilities.some((c) => {
    const before = original.capabilities.find((o) => o.action === c.action);
    return before?.reach !== c.reach;
  });
};

/** Keys of every changed module — the exact payload the backend will replace. */
export const dirtyModuleKeys = (state: EditorState): string[] =>
  Object.keys(state.modules).filter((key) => isModuleDirty(state, key));

/** The save payload: business language, changed modules only. */
export const toSavePayload = (state: EditorState) => ({
  modules: dirtyModuleKeys(state).map((key) => ({
    key,
    capabilities: state.modules[key].capabilities.map(({ action, reach }) => ({ action, reach })),
  })),
});
