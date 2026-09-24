import React from "react";
import { useSelector } from "react-redux";

import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { reimbursementsIcons } from "@metronic/assets/sidepanelicons";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { RootState } from "@redux/store";
import Overview from "./views/Overview";
import SearchEmployee from "./views/SearchEmployee";
import Installments from "./views/Installments";
import InstallmentsAdmin from "../admin/views/Installments"
import Information from "../personal/Information";
import { useTabRoute } from "@app/hooks/useTabRoute";

const EmployeesLoanMain: React.FC = () => {
  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <Overview />,
      icon: 'bi-grid-1x2',
    },
    {
      title: "Installments",
      component: <Installments />,
      icon: 'bi-calendar-week',
    },
    {
      title: "Search Employees",
      component: <SearchEmployee />,
      icon: 'bi-search',
    },
    {
      title: "Rules And FAQs",
      component: <Information />,
      icon: 'bi-journal-text',
    }
  ];

  // The tab is the URL (/finance/loans/installments), so it survives a refresh, a shared
  // link, and the remount the header does at the mobile breakpoint.
  const { activeTab, setActiveTab } = useTabRoute("/finance/loans", tabItems.map((t) => t.title));

  const loanBreadcrumbs: PageLink[] = [
    { title: "Home", path: "/finance/loans", isSeparator: false, isActive: false },
    { title: "Finance", path: "", isSeparator: true, isActive: false },
  ];

  return (
    <>
      <PageTitle breadcrumbs={loanBreadcrumbs}>Loans</PageTitle>
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
};

export default EmployeesLoanMain;
