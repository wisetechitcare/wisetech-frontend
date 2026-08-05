import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import TopBarProgress from "react-topbar-progress-indicator";
import { isSectionBlocked } from "@utils/accessAreas";
import BillingLayout from "../BillingLayout";
import { BILLING_TABS, billingDefaultPath } from "../constants/billingNav";

/**
 * Billing module routes.
 *
 * One nested route tree under /billing: the layout owns the header tabs and renders an
 * <Outlet />, so every tab is a real, linkable, bookmarkable URL rather than component
 * state — the same routing shape the rest of the app uses.
 *
 * Every page is lazy so the module (and its charts/tables) is only fetched when someone
 * actually opens Billing.
 */

const BillingDashboard = lazy(() => import("../dashboard/BillingDashboard"));
const BillingRequestsPage = lazy(() => import("../billing-requests/BillingRequestsPage"));
const AccountsQueuePage = lazy(() => import("../accounts-queue/AccountsQueuePage"));
const ProformasPage = lazy(() => import("../proformas/ProformasPage"));
const PaymentsPage = lazy(() => import("../payments/PaymentsPage"));
const InvoicesPage = lazy(() => import("../invoices/InvoicesPage"));
const BillingReportsPage = lazy(() => import("../reports/BillingReportsPage"));
const BillingSettingsPage = lazy(() => import("../settings/BillingSettingsPage"));

const PAGES: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
    dashboard: BillingDashboard,
    requests: BillingRequestsPage,
    accounts: AccountsQueuePage,
    proformas: ProformasPage,
    payments: PaymentsPage,
    invoices: InvoicesPage,
    reports: BillingReportsPage,
    settings: BillingSettingsPage,
};

const Suspensed: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={<TopBarProgress />}>{children}</Suspense>
);

const BillingRoutes: React.FC = () => {
    const allowed = (key: string) => !isSectionBlocked(key);

    return (
        <Routes>
            <Route element={<BillingLayout />}>
                {/* Bare /billing lands on the first tab this user may actually see. */}
                <Route index element={<Navigate to={billingDefaultPath(allowed)} replace />} />

                {BILLING_TABS.filter((tab) => allowed(tab.accessKey)).map((tab) => {
                    const Page = PAGES[tab.path];
                    return (
                        <Route
                            key={tab.path}
                            path={tab.path}
                            element={<Suspensed><Page /></Suspensed>}
                        />
                    );
                })}

                {/* Unknown or blocked sub-path → the default tab, never a blank shell. */}
                <Route path="*" element={<Navigate to={billingDefaultPath(allowed)} replace />} />
            </Route>
        </Routes>
    );
};

export default BillingRoutes;
