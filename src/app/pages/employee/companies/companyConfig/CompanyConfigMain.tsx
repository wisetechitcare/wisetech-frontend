import { deleteCompanyType, getAllCompanyTypes, getAllRatingFactors, deleteRatingFactor, getAllCompanyServices, deleteCompanyService } from "@services/companies";
import { useEffect, useState } from "react";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import CompanyTypeServiceTree from "./components/CompanyTypeServiceTree";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import CompanyConfigForm from "./components/CompanyConfigForm";
import { Container } from "react-bootstrap";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { DropdownOption } from "../../../../../types/deleteConfirmation";
import LeadsProjectCompanyChartSettings from "@pages/company/settings/LeadsProjectCompanyChartSettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';
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
    setEditingCompanyType(null);
    setShowModal(true);
  };

  // "Add subcategory" under a parent type → open the New Company Type modal with the
  // parent preselected (no id → create mode).
  const handleAddSubType = (parentTypeId?: string) => {
    setEditingCompanyType(parentTypeId ? ({ parentTypeId } as any) : null);
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

  // Tree wiring: add a "Sub-service" (a Service row) under a "Service" (a sub-type) —
  // preset its companyTypeId (the sub-type id; null = Unassigned).
  const handleAddServiceUnderType = (companyTypeId: string | null) => {
    setEditingCompanyService(companyTypeId ? ({ companyTypeId } as any) : null);
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
        fetchCompanyServices(),
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
      const confirmed = await deleteConfirmation("Sub-service deleted successfully");
      if (confirmed) {
        await deleteCompanyService(id);
        fetchCompanyServices();
      }
    } catch (error) {
      console.error("Error deleting sub-service:", error);
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

  // Helper component for item chips
  const ItemChip = ({ item, onEdit, onDelete, showColor = false }: any) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: C.bgSection,
        padding: `${SP.sm} ${SP.md}`,
        borderRadius: RADIUS.lg,
        border: `1px solid ${C.border}`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        gap: SP.sm,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = C.bgCard;
        e.currentTarget.style.boxShadow = `0 4px 12px ${C.primaryShadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = C.bgSection;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flex: 1, minWidth: 0 }}>
        {showColor && item.color && (
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
        )}
        <span style={{
          fontFamily: FONT.body,
          fontSize: '13px',
          color: C.textPrimary,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }} title={item.name}>
          {item.name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: SP.xs, flexShrink: 0 }}>
        <button
          onClick={() => onEdit(item)}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.info,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = C.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = C.info}
        >
          <i className="bi bi-pencil" style={{ fontSize: '14px' }} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.danger,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#c41e3a'}
          onMouseLeave={(e) => e.currentTarget.style.color = C.danger}
        >
          <i className="bi bi-trash" style={{ fontSize: '14px' }} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Company Configuration"
        subtitle="Manage company settings, services, types, and rating factors"
        icon="bi-building"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

          {/* Prefix Settings Card */}
          <ConfigSectionCard
            title="Prefix Settings"
            description="Configure company prefix for ID generation"
            icon="bi-hash"
            iconColor="primary"
            compact={false}
          >
            <div style={{ marginTop: SP.md }}>
              <PrefixSettingsForm
                typeLabel="Company"
                typeValue="COMPANY"
              />
            </div>
          </ConfigSectionCard>

      {/* Unified Company Hierarchy: Type → Sub-type → Service → Sub-service */}
      <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center ">
            <div>
              <h5 className="card-title mb-1" style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: "16px",
                lineHeight: "100%",
                letterSpacing: "0"
              }}>Company Type &amp; Services</h5>
              <div className="text-muted" style={{ fontSize: "12px" }}>
                Type → Service → Sub-service. Use the row actions to add a service or a sub-service.
              </div>
            </div>
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

          <div className="mt-4">
            <CompanyTypeServiceTree
              companyTypes={companyTypes}
              services={companyServices}
              // "Add Service" creates a CompanyType sub-type under the top-level type.
              onAddService={(parentId: string) => handleAddSubType(parentId)}
              onEditType={(type: any) => handleEdit(type)}
              onDeleteType={(id: string) => handleCompanyTypeDelete(id)}
              // "Add Sub-service" creates a Service row under the sub-type.
              onAddSubService={(companyTypeId: string | null) => handleAddServiceUnderType(companyTypeId)}
              onEditSubService={(service: any) => handleCompanyServiceEdit(service)}
              onDeleteSubService={(id: string) => handleCompanyServiceDelete(id)}
            />
          </div>
        </div>
      </div>

          {/* Rating Factors Card */}
          <ConfigSectionCard
            title={`Rating Factors (${ratingFactors.length})`}
            description="Define rating factors for company evaluation"
            icon="bi-star"
            iconColor="amber"
            badge={{ label: `${ratingFactors.length}`, color: C.amber, bg: C.amberLight }}
            primaryAction={{
              label: 'New Factor',
              icon: 'bi-plus-lg',
              onClick: handleRatingFactorModalOpen,
              variant: 'primary',
            }}
          >
            <div style={{ marginTop: SP.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                {ratingFactors.map((ratingFactor: any) => (
                  <ItemChip
                    key={ratingFactor.id}
                    item={ratingFactor}
                    onEdit={handleRatingFactorEdit}
                    onDelete={handleRatingFactorDelete}
                    showColor={true}
                  />
                ))}
                {ratingFactors.length === 0 && (
                  <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted, fontFamily: FONT.body }}>
                    <i className="bi bi-inbox" style={{ fontSize: '24px', display: 'block', marginBottom: SP.sm, opacity: 0.4 }} />
                    No factors configured yet
                  </div>
                )}
              </div>
            </div>
          </ConfigSectionCard>
        </div>
      </ConfigPageLayout>

      {/* Modals */}
      <CompanyConfigForm
        show={showModal}
        onClose={handleModalClose}
        onSuccess={fetchCompanyTypes}
        initialData={editingCompanyType}
        isEditing={!!editingCompanyType?.id}
        type="company-type"
        // A sub-type (has a parent) is presented as a "Service"; a top-level row is a "Company Type".
        title={editingCompanyType?.parentTypeId ? "Service" : "Company Type"}
      />
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
        title="Sub-service"
      />

      {/* Delete Confirmation Modal for Company Types */}
      {companyTypeDeleteConfirmation.DeleteModal}
    </>
  );
};

export default CompanyConfigMain;
