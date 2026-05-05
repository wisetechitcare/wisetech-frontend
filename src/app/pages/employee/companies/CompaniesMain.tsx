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
import { initializeChartSettings, selectIsInitialized } from "@redux/slices/leadProjectCompanies";
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
      const companies = res?.data?.companies || [];
      setCompanyData(companies);
      
      const allCoordinates: any[] = [];
      const combinedData: any[] = [];
      
      companies.forEach((company: any) => {
        // 1. Root Company
        const companyLat = parseFloat(company.latitude);
        const companyLng = parseFloat(company.longitude);
        
        if (!isNaN(companyLat) && !isNaN(companyLng)) {
          allCoordinates.push({
            lat: companyLat,
            lng: companyLng,
            id: company.id,
            entityType: 'company'
          });
          combinedData.push({ ...company, type: 'company' });
        }
        
        // 2. Sub-Companies
        if (company.subCompanies && Array.isArray(company.subCompanies)) {
          company.subCompanies.forEach((sub: any) => {
            const subLat = parseFloat(sub.latitude);
            const subLng = parseFloat(sub.longitude);
            
            if (!isNaN(subLat) && !isNaN(subLng)) {
              allCoordinates.push({
                lat: subLat,
                lng: subLng,
                id: sub.id,
                entityType: 'sub-company'
              });
              // Inject parent company data for map visualization
              combinedData.push({ 
                ...sub, 
                type: 'sub-company',
                mainCompany: {
                  companyName: company.companyName,
                  latitude: company.latitude,
                  longitude: company.longitude
                }
              });
            }
          });
        }
        
        // 3. Branches
        if (company.branches && Array.isArray(company.branches)) {
          company.branches.forEach((branch: any) => {
            const branchLat = parseFloat(branch.latitude);
            const branchLng = parseFloat(branch.longitude);
            
            if (!isNaN(branchLat) && !isNaN(branchLng)) {
              allCoordinates.push({
                lat: branchLat,
                lng: branchLng,
                id: branch.id,
                entityType: 'branch'
              });
              // Inject parent company data for map visualization
              combinedData.push({ 
                ...branch, 
                type: 'branch',
                company: {
                  companyName: company.companyName,
                  latitude: company.latitude,
                  longitude: company.longitude
                }
              });
            }
          });
        }
      });
      
      setCoordinates(allCoordinates);
      setCompanyData(combinedData);
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
      title: "Map",
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
      title: 'Companies',
      path: '/companies',
      isSeparator: false,
      isActive: false,
    },
    {
      title: '',
      path: '',
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
