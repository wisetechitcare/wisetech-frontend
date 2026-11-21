import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import TopBarProgress from "react-topbar-progress-indicator";
import BillingLayout from "../BillingLayout";
import { BILLING_TABS, billingDefaultPath, canOpenBillingTab } from "../constants/billingNav";

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
const BillingTrackerPage = lazy(() => import("../billing-tracker/BillingTrackerPage"));
const ProformaTrackerPage = lazy(() => import("../proforma-tracker/ProformaTrackerPage"));
const BillInvoiceTrackerPage = lazy(() => import("../invoice-tracker/BillInvoiceTrackerPage"));
const InvoiceTrackerPage = lazy(() => import("../invoice-tracker/InvoiceTrackerPage"));
const BillingConfigurePage = lazy(() => import("../configure/BillingConfigurePage"));
// The template-driven document editor. Lazy on its own chunk — it carries the A4
// preview surface and is only reached from a proforma or invoice row.
const BillDocumentEditorPage = lazy(() => import("../documents/BillDocumentEditorPage"));
const DocumentDetailPage = lazy(() => import("../documents/DocumentDetailPage"));

const PAGES: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
    dashboard: BillingDashboard,
    tracker: BillingTrackerPage,
    proformas: ProformaTrackerPage,
    payments: BillInvoiceTrackerPage,
    invoices: InvoiceTrackerPage,
    configure: BillingConfigurePage,
};

/** Old document links (`/billing/proformas/:id[/edit]`) were bookmarked and emailed; send them to the new URL. */
const LegacyDocumentRedirect: React.FC<{ edit?: boolean }> = ({ edit }) => {
    const { id } = useParams();
    return <Navigate to={`/billing/documents/${id}${edit ? "/edit" : ""}`} replace />;
};

const Suspensed: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={<TopBarProgress />}>{children}</Suspense>
);

const BillingRoutes: React.FC = () => {
    const allowed = canOpenBillingTab;

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

                {/* One billing document — a proforma or a tax invoice, both opened from their
                    tracker. `/edit` is the document editor (drafts only); the bare id is the
                    read-only record with its revision chain. Two URLs because they are two
                    jobs — managing the chain and editing one version of it. */}
                {(allowed("billing.proformas") || allowed("billing.invoices")) && (
                    <>
                        <Route path="documents/:id/edit" element={<Suspensed><BillDocumentEditorPage /></Suspensed>} />
                        <Route path="documents/:id" element={<Suspensed><DocumentDetailPage /></Suspensed>} />
                        <Route path="proformas/:id/edit" element={<LegacyDocumentRedirect edit />} />
                        <Route path="proformas/:id" element={<LegacyDocumentRedirect />} />
                    </>
                )}

                {/* Unknown or blocked sub-path → the default tab, never a blank shell. */}
                <Route path="*" element={<Navigate to={billingDefaultPath(allowed)} replace />} />
            </Route>
        </Routes>
    );
};

export default BillingRoutes;
