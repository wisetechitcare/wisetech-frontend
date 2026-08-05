/**
 * Billing module navigation — the single source of truth for its tabs.
 *
 * The header tabs, the routes and the per-tab access keys all derive from THIS array, so
 * adding a tab is one entry rather than three edits that can drift out of step.
 *
 * `accessKey` follows the app's existing section-key convention (`crm.leads`,
 * `attendance.employees`), which is what `isSectionBlocked` consumes.
 */

export interface BillingTabDef {
    /** Route segment under /billing. */
    path: string;
    title: string;
    /** Bootstrap icon class — same icon system as the sidebar and MaterialHeaderTab. */
    icon: string;
    /** Access-area key checked before the tab is shown. */
    accessKey: string;
}

export const BILLING_BASE = "/billing";

export const BILLING_TABS: BillingTabDef[] = [
    { path: "dashboard", title: "Dashboard", icon: "bi-speedometer2", accessKey: "billing.dashboard" },
    { path: "requests", title: "Billing Requests", icon: "bi-file-earmark-text", accessKey: "billing.requests" },
    { path: "accounts", title: "Accounts Queue", icon: "bi-inbox", accessKey: "billing.accounts" },
    // The Accounts workspace: one row per approved request, carrying its whole
    // financial journey. Sits immediately after the queue it consumes from.
    { path: "operations", title: "Billing Operations", icon: "bi-diagram-3", accessKey: "billing.operations" },
    { path: "proformas", title: "Proformas", icon: "bi-receipt", accessKey: "billing.proformas" },
    { path: "payments", title: "Payments", icon: "bi-cash-coin", accessKey: "billing.payments" },
    { path: "invoices", title: "Tax Invoices", icon: "bi-receipt-cutoff", accessKey: "billing.invoices" },
    { path: "reports", title: "Reports", icon: "bi-graph-up", accessKey: "billing.reports" },
    { path: "settings", title: "Settings", icon: "bi-gear", accessKey: "billing.settings" },
];

/** Landing route for the module — the first tab the user is allowed to see. */
export const billingDefaultPath = (isVisible: (key: string) => boolean): string => {
    const first = BILLING_TABS.find((t) => isVisible(t.accessKey)) ?? BILLING_TABS[0];
    return `${BILLING_BASE}/${first.path}`;
};

/**
 * Resolve the active tab index from a pathname. -1 when none matches.
 *
 * Uses `startsWith`, so a sub-page like /billing/requests/:id keeps Billing Requests
 * highlighted rather than dropping the whole bar.
 */
export const activeBillingTabIndex = (pathname: string, tabs: BillingTabDef[]): number =>
    tabs.findIndex((t) => pathname.startsWith(`${BILLING_BASE}/${t.path}`));
