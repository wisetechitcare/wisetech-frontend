import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { getClientContactById } from "@services/companies";
import { miscellaneousIcons } from "@metronic/assets/miscellaneousicons";
import { useEventBus } from "@hooks/useEventBus";
import ContactLeadsOverview from "./ContactLeadsOverview";
import ContactOverview from "./ContactOverview";
import ContactProject from "./ContactProject";
import ClientContactsForm from "./ClientContactsForm";

type TabType = "overview" | "leads" | "projects";

const ContactMainToggle = () => {
  const { contactId } = useParams<{ contactId: string }>();
  // console.log("idd", contactId);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
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

  const handleBackClick = () => {
    navigate(-1);
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "leads", label: "Leads" },
    { key: "projects", label: "Projects" },
  ];

  const renderTabContent = () => {
    if (!contactId) return null;

    switch (activeTab) {
      case "overview":
        return <ContactOverview contact={contact} />;
      case "leads":
        return <ContactLeadsOverview contact={contact}/>
      case "projects":
        return <ContactProject contact={contact}/>;
      default:
        return <ContactOverview contact={contact} />;
    }
  };

  // Get current tab label for mobile dropdown
  const currentTabLabel =
    tabs.find((tab) => tab.key === activeTab)?.label || "Overview";

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
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4 pt-md-0">
        <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
          <button
            className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
            onClick={handleBackClick}
          >
            {/* <img
              src={miscellaneousIcons.leftArrow}
              alt=""
              style={{
                width: "24px",
                height: "24px",
                cursor: "pointer",
              }}
              className="d-block d-md-none"
            /> */}
            <img
              src={miscellaneousIcons.leftArrow}
              alt=""
              style={{
                width: "36px",
                height: "36px",
                cursor: "pointer",
              }}
              className="d-none d-md-block"
            />
          </button>
          <div className="flex-grow-1">
            <div className="text-muted small">Contact #{contact.id}</div>
            <div className="d-flex align-items-center gap-2">
              <h2
                className="mb-0 text-truncate"
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "600",
                  fontSize: "24px",
                }}
              >
                {contact.fullName}
              </h2>
            </div>
          </div>
        </div>
        {/* <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <img
            src={contact.profilePhoto}
            alt={contact.fullName}
            style={{
              width: "100px",
              height: "100px",
              cursor: "pointer",
              objectFit: "cover", // ensures image fills circle
              borderRadius: "50%", // makes it circular
            }}
            className="d-none d-md-block"
          />
        </div> */}
        <div className="d-flex align-items-center gap-2">
          {/* Edit Button show only for tab overview */}
          {activeTab === "overview" && (
            <>
              <Button
                variant="primary"
                onClick={() => setShow(true)}
                style={{
                  fontFamily: "Inter",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Edit Details
              </Button>

              {/* <Button
                variant="primary"
                // onClick={handleEditClick}
                style={{
                  fontFamily: "Inter",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Transfer Company
              </Button>

              <Button
                variant="primary"
                // onClick={handleEditClick}
                style={{
                  fontFamily: "Inter",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Share
              </Button> */}
            </>
          )}
        </div>
      </div>

      {/* Mobile Header Update */}
      <style jsx>{`
        @media (max-width: 767px) {
          .mobile-header h2 {
            font-size: 18px !important;
          }
          .mobile-header .text-muted {
            font-size: 12px !important;
          }
        }

        @media (min-width: 768px) {
          .desktop-header h2 {
            font-size: 24px !important;
          }
        }
      `}</style>

      {/* Navigation Tabs + Buttons Row */}
      {/* Mobile Tab Dropdown + Actions Dropdown */}
      <div className="mb-4 mb-md-8 pt-3">
        {/* Mobile Tab Dropdown */}
        <div className="d-block d-md-none mb-3">
          <div className="d-flex justify-content-between align-items-center gap-2">
            <div className="dropdown flex-grow-1">
              <div
                className="dropdown-toggle ps-4 text-start"
                data-bs-toggle="dropdown"
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "500",
                  fontSize: "14px",
                  borderColor: "#7A2124",
                  color: "#7A2124",
                }}
              >
              {currentTabLabel}
            </div>
            <ul className="dropdown-menu">
              {tabs.map((tab) => (
                <li key={tab.key}>
                  <button
                    className={`dropdown-item ${
                      activeTab === tab.key ? "active" : ""
                    }`}
                    onClick={() => setActiveTab(tab.key as TabType)}
                    style={{
                      fontFamily: "Inter",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile Action Buttons inside dropdown */}
          {activeTab === "overview" && (
            <div className="dropdown">
              <button
                className="btn btn-sm btn-primary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Actions
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button className="dropdown-item" 
                  onClick={() => setShow(true)}
                  >Edit Details</button>
                </li>
                {/* <li>
                  <button className="dropdown-item">Transfer Company</button>
                </li>
                <li>
                  <button className="dropdown-item">Share</button>
                </li> */}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="d-none d-md-flex justify-content-between align-items-center">
        {/* Tabs */}
        <ul className="nav nav-tabs nav-line-tabs nav-line-tabs-2x fs-4 fw-bold mb-0">
          {tabs.map((tab) => (
            <li className="nav-item" key={tab.key}>
              <button
                className={`nav-link text-active-primary  ${
                  activeTab === tab.key ? "active" : ""
                }`}
                onClick={() => setActiveTab(tab.key as TabType)}
                style={{
                  border: "1px solid #7A2124",
                  color: "black",
                  borderRadius: "20px",
                  fontFamily: "Barlow",
                  fontWeight: "500",
                  fontSize: "14px",
                  padding: "8px 20px",
                  marginRight: "0px",
                }}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Desktop Action Buttons */}
        
      </div>
       </div>
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
