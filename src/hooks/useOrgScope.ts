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

/** Sentinel for "every organization in the family". Never a real company id. */
export const ALL_ORGS = '';

export interface OrgScopeNode {
    id: string;
    name: string;
    parentId: string | null;
    /** 0 = family root, 1 = its children, and so on. */
    depth: number;
    isRoot: boolean;
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
    const rows = Array.isArray(raw) ? (raw as { id?: string; name?: string; parentOrganizationId?: string | null }[]) : [];

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
            });
            walk(child.id!, depth + 1);
        }
    };

    walk(null, 0);

    // Orphans (parent missing or filtered out) would otherwise vanish from the
    // filter entirely, hiding their data behind an option nobody can select.
    for (const row of valid) {
        if (!seen.has(row.id!)) {
            out.push({ id: row.id!, name: row.name!, parentId: null, depth: 0, isRoot: false });
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
}

export function useOrgScope(options: UseOrgScopeOptions = {}) {
    const { initialScopeId = ALL_ORGS, allLabel = 'All organizations', includeAll = true } = options;
    const [scopeId, setScopeId] = useState(initialScopeId);

    const query = useQuery({
        queryKey: ORG_SCOPE_QUERY_KEY,
        queryFn: () => fetchCompanyOverview(),
        select: toTree,
        staleTime: ORG_STALE_TIME_MS,
    });

    const organizations = useMemo(() => query.data ?? [], [query.data]);

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
