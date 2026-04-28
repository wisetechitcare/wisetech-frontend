import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import { getClientCompanyById } from "@services/companies";
import Overview from "./CompanyOverview";
import NewCompanyForm from "./NewCompanyForm";
import { miscellaneousIcons } from "@metronic/assets/miscellaneousicons";
import { Company } from "@models/companies";
import { useEventBus } from "@hooks/useEventBus";
import CompaniesBranchForm from "./CompaniesBranch";
import ClientContacts from "./ClientContacts";
import ClientContactsForm from "../../contacts/components/ClientContactsForm";
import CompaniesRating from "./CompaniesRating";
import CompaniesProject from "./CompaniesProject";
import CompaniesLeads from "./CompaniesLeads";
import BlankBasicProjectForm from "@pages/employee/projects/overview/components/BlankBasicProjectForm";
import ChooseProjectTypeModal from "@pages/employee/projects/overview/components/chooseProjectTypeModal";
import { open } from "fs";
import DetailsModal from "@pages/employee/leads/lead/DetailsModal";
import { leadAndProjectTemplateTypeId } from "@constants/statistics";
import Loader from "@app/modules/common/utils/Loader";
import { getRatingByCompanyId } from "@services/projects";
import SubCompanies from "./SubCompanies";


type TabType =
  | "overview"
  | "leads"
  | "projects"
  | "contacts"
  | "subcompanies"
  | "branches"
  | "rating";

const CompanyDetails = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [rating, setRating] = useState<number>();
  const [companyRatings, setCompanyRatings] = useState<any>();

  const handleNewCompanyClick = () => {
    setShowNewCompanyModal(true);
  };

  const handleCloseNewCompanyModal = () => {
    setShowNewCompanyModal(false);
  };

  const fetchCompanyDetails = async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const response = await getClientCompanyById(companyId);
      setCompany(response?.data?.company || null);
      setCompanyRatings(response?.data?.company?.overallRating);
    } catch (error) {
      console.error("Failed to fetch company details", error);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  // const fetchRating = async () => {
  //   if (!companyId) return;
  //   try {
  //     const response = await getRatingByCompanyId(companyId);
  //     setCompanyRatings(response?.data?.rating || null);
  //     console.log("companyRatings", companyRatings);
  //   } catch (error) {
  //     console.error("Failed to fetch rating", error);
  //   }
  // };

  // useEffect(() => {
  //   fetchRating();
  // }, [companyId]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [companyId]);
  useEventBus("companyCreated", () => fetchCompanyDetails());

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleEditClick = () => {
    setShowEditCompanyModal(true);
  };

  const handleCloseEditCompanyModal = () => {
    setShowEditCompanyModal(false);
  };

  const handleNewContactClick = () => {
    setShowNewContactModal(true);
  };

  const handleCloseNewContactModal = () => {
    setShowNewContactModal(false);
  };

  const handleNewProjectClick = () => {
    setShowNewProjectModal(true);
  };

  const handleCloseNewProjectModal = () => {
    setShowNewProjectModal(false);
  };

  const handleNewLeadClick = () => {
    setShowNewLeadModal(true);
  };

  const handleCloseModal = () => {
    setShowNewLeadModal(false);
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "leads", label: "Leads" },
    { key: "projects", label: "Projects" },
    { key: "contacts", label: "Contacts" },
    { key: "subcompanies", label: "Subcompanies" },
    { key: "branches", label: "Branches" },
    { key: "rating", label: "Rating" },
  ];

  const templateDataForLeads = [
    {
      id: leadAndProjectTemplateTypeId.newLead,
      title: 'Blank Lead',
      description: ""
    },
    {
      id: leadAndProjectTemplateTypeId.mep,
      title: 'MEP Lead',
      description: 'Template',
    },
    {
      id: leadAndProjectTemplateTypeId.webDev,
      title: 'Web Development Template Lead',
      description: 'Template',
    }
  ];

  const renderTabContent = () => {
    if (!company) return null;

    switch (activeTab) {
      case "overview":
        return <Overview company={company} />;
      case "leads":
        return <CompaniesLeads companyId={company.id} />;
      case "projects":
        return <CompaniesProject companyId={company.id} />;
      case "contacts":
        return <ClientContacts companyId={company.id} />;
      case "branches":
        return <CompaniesBranchForm companyId={company.id} />;
      case "subcompanies":
        return <SubCompanies companyId={company.id} companyTypeId={company.companyTypeId} />;
      case "rating":
        return <CompaniesRating companyId={company.id} companyName={company.companyName} onRatingChange={setRating} toggleMounted={true} />
      default:
        return <Overview company={company} />;
    }
  };

  // Get current tab label for mobile dropdown
  const currentTabLabel = tabs.find(tab => tab.key === activeTab)?.label || "Overview";

  if (isLoading) {
    return <Loader/>
  }

  if (!company) {
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
      <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4 pt-3 pt-md-6">
        <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
          <button
            className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
            onClick={handleBackClick}
          >
            <img
              src={miscellaneousIcons.leftArrow}
              alt=""
              style={{
                width: "24px",
                height: "24px",
                cursor: "pointer"
              }}
              className="d-block d-md-none"
            />
            <img
              src={miscellaneousIcons.leftArrow}
              alt=""
              style={{
                width: "36px",
                height: "36px",
                cursor: "pointer"
              }}
              className="d-none d-md-block"
            />
          </button>
          <div className="flex-grow-1">
            <div className="text-muted small">Company #{company?.prefix || "N/A"}</div>
            <div className="d-flex align-items-center gap-2">
              <h2
                className="mb-0 text-truncate"
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                {company.companyName}
              </h2>
              <div className="d-flex align-items-center gap-1">
                <KTIcon iconName="star" className="fs-6 text-warning" />
                <span className="text-muted small">{ company?.overallRating || rating?.toFixed(1)  || companyRatings?.overallRating || 0}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <img
            src={company.logo}
            alt=""
            style={{
              width: "60px",
              height: "36px",
              cursor: "pointer",
              objectFit: "contain"
            }}
            className="d-block d-md-none"
          />
          <img
            src={company.logo}
            alt=""
            style={{
              width: "100px",
              height: "60px",
              cursor: "pointer",
              objectFit: "contain"
            }}
            className="d-none d-md-block"
          />
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
                      className={`dropdown-item ${activeTab === tab.key ? 'active' : ''}`}
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

            {/* Mobile Action Buttons */}
            <div className="d-flex align-items-center gap-1">
              <div className="dropdown">
                <Button
                  variant="primary"
                  size="sm"
                  className="dropdown-toggle"
                  data-bs-toggle="dropdown"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "600",
                    fontSize: "12px",
                  }}
                >
                  Add
                </Button>
                <ul className="dropdown-menu">
                  <li>
                    <a className="dropdown-item" href="#">
                      Add Lead
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      Add Project
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      Add Project
                    </a>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={handleNewContactClick}
                    >
                      Add Contact
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={handleNewCompanyClick}
                    >
                      New Company
                    </button>
                  </li>
                </ul>
              </div>
              {/* Edit Button show only for tab overview */}
              {activeTab === "overview" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEditClick}
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="d-none d-md-flex justify-content-between align-items-center">
          {/* Tabs */}
          <ul className="nav nav-tabs nav-line-tabs nav-line-tabs-2x fs-4 fw-bold mb-0">
            {tabs.map((tab) => (
              <li className="nav-item" key={tab.key}>
                {/* <button
                  className={`nav-link text-active-primary pb-4 ${
                    activeTab === tab.key ? "active" : ""
                  }`}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  style={{
                    border: "1px solid #7A2124",
                    color: "black",
                    borderRadius: "20px",
                    fontFamily: "Inter",
                    fontWeight: "500",
                    fontSize: "14px",
                    padding: "0px 15px",
                    marginRight: "10px",
                  }}
                > */}
                <a
                  className={`
                                  nav-link
                                  px-6 py-2
                                  rounded-pill
                                  border
                                  ${activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-black text-black'}
                                  hover:bg-gray-100
                                  transition
                                  me-0
                                  cursor-pointer
                                `}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  style={{ fontFamily: 'Inter, sans-serif', }}
                >
                  {tab.label}
                </a>

                {/* </button> */}
              </li>
            ))}
          </ul>

          {/* Desktop Action Buttons */}
          <div className="d-flex align-items-center gap-2">
            <div className="dropdown">
              <Button
                variant="primary"
                className="dropdown-toggle"
                data-bs-toggle="dropdown"
                style={{
                  fontFamily: "Inter",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Add New
              </Button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={handleNewLeadClick}
                  >
                    Add Lead
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={handleNewProjectClick}
                  >
                    Add Project
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={handleNewContactClick}
                  >
                    Add Contact
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={handleNewCompanyClick}
                  >
                    New Company
                  </button>
                </li>
              </ul>
            </div>
            {/* Edit Button show only for tab overview */}
            {activeTab === "overview" && (
              <Button
                variant="primary"
                onClick={handleEditClick}
                style={{
                  fontFamily: "Inter",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Edit Details
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">{renderTabContent()}</div>

      {/* New Company Modal */}
      <NewCompanyForm
        show={showNewCompanyModal}
        onClose={handleCloseNewCompanyModal}
      />
      {/* Edit Company Modal */}
      <NewCompanyForm
        show={showEditCompanyModal}
        onClose={handleCloseEditCompanyModal}
        editingCompanyId={company.id}
      />
      {/* New Contact Modal */}
      <ClientContactsForm
        show={showNewContactModal}
        onClose={handleCloseNewContactModal}
      />

      {/* New Project Modal */}
      <ChooseProjectTypeModal
        show={showNewProjectModal}
        onHide={() => setShowNewProjectModal(false)}
      />

      {/* Add New Lead */}
      <DetailsModal
        open={showNewLeadModal}
        onClose={handleCloseModal}
        Datas={templateDataForLeads}
      />
    </div>
  );
};

export default CompanyDetails;