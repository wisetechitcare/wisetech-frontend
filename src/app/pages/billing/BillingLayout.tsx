import React, { useMemo } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import { PageTabs, type PageTabItem } from "@/ds/patterns/page-tabs";
import ModuleOrgFilter from "@app/modules/common/components/ModuleOrgFilter";
import { useOrgScope, toCompanyIdParam } from "@/hooks/useOrgScope";
import { BILLING_BASE, BILLING_TABS, activeBillingTabIndex, billingDefaultPath, canOpenBillingTab } from "./constants/billingNav";

/**
 * Billing module shell — sidebar → Billing → kit PageTabs → page.
 *
 * ROUTE-DRIVEN, not state-driven: every tab is a real route, so a Billing page can be
 * linked to, bookmarked and back-buttoned. The tab bar only moves the URL; `<Outlet />`
 * renders the matched child once under the bar (same pattern as the old MaterialHeaderTab
 * host, without mounting an outlet per tab).
 *
 * The organization filter lives HERE, in the tab bar, as it does on Recruitment: one control
 * for the whole module. Pages read it with `useBillingOrgId()`.
 *
 * `PageTitle` stays — it is the app-wide breadcrumb context (same as Reimbursement / Org Profile),
 * not a Metronic visual chrome.
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

  // Bare /billing, or a tab the user can't see → send them to their first allowed tab.
  if (activeIndex === -1) {
    return <Navigate to={billingDefaultPath(canOpenBillingTab)} replace />;
  }

  const activeTitle = tabs[activeIndex]?.title ?? "Billing";
  const activePath = tabs[activeIndex]?.path;
  const scoped = !UNSCOPED_PATHS.has(activePath);

  const pageTabs: PageTabItem[] = tabs.map((tab) => ({
    value: tab.path,
    label: tab.title,
    icon: tab.icon,
  }));

  return (
    <>
      {/* Breadcrumb: Billing → <tab>, matching every other module's header. */}
      <PageTitle breadcrumbs={[{ title: "Billing", path: BILLING_BASE, isActive: false, isSeparator: false }]}>
        {activeTitle}
      </PageTitle>

      <PageTabs
        className="min-[992px]:[--page-tabs-offset:74px]"
        items={pageTabs}
        value={activePath}
        onValueChange={(path) => navigate(`${BILLING_BASE}/${path}`)}
        headerAction={
          scoped ? (
            <ModuleOrgFilter scopeId={scopeId} setScopeId={setScopeId} selectOptions={selectOptions} hasChoice={hasChoice} />
          ) : undefined
        }
      />

      {/* Same gutter PageTabs uses when it hosts `content` panels. */}
      <div className="px-3 pt-3 sm:px-5 sm:pt-7 lg:px-9">
        <Outlet context={outletContext} />
      </div>
    </>
  );
};

export default BillingLayout;
