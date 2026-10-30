import React, { useMemo } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { type TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import ModuleOrgFilter from "@app/modules/common/components/ModuleOrgFilter";
import { useOrgScope, toCompanyIdParam } from "@/hooks/useOrgScope";
import { BILLING_BASE, BILLING_TABS, activeBillingTabIndex, billingDefaultPath, canOpenBillingTab } from "./constants/billingNav";

/**
 * Billing module shell — sidebar → Billing → horizontal header tabs → page.
 *
 * Reuses the app's existing `MaterialHeaderTab` (the same sticky gradient tab bar the
 * approvals and attendance screens use) rather than inventing a bar for this module, so
 * Billing looks and behaves like everything else.
 *
 * ROUTE-DRIVEN, not state-driven: every tab is a real route, so a Billing page can be
 * linked to, bookmarked and back-buttoned. `MaterialHeaderTab` renders whichever tab is
 * selected, so each tab's `component` is the SAME `<Outlet />` — the router decides what
 * actually renders, and the tab bar only moves the URL.
 *
 * The organization filter lives HERE, in the tab bar, as it does on Recruitment: one control
 * for the whole module, so the Billing Tracker and the Invoice Tracker always show the same
 * organization instead of each carrying a filter of its own. Pages read it with
 * `useBillingOrgId()`.
 */

interface BillingOutletContext {
  /** Undefined when "All organizations" is selected — the API reads that as no filter. */
  organizationId?: string;
}

/** The organization chosen in the Billing tab bar, for a page's API params. */
export const useBillingOrgId = (): string | undefined =>
  useOutletContext<BillingOutletContext | undefined>()?.organizationId;

// Configure holds display settings shared by every organization; filtering it would imply an
// ownership that doesn't exist, so the control is hidden there rather than left doing nothing.
const UNSCOPED_PATHS = new Set(["configure"]);

const BillingLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Leads (and so every bill) belong to an operating company, never the holding root.
  const { scopeId, setScopeId, selectOptions, hasChoice } = useOrgScope({
    allLabel: "All organizations",
    subOrgsOnly: true,
  });
  const outletContext = useMemo<BillingOutletContext>(
    () => ({ organizationId: toCompanyIdParam(scopeId) }),
    [scopeId],
  );

  // Tabs an admin has blocked disappear entirely rather than rendering a dead end.
  const tabs = useMemo(() => BILLING_TABS.filter((t) => canOpenBillingTab(t.accessKey)), []);

  const activeIndex = activeBillingTabIndex(location.pathname, tabs);

  const tabItems: TabItem[] = tabs.map((tab) => ({
    title: tab.title,
    icon: tab.icon,
    component: <Outlet context={outletContext} />,
  }));

  // Bare /billing, or a tab the user can't see → send them to their first allowed tab.
  if (activeIndex === -1) {
    return <Navigate to={billingDefaultPath(canOpenBillingTab)} replace />;
  }

  const activeTitle = tabs[activeIndex]?.title ?? "Billing";
  const scoped = !UNSCOPED_PATHS.has(tabs[activeIndex]?.path);

  return (
    <>
      {/* Breadcrumb: Billing → <tab>, matching every other module's header. */}
      <PageTitle breadcrumbs={[{ title: "Billing", path: BILLING_BASE, isActive: false, isSeparator: false }]}>
        {activeTitle}
      </PageTitle>

      <MaterialHeaderTab
        headerAction={
          scoped ? (
            <ModuleOrgFilter scopeId={scopeId} setScopeId={setScopeId} selectOptions={selectOptions} hasChoice={hasChoice} />
          ) : undefined
        }
        tabItems={tabItems}
        activeTab={activeIndex}
        onTabChange={(index) => navigate(`${BILLING_BASE}/${tabs[index].path}`)}
        hideScrollButtons
      />
    </>
  );
};

export default BillingLayout;
