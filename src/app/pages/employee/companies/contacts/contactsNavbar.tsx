import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons, projectOverviewIcons, calenderIcons, worldIcons } from "@metronic/assets/sidepanelicons";
import { useEffect } from "react";
import ContactOverview from "./components/ContactOverview";
import ContactLeadsOverview from "./components/ContactLeadsOverview";
import ContactProject from "./components/ContactProject";
import ContactConfigMain from "./config/ContactConfigMain";
import { useParams, useSearchParams } from "react-router-dom";
import { getAllClientContacts, getClientContactById } from "@services/companies";
import { PageTitle } from "@metronic/layout/core";
import Loader from "@app/modules/common/utils/Loader";
import ClientContactsMain from "./ClientContactsMain";
import ContactsOverview from "./components/ContactsOverview";
import CalenderMain from "../calender/CalenderMain";
import Maps from "../companyOverview/components/Map";
import { useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";

const TAB_KEYS = ["overview", "contacts", "calendar", "map", "configure"] as const;

const ContactsNavbar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get("tab") || "overview";
  const activeTab = Math.max(0, TAB_KEYS.indexOf(tabKey as any));
  const setActiveTab = (index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] ?? "overview" }, { replace: true });
  };
  const dispatch = useDispatch<AppDispatch>();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number, id?: string}[]>([]);
  const [contactData, setContactData] = useState<any>([]);

  const { contactId } = useParams<{ contactId: string }>();

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    if (contactId) {
      setLoading(true);
      getClientContactById(contactId)
        .then((response) => {
          setContact(response?.data?.contact);
        })
        .catch((error) => {
          console.error("Error loading contact:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [contactId]);

  useEffect(() => {
    getAllClientContacts({}, true).then((res) => {
      setContactData(res?.data?.contacts);
      const allCoordinates = res?.data?.contacts
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
      component: <ContactsOverview />,
      icon:
        activeTab === 0
          ? leadsIcons.leadsOverviewIcon.active
            : leadsIcons.leadsOverviewIcon.default,
    },
    {
      title: "Contacts",
      component: <ClientContactsMain />,
      icon:
        activeTab === 1
          ? projectsIcons.projectsIcon.active
          : projectsIcons.projectsIcon.default,
    },
    {
      title: "Calendar",
      component: <CalenderMain />,
      icon:
        activeTab === 2
          ? calenderIcons.calenderIcon.active
          : calenderIcons.calenderIcon.default,
    },
    {
      title: "Map",
      component: <Maps points={coordinates} contactData={contactData} />,
      icon:
        activeTab === 3
          ? worldIcons.worldIcon.active
          : worldIcons.worldIcon.default,
    },
    {
      title: "Configure",
      component: <ContactConfigMain />,
      icon:
        activeTab === 4
          ? leadsIcons.leadsConfigIcon.active
          : leadsIcons.leadsConfigIcon.default,
    },
  ];


  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <PageTitle breadcrumbs={[]}>
        {contact?.fullName || 'Contact'}
      </PageTitle>
      <MaterialHeaderTab
        tabItems={tabItems}
        onTabChange={setActiveTab}
        activeTab={activeTab}
      />
    </div>
  );
};

export default ContactsNavbar;
