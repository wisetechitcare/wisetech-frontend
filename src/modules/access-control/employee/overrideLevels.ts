/**
 * Access Control — Employee override level helpers.
 *
 * Pure functions extracted so the Employee Access › Permission Overrides panel can
 * derive per-module access levels the SAME way the platform always has. The actual
 * override WRITES go through the shared `employeeAccess` services (setSectionAccessLevel
 * / resetAllEmployeeOverrides) — this file only derives display levels, never
 * duplicating the override business logic.
 *
 * (The legacy EmployeeAccessTab keeps its own copies until it is removed in Step 6;
 * this is a deliberate, temporary overlap of two pure display helpers only.)
 */
import { ACCESS_AREAS, AccessArea } from '@utils/accessAreas';
import type { EffLevel } from '@app/pages/employee/components/AccessControlTree';

/** Flatten an access area to its controllable leaf modules. */
export const getLeaves = (area: AccessArea): Array<{ module: string; label: string }> => {
  if (!area.children?.length) return [{ module: area.module, label: area.label }];
  const out: Array<{ module: string; label: string }> = [];
  const walk = (n: AccessArea) => {
    if (!n.children?.length) out.push({ module: n.module, label: n.label });
    else n.children.forEach(walk);
  };
  area.children.forEach(walk);
  return out;
};

/** Every controllable leaf module across the access-area tree. */
export const ALL_LEAVES: Array<{ module: string; label: string }> = ACCESS_AREAS.flatMap(getLeaves);

/** Derive a section's access level (view/edit/none) from a flat permission-key list. */
export const levelFromKeys = (keys: string[], leaf: string): EffLevel => {
  if (keys.includes('*.*.global') || keys.includes('*.*.all')) return 'edit';
  const prefixes = [leaf, leaf.split('.').slice(0, -1).join('.')].filter(Boolean);
  let level: EffLevel = 'none';
  for (const key of keys) {
    const parts = key.split('.');
    const action = parts[parts.length - 2];
    const mod = parts.slice(0, -2).join('.');
    if (prefixes.includes(mod)) {
      if (['create', 'update', 'delete', 'manage'].includes(action)) return 'edit';
      if (action === 'view') level = level === 'none' ? 'view' : level;
    }
  }
  return level;
};

/** Map the tree's EffLevel to the override API's AccessLevel, given the role baseline. */
export const toApiLevel = (
  staged: EffLevel,
  roleBaseline: EffLevel,
): 'default' | 'view' | 'edit' | 'blocked' => {
  if (staged === roleBaseline) return 'default'; // inherit — no override needed
  if (staged === 'edit') return 'edit';
  if (staged === 'view') return 'view';
  return 'blocked'; // staged === 'none'
};
