import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons } from "@metronic/assets/sidepanelicons";
import { useState } from "react";
import LeadsConfigurationMain from "./configuration/LeadsConfigurationMain";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { useEffect } from "react";
import { PageTitle } from "@metronic/layout/core";
import LeadNewLead from "./lead/LeadNewLead";
import LeadsOverviewMain from "./overview/LeadsOverviewMain";
import { getAllLeads } from "@services/leads";

const LeadsMain = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [rawLeadsData, setRawLeadsData] = useState<any>([]);
  

  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    async function fetchLeadData(){
      const { data: { data: { leads } } } = await getAllLeads();
              // console.log("AllLeadsData:: ",leads);
              setRawLeadsData(leads);
    }
    fetchLeadData();
  }, [])
  

  useEffect(() => {
    // Initialize chart settings when app loads
    dispatch(initializeChartSettings());
  }, [dispatch]);

  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <LeadsOverviewMain />,
      icon:
        activeTab === 0
          ? leadsIcons.leadsOverviewIcon.active
          : leadsIcons.leadsOverviewIcon.default,
    },
    {
      title: "Leads",
      component: <LeadNewLead />,
      icon:
        activeTab === 1
          ? leadsIcons.leadsIcon.active
          : leadsIcons.leadsIcon.default,
    },
    {
      title: "Configure",
      component: <LeadsConfigurationMain />,
      icon:
        activeTab === 2
          ? leadsIcons.leadsConfigIcon.active
          : leadsIcons.leadsConfigIcon.default,
    },
  ];
  const LeadBreadcrumbs = [
    {
      title: 'lead',
      path: '/lead',
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
    <div >
      <PageTitle breadcrumbs={LeadBreadcrumbs}>
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

export default LeadsMain;
