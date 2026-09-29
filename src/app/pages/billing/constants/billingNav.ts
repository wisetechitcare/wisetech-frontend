import { canSection } from "@utils/can";

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

// The order here is the order of the header tabs, and it follows the money: what is
// asked for, what Accounts is working on, what was issued, what came back, what it
// all adds up to. A tab is still only shown to a user who holds its `accessKey`.
export const BILLING_TABS: BillingTabDef[] = [
    // { path: "dashboard", title: "Dashboard", icon: "bi-speedometer2", accessKey: "billing.dashboard" },
    // { path: "requests", title: "Billing Requests", icon: "bi-file-earmark-text", accessKey: "billing.requests" },
    // The Accounts workspace: one row per approved request, carrying its whole
    // financial journey. Pre-filter with ?status=READY_FOR_PROFORMA to see the queue.
    // Renamed from "Billing Operations" — it is the sheet you watch, not a thing you
    // operate — and the path followed the name. /billing/operations still redirects
    // (BillingRoutes), so old bookmarks land. The ACCESS KEY stays `billing.operations`:
    // grants are stored per key, and renaming one revokes everybody who holds it.
    { path: "tracker", title: "Billing Tracker", icon: "bi-diagram-3", accessKey: "billing.operations" },
    // { path: "proformas", title: "Proformas", icon: "bi-receipt", accessKey: "billing.proformas" },
    // Record, verify and track client payments against issued proformas.
    // Title only. The PATH and the ACCESS KEY stay `payments` / `billing.payments`
    // on purpose: grants are stored per key, so renaming one revokes everybody who
    // holds it, and the path is in people's bookmarks and in drill-down links.
    { path: "payments", title: "Invoice Tracker", icon: "bi-cash-coin", accessKey: "billing.payments" },
    // { path: "invoices", title: "Tax Invoices", icon: "bi-receipt-cutoff", accessKey: "billing.invoices" },
    // { path: "reports", title: "Reports", icon: "bi-graph-up", accessKey: "billing.reports" },
    // Display configuration for the module's statuses and payment states.
    { path: "configure", title: "Configure", icon: "bi-gear", accessKey: "billing.configure" },
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

/** Whether a billing tab opens: Read on its section, or Write for Configure (it changes how billing works). */
export const canOpenBillingTab = (accessKey: string): boolean =>
    canSection(accessKey, accessKey === "billing.configure" ? "write" : "read");
