import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getClientContactById } from "@services/companies";
import { useEventBus } from "@hooks/useEventBus";
import ContactOverview from "./ContactOverview";
import ContactProject from "./ContactProject";
import ClientContactsForm from "./ClientContactsForm";
import ContactLeadReferenceTab from "./ContactLeadReferenceTab";
import ContactHeader from "./ContactHeader";
import CompanyReferences from "../../companies/components/CompanyReferences";
import MeetingsList from "@app/modules/common/components/MeetingsList";
import { UnderlineTabs } from "@app/modules/common/components/ui";

type TabType = "overview" | "lead-reference" | "company-references" | "projects" | "meetings";

const ContactMainToggle = () => {
  const { contactId } = useParams<{ contactId: string }>();
  // console.log("idd", contactId);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabType) || "overview";
  const setActiveTab = (tab: TabType) => setSearchParams({ tab }, { replace: true });
  const [contact, setContact] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [show, setShow] = useState(false);

  const fetchCompanyDetails = async () => {
    if (!contactId) return;

    setIsLoading(true);
    try {
      const response = await getClientContactById(contactId);
      setContact(response?.data?.contact || null);
    } catch (error) {
      console.error("Failed to fetch company details", error);
      setContact(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [contactId]);
  useEventBus("companyCreated", () => fetchCompanyDetails());
  // The edit modal saves and emits this; without it the page (and the modal's
  // `initialData`) keeps showing the pre-save contact — a saved birth date /
  // anniversary looked like it never saved, and a cleared one came back.
  useEventBus("clientContactUpdated", () => fetchCompanyDetails());

  const handleBackClick = () => {
    navigate(-1);
  };

  const tabs: Array<{ key: TabType; label: string; icon: string }> = [
    { key: "overview", label: "Overview", icon: "bi bi-person-lines-fill" },
    { key: "lead-reference", label: "Lead Reference", icon: "bi bi-signpost-split" },
    { key: "company-references", label: "Company References", icon: "bi bi-buildings" },
    { key: "projects", label: "Projects", icon: "bi bi-kanban" },
    { key: "meetings", label: "Meetings", icon: "bi bi-camera-video" },
  ];

  const renderTabContent = () => {
    if (!contactId) return null;

    switch (activeTab) {
      case "overview":
        return <ContactOverview contact={contact} />;
      case "lead-reference":
        return <ContactLeadReferenceTab referrals={contact?.referrals} />;
      case "company-references":
        // Companies this contact referred (it is the external referrer).
        return <CompanyReferences referredCompanies={contact?.companyReferences} />;
      case "projects":
        return <ContactProject contact={contact}/>;
      case "meetings":
        // Meetings where this contact is an external participant.
        return <MeetingsList mode="contact" targetId={contactId} />;
      default:
        return <ContactOverview contact={contact} />;
    }
  };

  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-2 p-md-4">
        <div className="alert alert-warning">
          Company not found or failed to load.
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 p-md-4">
      <ContactHeader
        contact={contact}
        onBack={handleBackClick}
        onEdit={() => setShow(true)}
        onScheduleMeeting={() => setActiveTab("meetings")}
      />

      <UnderlineTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="Contact sections"
      />

      <div className="tab-content">{renderTabContent()}</div>

      {/* Contact Form */}
      <ClientContactsForm 
      show={show}
      onClose={() => setShow(false)}
      contactId={contact?.id}
      initialData={contact}
      key="edit"
      />
    </div>
  );
};

export default ContactMainToggle;
