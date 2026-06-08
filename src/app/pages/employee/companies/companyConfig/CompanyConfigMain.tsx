import { deleteCompanyType, getAllCompanyTypes, getAllRatingFactors, deleteRatingFactor, getAllCompanyServices, deleteCompanyService } from "@services/companies";
import { useEffect, useState } from "react";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import CompanyConfigForm from "./components/CompanyConfigForm";
import { Container } from "react-bootstrap";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { DropdownOption } from "../../../../../types/deleteConfirmation";
import LeadsProjectCompanyChartSettings from "@pages/company/settings/LeadsProjectCompanyChartSettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
// import { useContactConfig } from "@hooks/useContactConfig"; // Moved to ContactConfigMain


// Common button styles
const buttonStyles = {
  base: {
    border: "1px solid #9D4141",
    fontWeight: 500,
    color: "#9D4141",
    backgroundColor: "transparent",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    paddingLeft: "20px",
    paddingRight: "20px",
    height: "40px",
  },
  hover: {
    color: "white",
    backgroundColor: "#9D4141",
  },
};


const CompanyConfigMain = () => {
  // Contact-related config moved to ContactConfigMain component
  // Use the custom hook for contact-related config is now in ContactConfigMain
  // const {
  //   loading: contactConfigLoading,
  //   contactRoleTypes,
  //   contactStatuses,
  //   fetchContactRoleTypes,
  //   fetchContactStatuses,
  //   handleContactRoleTypeDelete,
  //   handleContactStatusDelete,
  //   contactRoleTypeDeleteConfirmation,
  // } = useContactConfig();

  const [loading, setLoading] = useState(true);
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompanyType, setEditingCompanyType] = useState<any | null>(null);
  // Contact-related state moved to useContactConfig hook
  // const [showCompanyRoleTypeModal, setShowCompanyRoleTypeModal] = useState(false);
  // const [editingCompanyRoleType, setEditingCompanyRoleType] = useState<any | null>(null);
  // const [showContactStatusModal, setShowContactStatusModal] = useState(false);
  // const [editingContactStatus, setEditingContactStatus] = useState<any | null>(null);
  const [ratingFactors, setRatingFactors] = useState<any[]>([]);
  const [showRatingFactorModal, setShowRatingFactorModal] = useState(false);
  const [editingRatingFactor, setEditingRatingFactor] = useState<any | null>(null);
  const [companyServices, setCompanyServices] = useState<any[]>([]);
  const [showCompanyServicesModal, setShowCompanyServicesModal] = useState(false);
  const [editingCompanyService, setEditingCompanyService] = useState<any | null>(null);

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCompanyType(null);
  };

  const handleModalOpen = () => {
    setShowModal(true);
  };

  // Contact-related handlers moved to useContactConfig hook
  // const handleReferralTypeModalOpen = () => {
  //   setShowCompanyRoleTypeModal(true);
  // };

  // const handleReferralTypeModalClose = () => {
  //   setShowCompanyRoleTypeModal(false);
  //   setEditingCompanyRoleType(null);
  // };

  const handleEdit = (companyType: any) => {
    setEditingCompanyType(companyType);
    setShowModal(true);
  };

  // const handleReferralTypeEdit = (contactRoleType: any) => {
  //   setEditingCompanyRoleType(contactRoleType);
  //   setShowCompanyRoleTypeModal(true);
  // };

  // const handleContactStatusEdit = (contactStatus: any) => {
  //   setEditingContactStatus(contactStatus);
  //   setShowContactStatusModal(true);
  // };

  // const handleContactStatusModalClose = () => {
  //   setShowContactStatusModal(false);
  //   setEditingContactStatus(null);
  // };

  // const handleContactStatusModalOpen = () => {
  //   setShowContactStatusModal(true);
  // };

  const handleRatingFactorEdit = (ratingFactor: any) => {
    setEditingRatingFactor(ratingFactor);
    setShowRatingFactorModal(true);
  };

  const handleRatingFactorModalClose = () => {
    setShowRatingFactorModal(false);
    setEditingRatingFactor(null);
  };

  const handleRatingFactorModalOpen = () => {
    setShowRatingFactorModal(true);
  };

  const handleCompanyServiceEdit = (companyService: any) => {
    setEditingCompanyService(companyService);
    setShowCompanyServicesModal(true);
  };

  const handleCompanyServiceModalClose = () => {
    setShowCompanyServicesModal(false);
    setEditingCompanyService(null);
  };

  const handleCompanyServiceModalOpen = () => {
    setShowCompanyServicesModal(true);
  };



  // fetch lead statuses
  const fetchCompanyTypes = async () => {
    try {
      const response = await getAllCompanyTypes();
      if (response && response.companyTypes) {
        const sorted = [...response.companyTypes].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setCompanyTypes(sorted);
      }
    } catch (error) {
      console.error("Error fetching lead statuses:", error);
    }
  };

  useEventBus(EVENT_KEYS.leadStatusCreated, () => {
    fetchCompanyTypes();
  });

  // Initial data loading
  const loadInitialData = async () => {
    try {
      await Promise.all([
        fetchCompanyTypes(),
        fetchRatingFactors(),
        fetchCompanyServices()
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // fetch rating factors
  const fetchRatingFactors = async () => {
    try {
      const response = await getAllRatingFactors();
      if (response && response.data?.ratingFactors) {
        const sorted = [...response.data.ratingFactors].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setRatingFactors(sorted);
      }
    } catch (error) {
      console.error("Error fetching rating factors:", error);
    }
  };

  useEventBus(EVENT_KEYS.ratingFactorCreated, () => {
    fetchRatingFactors();
  });

  // fetch company services
  const fetchCompanyServices = async () => {
    try {
      const response = await getAllCompanyServices();
      if (response && response.data) {
        const services = response.data?.services || [];
        const sorted = [...services].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setCompanyServices(sorted);
      }
    } catch (error) {
      console.error("Error fetching company services:", error);
    }
  };

  useEventBus(EVENT_KEYS.companyServiceCreated, () => {
    fetchCompanyServices();
  });

  // Delete confirmation hook for Company Types
  const companyTypeDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => {
      // Call the delete service with optional targetId for data transfer
      await deleteCompanyType(itemId, targetId);
    },
    defaultConfig: {
      entityName: 'Company Type',
      entityDisplayName: '',
      showTransferOption: true,
      transferDescription: 'All companies using this type will be transferred to the selected type.'
    },
    onSuccess: () => {
      console.log('Company type deleted successfully');
      fetchCompanyTypes(); // Refresh the list
    },
    onError: (error: any) => {
      console.error('Failed to delete company type:', error);
      alert('Failed to delete company type');
    }
  });


  // New delete handler for company types using the modal
  const handleCompanyTypeDelete = (id: string) => {
    // Find the company type being deleted to get its name
    const companyTypeToDelete = companyTypes.find(type => type.id === id);
    const typeName = companyTypeToDelete?.name || 'Unknown Company Type';
    
    // Create dropdown options from other company types (excluding the one being deleted)
    const dropdownOptions: DropdownOption[] = companyTypes
      .filter(type => type.id !== id && type.id && type.name)
      .map(type => ({
        key: type.id!,
        value: type.name
      }));
    
    // Show the delete confirmation modal
    companyTypeDeleteConfirmation.showDeleteModal(id, typeName, {
      dropdownOptions,
      showTransferOption: dropdownOptions.length > 0,
      transferDescription: dropdownOptions.length > 0 
        ? 'All companies using this type will be transferred to the selected type.'
        : 'This is the last company type and cannot be transferred.'
    });
  };


  const handleRatingFactorDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Rating factor deleted successfully");
      if (confirmed) {
        await deleteRatingFactor(id);
        fetchRatingFactors();
      }
    } catch (error) {
      console.error("Error deleting rating factor:", error);
    }
  };

  const handleCompanyServiceDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Company service deleted successfully");
      if (confirmed) {
        await deleteCompanyService(id);
        fetchCompanyServices();
      }
    } catch (error) {
      console.error("Error deleting company service:", error);
    }
  };



  if (loading) {
    return (
      <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: "300px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }
  

  return (
    <div>
      {/* Configure Heading */}
      <div className="d-flex pb-4" style={{ fontFamily: "Barlow", fontSize: "24px", fontWeight: "600" }}>Company Config</div>

      {/* Prefix Settings Card */}
      <div className="card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <h5 className="card-title mb-4" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "16px" }}>Company Prefix Settings</h5>
          <PrefixSettingsForm
            typeLabel="Company"
            typeValue="COMPANY"
          />
        </div>
      </div>

      {/* Company Services Card */}
      <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Company Services</h5>
            <button
              onClick={handleCompanyServiceModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Company Service
            </button>
          </div>

          <div className="row mt-4">
            {companyServices.map((companyService: any) => (
              <div key={companyService.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: 'pointer'
                    }} title={companyService.name}>{companyService.name.length > 10 ? companyService.name.slice(0, 10) + '...' : companyService.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleCompanyServiceEdit(companyService)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleCompanyServiceDelete(companyService.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Status Card */}
      <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center ">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Company Type</h5>
            <button
              onClick={handleModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Company Type
            </button>
          </div>

          <div className="row mt-4">
            {companyTypes.map((companyType: any) => (
              <div key={companyType.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: companyType.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: 'pointer'
                    }} title={companyType.name}>{companyType.name.length > 10 ? companyType.name.slice(0, 10) + '...' : companyType.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleEdit(companyType)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleCompanyTypeDelete(companyType.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating Factor Card */}
      <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Rating Factors </h5>
            <button
              onClick={handleRatingFactorModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Rating Factor
            </button>
          </div>

          <div className="row mt-4">
            {ratingFactors.map((ratingFactor: any) => (
              <div key={ratingFactor.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: ratingFactor.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: 'pointer'
                    }} title={ratingFactor.name}>{ratingFactor.name.length > 10 ? ratingFactor.name.slice(0, 10) + '...' : ratingFactor.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleRatingFactorEdit(ratingFactor)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleRatingFactorDelete(ratingFactor.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Modals */}
      <CompanyConfigForm
        show={showModal}
        onClose={handleModalClose}
        onSuccess={fetchCompanyTypes}
        initialData={editingCompanyType}
        isEditing={!!editingCompanyType}
        type="company-type"
        title="Company Type"
      />
      {/* Contact-related modals moved to ContactConfigMain */}
      {/* <CompanyConfigForm
        show={showCompanyRoleTypeModal}
        onClose={handleReferralTypeModalClose}
        onSuccess={fetchContactRoleTypes}
        initialData={editingCompanyRoleType}
        isEditing={!!editingCompanyRoleType}
        type="contact-role-type"
        title="Contact Role Type"
      />
      <CompanyConfigForm
        show={showContactStatusModal}
        onClose={handleContactStatusModalClose}
        onSuccess={fetchContactStatuses}
        initialData={editingContactStatus}
        isEditing={!!editingContactStatus}
        type="contact-status"
        title="Contact Status"
      /> */}
      <CompanyConfigForm
        show={showRatingFactorModal}
        onClose={handleRatingFactorModalClose}
        onSuccess={fetchRatingFactors}
        initialData={editingRatingFactor}
        isEditing={!!editingRatingFactor}
        type="rating-factor"
        title="Rating Factor"
      />
      <CompanyConfigForm
        show={showCompanyServicesModal}
        onClose={handleCompanyServiceModalClose}
        onSuccess={fetchCompanyServices}
        initialData={editingCompanyService}
        isEditing={!!editingCompanyService}
        type="company-services"
        title="Company Service"
      />

      {/* Delete Confirmation Modal for Company Types */}
      {companyTypeDeleteConfirmation.DeleteModal}

      {/* Delete Confirmation Modal for Contact Role Types - Now in ContactConfigMain */}
      {/* {contactRoleTypeDeleteConfirmation.DeleteModal} */}


      {/* <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">  
          <LeadsProjectCompanyChartSettings type={PROJECT_CHART_SETTINGS_MODAL_TYPE.COMPANY}/>
        </div>
      </div> */}
    </div>
  );
};

export default CompanyConfigMain;
