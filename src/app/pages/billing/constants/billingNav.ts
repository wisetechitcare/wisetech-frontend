import { LayoutGrid, Settings, Wallet } from "lucide-react";
import type { IconSource } from "@/ds/ui/dynamic-icon";
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
    /** A Lucide component, the icon system MaterialHeaderTab and the kit share. */
    icon: IconSource;
    /** Access-area key checked before the tab is shown. */
    accessKey: string;
}

export const BILLING_BASE = "/billing";

// The order here is the order of the header tabs, and it follows the money: the overview,
// every project, the proformas raised, the tax invoices issued, then the module's settings.
// A tab is only shown to a user who holds its `accessKey`.
export const BILLING_TABS: BillingTabDef[] = [
    // Hidden for now (2026-11-19) — uncomment to restore. Its route follows this list, so it goes too.
    // { path: "dashboard", title: "Dashboard", icon: Gauge, accessKey: "billing.dashboard" },
    // One row per project: contract, billed, received, pending, and the hand-set Bill Stage.
    { path: "tracker", title: "Bill Status", icon: LayoutGrid, accessKey: "billing.tracker" },
    // Every project's proformas, end to end. Hidden for now (2026-11-13) — uncomment to restore.
    // { path: "proformas", title: "Proformas", icon: FileText, accessKey: "billing.proformas" },
    // Every issued bill: Bill Amount / GST / TDS and what has come in against each.
    { path: "payments", title: "Payments", icon: Wallet, accessKey: "billing.invoices" },
    // Every project's tax invoices, end to end — the Proforma Tracker's sibling. Hidden for now (2026-11-13) — uncomment to restore.
    // { path: "invoices", title: "Tax Invoices", icon: Receipt, accessKey: "billing.invoices" },
    // Display configuration for the module's statuses and payment states, and the GST / TDS rates.
    { path: "configure", title: "Configure", icon: Settings, accessKey: "billing.configure" },
];

/** Landing route for the module — the first tab the user is allowed to see. */
export const billingDefaultPath = (isVisible: (key: string) => boolean): string => {
    const first = BILLING_TABS.find((t) => isVisible(t.accessKey)) ?? BILLING_TABS[0];
    return `${BILLING_BASE}/${first.path}`;
};

/**
 * Resolve the active tab index from a pathname. -1 when none matches.
 *
 * Uses `startsWith`, so a sub-page under a tab's path keeps that tab highlighted.
 */
export const activeBillingTabIndex = (pathname: string, tabs: BillingTabDef[]): number =>
    tabs.findIndex((t) => pathname.startsWith(`${BILLING_BASE}/${t.path}`));

/** Whether a billing tab opens: Read on its section, or Write for Configure (it changes how billing works). */
export const canOpenBillingTab = (accessKey: string): boolean =>
    canSection(accessKey, accessKey === "billing.configure" ? "write" : "read");
