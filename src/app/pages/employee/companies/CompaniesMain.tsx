import MaterialHeaderTab, {TabItem} from "@app/modules/common/components/MaterialHeaderTab";
import { calenderIcons, leadsIcons, reimbursementsIcons, worldIcons } from "@metronic/assets/sidepanelicons";
import { useState } from "react";
import CompanyConfigMain from "./companyConfig/CompanyConfigMain";
import CompanyOverview from "./companyOverview/CompanyOverview";
import { companiesIcons } from "@metronic/assets/sidepanelicons";
import ClientCompaniesMain from "./companies/ClientCompaniesMain";
import ClientContactsMain from "./contacts/ClientContactsMain";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@redux/store";
import {
  initializeChartSettings,
  selectIsInitialized,
} from "@redux/slices/leadProjectCompanies";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { useEffect } from "react";
import { PageTitle } from "@metronic/layout/core";
import CalenderMain from "./calender/CalenderMain";
import Maps from "./companyOverview/components/Map";
import { getAllClientCompanies } from "@services/companies";

const CompaniesMain = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number, id?: string}[]>([]);
  const [companyData, setCompanyData] = useState<any>([]);

  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
    dispatch(initializeChartSettings());
  }, [dispatch]);

  useEffect(() => {
    getAllClientCompanies().then((res) => {
      setCompanyData(res?.data?.companies);
      const allCoordinates = res?.data?.companies
        ?.filter((item: any) => item.latitude && item.longitude)
        ?.map((item: any) => ({
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude),
          id: item.id
        })) || [];
      setCoordinates(allCoordinates);
    });
  }, []);

  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <CompanyOverview />,
      icon:
        activeTab === 0
          ? leadsIcons.leadsOverviewIcon.active
          : leadsIcons.leadsOverviewIcon.default,
    },
    {
      title: "Companies",
      component: <ClientCompaniesMain />,
      icon:
        activeTab === 1
          ? companiesIcons.companiesIcon.active
          : companiesIcons.companiesIcon.default,
    },
    {
      title: "World",
      component: <Maps points={coordinates} companyData={companyData} />,
      icon:
        activeTab === 2
          ? worldIcons.worldIcon.active
          : worldIcons.worldIcon.default,
    },
    {
      title: "Configure",
      component: <CompanyConfigMain />,
      icon:
        activeTab === 3
          ? leadsIcons.leadsConfigIcon.active
          : leadsIcons.leadsConfigIcon.default,
    },
  ];
  const ProjectBreadcrumbs = [
    {
      title: "Companies",
      path: "/companies",
      isSeparator: false,
      isActive: false,
    },
    {
      title: "",
      path: "",
      isSeparator: true,
      isActive: false,
    },
  ];
  return (
    <div>
      <PageTitle breadcrumbs={ProjectBreadcrumbs}>
        {tabItems[activeTab].title}
      </PageTitle>
      <MaterialHeaderTab
        tabItems={tabItems}
        onTabChange={setActiveTab}
        activeTab={activeTab}
      />
    </div>
  );
};

export default CompaniesMain;
