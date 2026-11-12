import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTabRoute } from "@app/hooks/useTabRoute";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { useSelector } from "react-redux";
import { PageTabs, type PageTabItem } from "@/ds/patterns/page-tabs";
import type { IconSource } from "@/ds/ui/dynamic-icon";
import { tabSlug } from "@utils/sectionTabs";
import type { RootState } from "@redux/store";
import Reimbursement from "./Reimbursement";
import AllEmployee from "./views/admin/AllEmployee";
import SearchEmployee from "./views/admin/SearchEmployee";
import PaymentTab from "./views/admin/PaymentTab";
import { useDispatch } from "react-redux";
import ReimbursementConfiguration from "./views/admin/ReimbursementConfiguration";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { hasPermission } from "@utils/authAbac";
import { canSection, isTabTurnedOff } from "@utils/can";
import { fetchReimbursementPaymentQueueCount } from "@services/employee";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { SensitiveProvider, SensitiveToggle } from "@/ds/patterns/sensitive";
import { ReceiptText, Clipboard, Search, CreditCard, Settings } from 'lucide-react';

/**
 * Tabs whose figures are wired for the eye — both render ReimbursementWorkspace, which
 * carries the `sensitive-data-*` class on every amount. The remaining tabs are left
 * exactly as they are: blurring a figure on a tab with no switch would hide it with no
 * way to read it back.
 */
const EYE_TABS = ["My Reimbursements", "Search Employee"];

const ACCESS_SECTION = "finance.reimbursements";


function AdminAndEmployeeReimbursementViewer() {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(()=>{
    dispatch(fetchRolesAndPermissions() as any);
  },[])

  useEffect(() => {
    if ((location.state as any)?.goToSearchEmployee) {
      const idx = tabItems.findIndex(t => t.title === "Search Employee");
      if (idx !== -1) setActiveTab(idx);
    }
  }, [location.state]);

  // Badge counts. PageTabs supports `badge`; the legacy tab bar did too, and no reimbursement tab
  // passed one, so the number of payouts waiting on you was invisible until you opened the tab.
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);

  const loadBadgeCounts = useCallback(async () => {
    if (!canSection('finance.reimbursements', 'write')) return;
    try {
      // Server COUNT — same eligibility as the Payment queue, without downloading every batch.
      const res = await fetchReimbursementPaymentQueueCount();
      setPendingPaymentCount(Number(res?.data?.count ?? res?.count ?? 0));
    } catch {
      setPendingPaymentCount(0);   // a badge is a hint; failing to load one must not break the page
    }
  }, []);

  useEffect(() => { loadBadgeCounts(); }, [loadBadgeCounts]);
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { loadBadgeCounts(); });

  // Tabs turned off for this person (Access > Advanced), and Configure without Write on the section.
  // Subscribed so a live access change re-renders the bar.
  useSelector((s: RootState) => (s as any).authz?.deniedTabs);
  useSelector((s: RootState) => (s as any).authz?.access);
  const tabHidden = (title: string) => {
    const slug = tabSlug(title);
    return isTabTurnedOff(ACCESS_SECTION, slug) || (slug === "configure" && !canSection(ACCESS_SECTION, "write"));
  };

  type Tab = { title: string; component: React.ReactNode; icon: IconSource; badge?: number };
  const tabItems: Tab[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Reimbursements",
      component: <Reimbursement />,
      icon: ReceiptText,
    }]:[]),
    // Charts, then the employee table, then the per-project rollup — all three read one
    // period-scoped fetch. "By Project" used to be a separate tab over the same data.
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Reimbursement Details",
      component: <AllEmployee />,
      // Not ReceiptText — that is the glyph My Reimbursements already uses.
      icon: Clipboard,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Search Employee",
      component: <SearchEmployee />,
      icon: Search,
    }]:[]),
    // Payment and Configure are WRITE surfaces — recording payouts, and rewriting expense
    // categories and per-employee spending limits. All five tabs used to gate on `readOthers`
    // (`finance.view.team`), so anyone who could view the team could also pay and reconfigure.
    // These two now require an explicit finance write grant.
    ...(canSection('finance.reimbursements', 'write') ? [{
      title: "Payment",
      component: <PaymentTab />,
      icon: CreditCard,
      badge: pendingPaymentCount,
    }]:[]),
    ...(canSection('finance.reimbursements', 'write') ? [{
      title: "Configure",
      component: <ReimbursementConfiguration />,
      icon: Settings,
    }]:[]),
  ];

  // The tab is the URL (/finance/reimbursements/payment), so it survives a refresh, a
  // shared link, and the remount the header does at the mobile breakpoint. Derived from
  // the titles, so a tab hidden by permissions can't shift the others.
  const { activeTab, setActiveTab } = useTabRoute(
    "/finance/reimbursements",
    tabItems.map((t) => t.title),
  );

  const ReimbursementWizardBreadcrumb: Array<PageLink> = [
    {
      title: "Finance",
      path: "/finance/reimbursements",
      isSeparator: false,
      isActive: false,
    },
    {
      title: "Reimbursement",
      path: "",
      isSeparator: true,
      isActive: false,
    },
  ];

  const pageTabs: PageTabItem[] = tabItems.map((t) => ({
    value: t.title,
    label: t.title,
    icon: t.icon,
    badge: t.badge,
    content: t.component,
    hidden: tabHidden(t.title),
  }));
  const hasEye = EYE_TABS.includes(tabItems[activeTab]?.title ?? "");

  return (
    <>
      <PageTitle breadcrumbs={ReimbursementWizardBreadcrumb}>
        Reimbursements
      </PageTitle>
      
      {/* Above the tabs, so the eye in the sticky bar governs every figure below it. The
          workspace has a provider of its own; a nested one defers to this, so there is one
          switch and it keeps its state while you move between the two tabs that offer it. */}
      <SensitiveProvider disabled={!hasEye}>
        <PageTabs
          // The masthead is fixed from 992px up and 74px tall; below that it scrolls away.
          className="min-[992px]:[--page-tabs-offset:74px]"
          items={pageTabs}
          value={tabItems[activeTab]?.title}
          onValueChange={(title) => {
            const idx = tabItems.findIndex((t) => t.title === title);
            if (idx >= 0) setActiveTab(idx);
          }}
          headerAction={hasEye ? <SensitiveToggle variant="onPrimary" /> : undefined}
        />
      </SensitiveProvider>
    </>
  );
}

export default AdminAndEmployeeReimbursementViewer;
