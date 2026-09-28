/**
 * Tab slugs that are real URLs, e.g. `/projects/map`.
 *
 * Plain strings on purpose: the router registers one static route per slug, and importing
 * the page modules here to read their tab lists would defeat their lazy loading. Each list
 * is the SUPERSET of that page's tabs — a tab the viewer lacks permission for simply falls
 * back to the first tab when its URL is opened.
 *
 * Static, never `/:tab`: a dynamic segment would be ambiguous against the detail routes
 * that share the same base (`/projects/:projectId`, `/companies/:companyId`).
 *
 * Keep in step with the tab TITLES on the page — the slug is `tabSlug(title)`
 * (see `hooks/useTabRoute.ts`). A slug missing here 404s on refresh.
 */
export const TAB_PATHS = {
    projects: ['overview', 'projects', 'map', 'configure'],
    leads: ['overview', 'leads', 'files', 'configure'],
    companies: ['overview', 'companies', 'map', 'configure'],
    contacts: ['overview', 'contacts', 'calendar', 'map', 'configure'],
    // `configure` is absent on purpose: /tasks/configure is its own permission-gated page.
    tasks: ['overview', 'tasks'],
    loans: [
        'loans', 'installments', 'configure',
        'personal-loans', 'personal-installments', 'overview', 'search-employees',
        'rules-and-faqs',
        // A user holding both own- and others- permissions sees two "Installments" tabs;
        // useTabRoute suffixes the repeat, so that URL has to exist too.
        'installments-2',
    ],
    organisationProfile: ['organizations', 'configure'],
    employees: ['employees', 'configure'],
} as const satisfies Record<string, readonly string[]>;

/**
 * Salary (`/finance/salary/*`) and Reimbursements (`/finance/reimbursements/*`) are NOT
 * listed here: nothing else lives under those bases, so their routes use a splat and any
 * tab slug resolves without naming it twice. The four above cannot, because a detail route
 * shares their base.
 */
