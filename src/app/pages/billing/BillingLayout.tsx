import React, { useMemo } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { type TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { isSectionBlocked } from "@utils/accessAreas";
import { BILLING_BASE, BILLING_TABS, activeBillingTabIndex, billingDefaultPath } from "./constants/billingNav";

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
 */
const BillingLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Tabs an admin has blocked disappear entirely rather than rendering a dead end.
  const tabs = useMemo(() => BILLING_TABS.filter((t) => !isSectionBlocked(t.accessKey)), []);

  const activeIndex = activeBillingTabIndex(location.pathname, tabs);

  const tabItems: TabItem[] = tabs.map((tab) => ({
    title: tab.title,
    icon: tab.icon,
    component: <Outlet />,
  }));

  // Bare /billing, or a tab the user can't see → send them to their first allowed tab.
  if (activeIndex === -1) {
    return <Navigate to={billingDefaultPath((key) => !isSectionBlocked(key))} replace />;
  }

  const activeTitle = tabs[activeIndex]?.title ?? "Billing";

  return (
    <>
      {/* Breadcrumb: Billing → <tab>, matching every other module's header. */}
      <PageTitle breadcrumbs={[{ title: "Billing", path: BILLING_BASE, isActive: false, isSeparator: false }]}>
        {activeTitle}
      </PageTitle>

      <MaterialHeaderTab
        tabItems={tabItems}
        activeTab={activeIndex}
        onTabChange={(index) => navigate(`${BILLING_BASE}/${tabs[index].path}`)}
        hideScrollButtons
      />
    </>
  );
};

export default BillingLayout;
