import type { EmployeeListParams } from '@services/employee';

/**
 * Maps the employee list's UI filter state onto the API's query parameters.
 *
 * Extracted and tested because it is the part that fails SILENTLY. The dropdowns show
 * branch and sub-org NAMES while the API filters by id, so the mapping has to resolve one
 * to the other through the facet list. Get it wrong and the request is well-formed, the
 * server happily filters on a nonexistent id, and the user sees an empty table with no
 * error anywhere.
 */

export type StatusType = 'all' | 'active' | 'inactive';

export interface FacetOption {
    id: string;
    name: string;
    count?: number;
}

export interface EmployeeListFilters {
    status: StatusType;
    /** Display name from the dropdown, or 'All'. */
    branchName: string;
    /** Display name from the dropdown, or 'All'. */
    subOrgName: string;
    /** 'Salary Based' | 'Contract Based' | 'All' */
    payType: string;
    search: string;
    sorting: Array<{ id: string; desc: boolean }>;
    facets: { branches: FacetOption[]; subOrganizations: FacetOption[] };
}

/** 'All' is the absence of a filter, not a value to send. */
const isSet = (v: string | undefined): v is string => !!v && v !== 'All';

const idForName = (options: FacetOption[], name: string): string | undefined =>
    options.find((o) => o.name === name)?.id;

export const buildEmployeeListParams = (f: EmployeeListFilters): EmployeeListParams => {
    const params: EmployeeListParams = {};

    // 'all' means no isActive constraint — NOT isActive:false. Sending false would show
    // only ex-employees, which is the opposite of what the "All" tab means.
    if (f.status === 'active') params.isActive = true;
    else if (f.status === 'inactive') params.isActive = false;

    if (isSet(f.branchName)) {
        const id = idForName(f.facets.branches, f.branchName);
        // A name with no matching facet means the facets are stale (the branch was
        // renamed or filtered out). Sending nothing is right: better the unfiltered list
        // than a filter on an id that matches no rows.
        if (id) params.branchId = id;
    }

    if (isSet(f.subOrgName)) {
        const id = idForName(f.facets.subOrganizations, f.subOrgName);
        if (id) params.companyId = id;
    }

    if (isSet(f.payType)) params.payType = f.payType;

    const q = f.search?.trim();
    if (q) params.search = q;

    // Single-column sort only; the API takes one sortBy/sortOrder pair.
    if (f.sorting.length > 0) params.sort = f.sorting[0];

    return params;
};

/**
 * Identity of everything the SERVER filters on, for resetting pagination.
 *
 * Changing a filter while on page 5 would otherwise request page 5 of a result set that
 * may now have one page, and the table renders empty. Excludes `sort` deliberately —
 * re-sorting is handled the same way but is worth seeing separately in the caller.
 */
export const employeeFilterKey = (f: EmployeeListFilters): string =>
    [f.status, f.branchName, f.subOrgName, f.payType, f.search?.trim() ?? ''].join('|');
