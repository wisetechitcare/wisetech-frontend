/**
 * Section id ⇄ workspace URL slug — the public URL contract.
 *
 * The navigation tree's section ids ('hr-section') are internal identifiers. Putting them
 * straight into the URL would make `/workspace/hr-section`, and would break every bookmark
 * the day someone renames a section id. The mapping is therefore explicit and one-way
 * authoritative: ids may change, slugs may not.
 *
 * A section with no entry here still resolves (derived fallback) rather than 404ing, so a
 * section added to useNavigation() ships a working workspace URL before anyone remembers to
 * come back to this file.
 */

/** Root of the workspace shell. Verified free of collisions against every existing route. */
export const WORKSPACE_ROOT = '/workspace';

const SLUG_BY_SECTION_ID: Record<string, string> = {
  'general-section': 'overview',
  'hr-section': 'hr',
  'crm-section': 'crm',
  'projects-section': 'projects',
  'purchase-section': 'purchase',
  'finance-section': 'finance',
  'organization-section': 'organization',
  'admin-section': 'settings',
};

/** 'hr-section' → 'hr'. Unmapped ids fall back to the id minus its '-section' suffix. */
export function slugForSectionId(sectionId: string): string {
  return SLUG_BY_SECTION_ID[sectionId] ?? sectionId.replace(/-section$/, '');
}

/** 'hr' → '/workspace/hr'. */
export function workspacePathForSlug(slug: string): string {
  return `${WORKSPACE_ROOT}/${slug}`;
}

/**
 * The slug the current URL addresses, or null at the workspace root.
 *
 * Parses the pathname rather than reading useParams(): the shell is a PATHLESS layout route,
 * so it matches no segments of its own and useParams() would return {} there. Parsing also
 * makes this reusable from outside a route context (Phase 3 resolves the active app from
 * arbitrary module pathnames).
 */
export function slugFromPathname(pathname: string): string | null {
  if (!isWorkspacePath(pathname)) return null;
  const rest = pathname.slice(WORKSPACE_ROOT.length).replace(/^\/+/, '');
  return rest.split('/')[0] || null;
}

/**
 * Is this pathname inside the workspace shell?
 *
 * Exported because the app HEADER needs to know — it sits in MasterLayout, outside the shell
 * provider, so it cannot ask the context. A pure pathname predicate keeps that dependency
 * one-way: the header imports a function, not the feature.
 */
export function isWorkspacePath(pathname: string): boolean {
  return pathname === WORKSPACE_ROOT || pathname.startsWith(`${WORKSPACE_ROOT}/`);
}
