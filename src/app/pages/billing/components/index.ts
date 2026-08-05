/**
 * Billing shared components — the one import surface for the module.
 *
 * Every Billing screen composes from here so the module stays visually consistent. These
 * are thin wrappers over the app-wide kit (`@app/modules/common/components/ui`), never a
 * replacement for it: reach for the kit first, and add here only what is Billing-specific
 * and used by more than one screen.
 */
export {
    BillingStatsCard,
    BillingStatusBadge,
    BillingEmptyState,
    BillingLoadingState,
    BillingSummaryCard,
    BILLING_STATUS_TONES,
} from "./BillingPrimitives";
export type { BillingStatsCardProps, BillingSummaryRow } from "./BillingPrimitives";

export { default as BillingTable, BillingFilters } from "./BillingTable";
export type { BillingColumn, BillingFilterDef, BillingTableProps } from "./BillingTable";

export { default as BillingTimeline } from "./BillingTimeline";
export type { BillingTimelineStep, BillingTimelineState } from "./BillingTimeline";

export { default as BillingPageHeader } from "./BillingPageHeader";
