import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons, projectOverviewIcons, calenderIcons, worldIcons } from "@metronic/assets/sidepanelicons";
import { useState, useEffect } from "react";
import ContactOverview from "./components/ContactOverview";
import ContactLeadsOverview from "./components/ContactLeadsOverview";
import ContactProject from "./components/ContactProject";
import ContactConfigMain from "./config/ContactConfigMain";
import { useParams } from "react-router-dom";
import { getAllClientContacts, getClientContactById } from "@services/companies";
import { PageTitle } from "@metronic/layout/core";
import Loader from "@app/modules/common/utils/Loader";
import ClientContactsMain from "./ClientContactsMain";
import CalenderMain from "../calender/CalenderMain";
import Maps from "../companyOverview/components/Map";

const ContactsNavbar = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number, id?: string}[]>([]);
  const [contactData, setContactData] = useState<any>([]);

  const { contactId } = useParams<{ contactId: string }>();

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
    getAllClientContacts().then((res) => {
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
      component:<ClientContactsMain/>,
      icon:
        activeTab === 0
          ? leadsIcons.leadsOverviewIcon.active
            : leadsIcons.leadsOverviewIcon.default,
    },
    {
      title: "Calendar",
      component: <CalenderMain />,
      icon:
        activeTab === 1
          ? calenderIcons.calenderIcon.active
          : calenderIcons.calenderIcon.default,
    },
    {
      title: "World",
      component: <Maps points={coordinates} contactData={contactData} />,
      icon:
        activeTab === 2
          ? worldIcons.worldIcon.active
          : worldIcons.worldIcon.default,
    },
    {
      title: "Configure",
      component: <ContactConfigMain />,
      icon:
        activeTab === 3
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
