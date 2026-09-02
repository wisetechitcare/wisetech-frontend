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
const PaymentCollectionPage = lazy(() => import("../payments/PaymentCollectionPage"));
const PaymentDetailPage = lazy(() => import("../payments/PaymentDetailPage"));
const BillingOperationsPage = lazy(() => import("../operations/BillingOperationsPage"));
const BillingOperationDetailPage = lazy(() => import("../operations/BillingOperationDetailPage"));
const ProformasPage = lazy(() => import("../proformas/ProformasPage"));
const InvoicesPage = lazy(() => import("../invoices/InvoicesPage"));
const BillingReportsPage = lazy(() => import("../reports/BillingReportsPage"));
const BillingConfigurePage = lazy(() => import("../configure/BillingConfigurePage"));
const BillingRequestDetailPage = lazy(() => import("../billing-requests/BillingRequestDetailPage"));
const BillingRequestFormPage = lazy(() => import("../billing-requests/BillingRequestFormPage"));
// The template-driven document editor. Lazy on its own chunk — it carries the A4
// preview surface and is only reached from a proforma row.
const DocumentEditorPage = lazy(() => import("../documents/DocumentEditorPage"));
const ProformaDetailPage = lazy(() => import("../proformas/ProformaDetailPage"));
// Financial Reporting Center — one dedicated page per report card on the
// landing page above. Each is its own chunk; nobody pays for all seven at once.
const RevenueReportPage = lazy(() => import("../reports/RevenueReportPage"));
const CollectionReportPage = lazy(() => import("../reports/CollectionReportPage"));
const OutstandingReportPage = lazy(() => import("../reports/OutstandingReportPage"));
const ReceivableReportPage = lazy(() => import("../reports/ReceivableReportPage"));
const MonthlyReportPage = lazy(() => import("../reports/MonthlyReportPage"));
const ClientReportPage = lazy(() => import("../reports/ClientReportPage"));
const ProjectReportPage = lazy(() => import("../reports/ProjectReportPage"));

const PAGES: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
    dashboard: BillingDashboard,
    requests: BillingRequestsPage,
    operations: BillingOperationsPage,
    proformas: ProformasPage,
    payments: PaymentCollectionPage,
    invoices: InvoicesPage,
    reports: BillingReportsPage,
    configure: BillingConfigurePage,
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

                {/* Billing-request sub-pages. Declared before the catch-all and with the
                    literal "new" ahead of ":id" so it is never read as a request id.
                    They keep the module's tab bar — Billing Requests stays highlighted. */}
                {allowed("billing.requests") && (
                    <>
                        <Route path="requests/new" element={<Suspensed><BillingRequestFormPage /></Suspensed>} />
                        <Route path="requests/:id/edit" element={<Suspensed><BillingRequestFormPage /></Suspensed>} />
                        <Route path="requests/:id" element={<Suspensed><BillingRequestDetailPage /></Suspensed>} />
                    </>
                )}

                {/* One operation, end to end. Keeps the Billing Operations tab highlighted. */}
                {allowed("billing.operations") && (
                    <Route path="operations/:id" element={<Suspensed><BillingOperationDetailPage /></Suspensed>} />
                )}

                {/* Proforma repository. `/edit` is the document editor (drafts only);
                    the bare id is the read-only repository record with its revision
                    chain. Two URLs because they are two jobs — managing the chain and
                    editing one version of it. */}
                {allowed("billing.proformas") && (
                    <>
                        <Route path="proformas/:id/edit" element={<Suspensed><DocumentEditorPage /></Suspensed>} />
                        <Route path="proformas/:id" element={<Suspensed><ProformaDetailPage /></Suspensed>} />
                    </>
                )}

                {/* One payment collection, end to end. Keeps the Payment Collection tab
                    highlighted. */}
                {allowed("billing.payments") && (
                    <Route path="payments/:id" element={<Suspensed><PaymentDetailPage /></Suspensed>} />
                )}

                {/* Financial Reporting Center. Each card on the Reports landing page
                    navigates to one of these; Client/Project are drill-down-only
                    (entered via ?clientId=/?projectId=, no picker of their own). */}
                {allowed("billing.reports") && (
                    <>
                        <Route path="reports/revenue" element={<Suspensed><RevenueReportPage /></Suspensed>} />
                        <Route path="reports/collections" element={<Suspensed><CollectionReportPage /></Suspensed>} />
                        <Route path="reports/outstanding" element={<Suspensed><OutstandingReportPage /></Suspensed>} />
                        <Route path="reports/receivables" element={<Suspensed><ReceivableReportPage /></Suspensed>} />
                        <Route path="reports/monthly" element={<Suspensed><MonthlyReportPage /></Suspensed>} />
                        <Route path="reports/client" element={<Suspensed><ClientReportPage /></Suspensed>} />
                        <Route path="reports/project" element={<Suspensed><ProjectReportPage /></Suspensed>} />
                    </>
                )}

                {/* Unknown or blocked sub-path → the default tab, never a blank shell. */}
                <Route path="*" element={<Navigate to={billingDefaultPath(allowed)} replace />} />
            </Route>
        </Routes>
    );
};

export default BillingRoutes;
