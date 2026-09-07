import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanyOverview } from '@services/company';

/**
 * Organization-scope selection — the shared "which org am I looking at?" filter.
 *
 * Domain-agnostic on purpose. Any screen whose data is company-scoped (FAQs,
 * announcements, holidays, policies, …) can drop this in and get the same
 * control, the same option order and the same cache, instead of each feature
 * re-deriving an org list from whatever it happened to have loaded.
 *
 * `ALL_ORGS` is the "no filter" sentinel: pass `scopeId` straight to an API's
 * `companyId` param and it is simply omitted, which the backend reads as "the
 * caller's whole org family".
 *
 * Options are emitted in react-select's `{ value, label }` shape so they drop
 * straight into the app's existing `SelectInput` / `DropdownInput` — this hook
 * supplies data, it does not introduce another dropdown.
 */

/**
 * Sentinel for "every organization in the family". Matches the `'All'` value the
 * app's other toolbar filters already use, so this control behaves identically
 * to the Sub Organization / Branch filters on payroll and employee screens.
 * Callers translate it to "omit the companyId param" via `toCompanyIdParam`.
 */
export const ALL_ORGS = 'All';

/** `'All'` means "send no companyId", which the API reads as the whole family. */
export const toCompanyIdParam = (scopeId: string): string | undefined =>
    scopeId && scopeId !== ALL_ORGS ? scopeId : undefined;

export interface OrgScopeNode {
    id: string;
    name: string;
    parentId: string | null;
    /** 0 = family root, 1 = its children, and so on. */
    depth: number;
    isRoot: boolean;
    /** Organization logo URL, when one has been uploaded. */
    logo?: string;
}

/** One cache key for the org list, shared by every screen that offers this filter. */
export const ORG_SCOPE_QUERY_KEY = ['org-scope'] as const;

/** Organizations change rarely; a long stale time keeps this off the network. */
const ORG_STALE_TIME_MS = 10 * 60 * 1000;

/**
 * Flatten the organization list into depth-ordered nodes: root first, then each
 * child beneath its parent. Cycles (from bad data) are broken rather than hung on.
 */
const toTree = (payload: unknown): OrgScopeNode[] => {
    const raw = (payload as { data?: { companyOverview?: unknown } })?.data?.companyOverview;
    const rows = Array.isArray(raw)
        ? (raw as { id?: string; name?: string; parentOrganizationId?: string | null; logo?: string }[])
        : [];

    const valid = rows.filter((row) => row?.id && row?.name);
    const childrenByParent = new Map<string | null, typeof valid>();
    for (const row of valid) {
        const key = row.parentOrganizationId ?? null;
        childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), row]);
    }

    const out: OrgScopeNode[] = [];
    const seen = new Set<string>();

    const walk = (parentId: string | null, depth: number) => {
        const children = [...(childrenByParent.get(parentId) ?? [])].sort((a, b) =>
            (a.name ?? '').localeCompare(b.name ?? ''),
        );
        for (const child of children) {
            if (seen.has(child.id!)) continue; // defensive against a parent cycle
            seen.add(child.id!);
            out.push({
                id: child.id!,
                name: child.name!,
                parentId,
                depth,
                isRoot: parentId === null,
                logo: child.logo || undefined,
            });
            walk(child.id!, depth + 1);
        }
    };

    walk(null, 0);

    // Orphans (parent missing or filtered out) would otherwise vanish from the
    // filter entirely, hiding their data behind an option nobody can select.
    for (const row of valid) {
        if (!seen.has(row.id!)) {
            out.push({ id: row.id!, name: row.name!, parentId: null, depth: 0, isRoot: false, logo: row.logo || undefined });
        }
    }

    return out;
};

export interface UseOrgScopeOptions {
    /** Initial selection. Defaults to ALL_ORGS. */
    initialScopeId?: string;
    /** Label for the "no filter" option. Default "All organizations". */
    allLabel?: string;
    /** Omit the "all" option when a screen must always target exactly one org. */
    includeAll?: boolean;
    /**
     * Drop the family root(s), leaving only sub-organizations. For records that
     * are always owned by an operating company (leads, prefixes, …) — the holding
     * root has no such records, so offering it is only a way to pick wrong.
     */
    subOrgsOnly?: boolean;
}

export function useOrgScope(options: UseOrgScopeOptions = {}) {
    const {
        initialScopeId = ALL_ORGS, allLabel = 'All Sub Organizations',
        includeAll = true, subOrgsOnly = false,
    } = options;
    const [scopeId, setScopeId] = useState(initialScopeId);

    const query = useQuery({
        queryKey: ORG_SCOPE_QUERY_KEY,
        queryFn: () => fetchCompanyOverview(),
        select: toTree,
        staleTime: ORG_STALE_TIME_MS,
    });

    const organizations = useMemo(() => {
        const rows = query.data ?? [];
        // Only filter when it leaves something to pick — a flat single-org family
        // would otherwise end up with an empty list and nothing selectable.
        if (!subOrgsOnly) return rows;
        const subs = rows.filter((org) => !org.isRoot);
        return subs.length ? subs : rows;
    }, [query.data, subOrgsOnly]);

    const selectOptions = useMemo<{ value: string; label: string }[]>(() => {
        const rows = organizations.map((org) => ({ value: org.id, label: org.name }));
        return includeAll ? [{ value: ALL_ORGS, label: allLabel }, ...rows] : rows;
    }, [organizations, includeAll, allLabel]);

    /** The option object react-select needs for its controlled `value`. */
    const selectedOption = useMemo(
        () => selectOptions.find((option) => option.value === scopeId) ?? null,
        [selectOptions, scopeId],
    );

    const selected = useMemo(
        () => organizations.find((org) => org.id === scopeId) ?? null,
        [organizations, scopeId],
    );

    return {
        /** Pass straight to an API `companyId` param — empty means "whole family". */
        scopeId,
        setScopeId,
        /** The selected node, or null when scoped to the whole family. */
        selected,
        organizations,
        selectOptions,
        selectedOption,
        /** A single-org family has nothing to filter; hide the control entirely. */
        hasChoice: organizations.length > 1,
        isLoading: query.isLoading,
    };
}
