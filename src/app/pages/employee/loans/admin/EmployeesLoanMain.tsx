import React, { useState } from "react";
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

const EmployeesLoanMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <Overview />,
    },
    {
      title: "Installments",
      component: <Installments />,
    },
    {
      title: "Search Employees",
      component: <SearchEmployee />,
    },
    {
      title: "Rules And FAQs",
      component: <Information />,
    }
  ];

  const loanBreadcrumbs: PageLink[] = [
    { title: "Home", path: "/finance/loans", isSeparator: false, isActive: false },
    { title: "Finance", path: "", isSeparator: true, isActive: false },
  ];

  return (
    <>
      <PageTitle breadcrumbs={loanBreadcrumbs}>Loans</PageTitle>
      <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
    </>
  );
};

export default EmployeesLoanMain;
