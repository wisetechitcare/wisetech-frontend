import { getAllLeadStatus, deleteLeadStatus, getAllLeadReferralType, deleteLeadReferralType, getAllLeadDirectSource, deleteLeadDirectSource, getAllLeadCancellationReasons, deleteLeadCancellationReason } from "@services/lead";
import PrefixSettingsForm, { PrefixSetting, PrefixSettingsFormValues } from "@app/modules/common/components/PrefixSettingsForm";
import { fetchAllPrefixSettings, createPrefixSetting, updatePrefixSetting } from "@services/options";

import { getAllProjectServices, deleteProjectService } from "@services/projects";
import { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import LeadsConfigForm from "./components/LeadsConfigForm";
import { Container } from "react-bootstrap";
import { LeadDirectSource, LeadReferralType, LeadStatus, LeadCancellationReason } from "@models/leads";
import { ProjectItem } from "@models/clientProject";
import { useDeleteConfirmation } from "../../../../../hooks/useDeleteConfirmation";
import { DropdownOption } from "../../../../../types/deleteConfirmation";
import LeadsProjectCompanyChartSettings from "@pages/company/settings/LeadsProjectCompanyChartSettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import ProjectConfigForm from "../../projects/configure/components/ProjectConfigForm";
import {
  getAllProjectCategories,
  getAllProjectSubcategories,
  deleteProjectCategory,
  deleteProjectSubcategory,
} from "@services/projects";

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

// Utility function to sort items alphabetically by name
const sortItemsAlphabetically = <T extends { name: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
};

// Utility function to sort cancellation reasons by 'reason' field
const sortCancellationReasonsAlphabetically = (reasons: any[]) => {
  return [...reasons].sort((a, b) => a.reason.localeCompare(b.reason));
};


const LeadsConfigurationMain = () => {
  const [loading, setLoading] = useState(false);
  const [leadStatus, setLeadStatus] = useState<LeadStatus[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);
  const [showReferralTypeModal, setShowReferralTypeModal] = useState(false);
  const [editingReferralType, setEditingReferralType] = useState<LeadReferralType | null>(null);
  const [leadReferralType, setLeadReferralType] = useState<LeadReferralType[]>([]);
  const [leadDirectSource, setLeadDirectSource] = useState<LeadDirectSource[]>([]);
  const [showDirectSourceModal, setShowDirectSourceModal] = useState(false);
  const [editingDirectSource, setEditingDirectSource] = useState<LeadDirectSource | null>(null);
  const [leadCancellationReasons, setLeadCancellationReasons] = useState<LeadCancellationReason[]>([]);
  const [showCancellationReasonModal, setShowCancellationReasonModal] = useState(false);
  const [editingCancellationReason, setEditingCancellationReason] = useState<LeadCancellationReason | null>(null);
  // Project Services state
  const [projectServices, setProjectServices] = useState<ProjectItem[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ProjectItem | null>(null);
  // Project Categories
  const [projectCategories, setProjectCategories] = useState<ProjectItem[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectItem | null>(null);

  // Project Subcategories
  const [projectSubcategories, setProjectSubcategories] = useState<ProjectItem[]>([]);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<ProjectItem | null>(null);


  // Modal Handlers
  const handleCategoryModalOpen = () => setShowCategoryModal(true);
  const handleSubcategoryModalOpen = () => setShowSubcategoryModal(true);

  // Edit Handlers
  const handleCategoryEdit = (category: ProjectItem) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleSubcategoryEdit = (subcategory: ProjectItem) => {
    setEditingSubcategory(subcategory);
    setShowSubcategoryModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingStatus(null);
  };

  const handleModalOpen = () => {
    setShowModal(true);
  };

  const handleReferralTypeModalOpen = () => {
    setShowReferralTypeModal(true);
  };

  const handleReferralTypeModalClose = () => {
    setShowReferralTypeModal(false);
    setEditingReferralType(null);
  };

  const handleEdit = (status: LeadStatus) => {
    setEditingStatus(status);
    setShowModal(true);
  };

  const handleReferralTypeEdit = (status: LeadReferralType) => {
    setEditingReferralType(status);
    setShowReferralTypeModal(true);
  };

  const handleDirectSourceEdit = (source: LeadDirectSource) => {
    setEditingDirectSource(source);
    setShowDirectSourceModal(true);
  };

  const handleDirectSourceModalClose = () => {
    setShowDirectSourceModal(false);
    setEditingDirectSource(null);
  };

  const handleDirectSourceModalOpen = () => {
    setShowDirectSourceModal(true);
  };

  const handleCancellationReasonModalOpen = () => {
    setShowCancellationReasonModal(true);
  };

  const handleCancellationReasonModalClose = () => {
    setShowCancellationReasonModal(false);
    setEditingCancellationReason(null);
  };

  const handleCancellationReasonEdit = (reason: LeadCancellationReason) => {
    setEditingCancellationReason(reason);
    setShowCancellationReasonModal(true);
  };

  // Project Services handlers
  const handleServiceModalOpen = () => setShowServiceModal(true);
  const handleServiceModalClose = () => {
    setShowServiceModal(false);
    setEditingService(null);
  };
  const handleServiceEdit = (service: ProjectItem) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  // fetch lead statuses
  const fetchLeadStatuses = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadStatus();
      if (response && response.leadStatuses) {
        const sorted = [...response.leadStatuses].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setLeadStatus(sorted);
      }
    } catch (error) {
      console.error("Error fetching lead statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  // fetch project category
  const fetchProjectCategories = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectCategories();
      if (response?.projectCategories) {
        setProjectCategories(response.projectCategories);
      }
    } catch (error) {
      console.error("Error fetching project categories:", error);
    } finally {
      setLoading(false);
    }
  };

  // fetch project sub category
  const fetchProjectSubcategories = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectSubcategories();
      if (response?.projectSubCategories) {
        setProjectSubcategories(response.projectSubCategories);
      }
    } catch (error) {
      console.error("Error fetching project subcategories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectCategories();
    fetchProjectSubcategories();
  }, []);




  useEventBus(EVENT_KEYS.leadStatusCreated, () => {
    fetchLeadStatuses();
  });

  useEventBus(EVENT_KEYS.projectCategoryCreated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectCategoryUpdated, fetchProjectCategories);

  useEventBus(EVENT_KEYS.projectSubcategoryCreated, () => {
    fetchProjectSubcategories();
    fetchProjectCategories();
  });
  useEventBus(EVENT_KEYS.projectSubcategoryUpdated, () => {
    fetchProjectSubcategories();
    fetchProjectCategories();
  });


  // Delete confirmation hook for Project Services
  const serviceDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => {
      await deleteProjectService(itemId, targetId);
    },
    defaultConfig: {
      entityName: 'Project Service',
      entityDisplayName: '',
      showTransferOption: true,
      transferDescription: 'All projects and leads using this service will be transferred to the selected service.'
    },
    onSuccess: () => {
      console.log('Project service deleted successfully');
      fetchProjectServices();
    },
    onError: (error: any) => {
      console.error('Failed to delete project service:', error);
      alert('Failed to delete project service');
    }
  });

  useEffect(() => {
    fetchLeadStatuses();
  }, []);

  // fetch lead referral types
  const fetchLeadReferralTypes = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadReferralType();
      if (response && response.leadReferralTypes) {
        const sorted = [...response.leadReferralTypes].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setLeadReferralType(sorted);
      }
    } catch (error) {
      console.error("Error fetching lead referral types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryDelete = async (id: string) => {
    try {
      const category = projectCategories.find((c) => c.id === id);
      if (category && category.subCategories && category.subCategories > 0) {
        const Swal = (await import("sweetalert2")).default;
        await Swal.fire({
          icon: "warning",
          title: "Cannot Delete",
          text: `This category has ${category.subCategories} subcategory(s) and cannot be deleted. Please remove all subcategories first.`,
          confirmButtonColor: "#9D4141",
        });
        return;
      }

      const confirmed = await deleteConfirmation("Category deleted successfully");
      if (!confirmed) return;

      await deleteProjectCategory(id);
      fetchProjectCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleSubcategoryDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Subcategory deleted successfully");
      if (!confirmed) return;

      await deleteProjectSubcategory(id);
      // Refresh BOTH lists: subcategories (to remove item) AND categories
      // (to update the subCategories count so the "Cannot Delete" guard is accurate)
      await Promise.all([fetchProjectSubcategories(), fetchProjectCategories()]);
    } catch (error) {
      console.error("Error deleting subcategory:", error);
    }
  };


  useEventBus(EVENT_KEYS.leadReferralTypeCreated, () => {
    fetchLeadReferralTypes();
  });

  useEffect(() => {
    fetchLeadReferralTypes();
  }, []);


  // fetch lead direct sources
  const fetchLeadDirectSources = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadDirectSource();
      if (response && response.leadDirectSources) {
        const sorted = [...response.leadDirectSources].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setLeadDirectSource(sorted);
      }
    } catch (error) {
      console.error("Error fetching lead direct sources:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project services
  const fetchProjectServices = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectServices();
      if (response?.services) {
        setProjectServices(response.services);
      }
    } catch (error) {
      console.error("Error fetching project services:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch lead cancellation reasons
  const fetchLeadCancellationReasons = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadCancellationReasons();
      if (response?.data?.leadCancellationReasons) {
        setLeadCancellationReasons(response.data.leadCancellationReasons);
      }
    } catch (error) {
      console.error("Error fetching lead cancellation reasons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancellationReasonDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Cancellation reason deleted successfully");
      if (!confirmed) return;

      await deleteLeadCancellationReason(id);
      fetchLeadCancellationReasons();
    } catch (error) {
      console.error("Error deleting cancellation reason:", error);
    }
  };

  useEventBus(EVENT_KEYS.leadDirectSourceCreated, () => {
    fetchLeadDirectSources();
  });

  useEffect(() => {
    fetchLeadDirectSources();
  }, []);

  // lead cancellation reasons event bus and initial fetch
  useEventBus(EVENT_KEYS.leadCancellationReasonCreated, () => {
    fetchLeadCancellationReasons();
  });
  useEventBus(EVENT_KEYS.leadCancellationReasonUpdated, () => {
    fetchLeadCancellationReasons();
  });

  useEffect(() => {
    fetchLeadCancellationReasons();
  }, []);

  // project services event bus and initial fetch
  useEventBus(EVENT_KEYS.projectServiceCreated, fetchProjectServices);
  useEventBus(EVENT_KEYS.projectServiceUpdated, fetchProjectServices);
  useEffect(() => {
    fetchProjectServices();
  }, []);

  // Delete confirmation hook for Lead Direct Source
  const directSourceDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => {
      // Call the delete service with optional targetId for data transfer
      await deleteLeadDirectSource(itemId, targetId);
    },
    defaultConfig: {
      entityName: 'Lead Direct Source',
      entityDisplayName: '',
      showTransferOption: true,
      transferDescription: 'All leads using this direct source will be transferred to the selected source.'
    },
    onSuccess: () => {
      console.log('Lead direct source deleted successfully');
      fetchLeadDirectSources(); // Refresh the list
    },
    onError: (error) => {
      console.error('Failed to delete lead direct source:', error);
      alert('Failed to delete lead direct source');
    }
  });

  // delete lead status
  const handleDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Lead status deleted successfully");
      if (confirmed) {
        await deleteLeadStatus(id);
        fetchLeadStatuses();
      }
    } catch (error) {
      console.error("Error deleting lead status:", error);
    }
  };

  const handleReferralTypeDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Lead referral type deleted successfully");
      if (confirmed) {
        await deleteLeadReferralType(id);
        fetchLeadReferralTypes();
      }
    } catch (error) {
      console.error("Error deleting lead referral type:", error);
    }
  };

  const handleDirectSourceDelete = (id: string) => {
    // Find the source being deleted to get its name
    const sourceToDelete = leadDirectSource.find(source => source.id === id);
    const sourceName = sourceToDelete?.name || 'Unknown Source';

    // Create dropdown options from other lead direct sources (excluding the one being deleted)
    const dropdownOptions: DropdownOption[] = leadDirectSource
      .filter(source => source.id !== id && source.id && source.name)
      .map(source => ({
        key: source.id!,
        value: source.name
      }));

    // Show the delete confirmation modal
    directSourceDeleteConfirmation.showDeleteModal(id, sourceName, {
      dropdownOptions,
      showTransferOption: dropdownOptions.length > 0,
      transferDescription: dropdownOptions.length > 0
        ? 'All leads using this direct source will be transferred to the selected source.'
        : 'This is the last direct source and cannot be transferred.'
    });
  };

  // New delete handler specifically for project services using the modal
  const handleServiceDelete = (id: string) => {
    // Find the service being deleted to get its name
    const serviceToDelete = projectServices.find(service => service.id === id);
    const serviceName = serviceToDelete?.name || 'Unknown Service';

    // Create dropdown options from other project services (excluding the one being deleted)
    const dropdownOptions: DropdownOption[] = projectServices
      .filter(service => service.id !== id && service.id && service.name)
      .map(service => ({
        key: service.id!,
        value: service.name
      }));

    // Show the delete confirmation modal
    serviceDeleteConfirmation.showDeleteModal(id, serviceName, {
      dropdownOptions,
      showTransferOption: dropdownOptions.length > 0,
      transferDescription: dropdownOptions.length > 0
        ? 'All projects and leads using this service will be transferred to the selected service.'
        : 'This is the last service and cannot be transferred.'
    });
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
      <div className="d-flex pb-4" style={{ fontFamily: "Barlow", fontSize: "24px", fontWeight: "600" }}>Configure</div>

      {/* Lead Cancellation Reasons Card */}
      <div className="card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Lead Cancellation Reasons</h5>
            <button
              onClick={handleCancellationReasonModalOpen}
              className="btn"
              style={{ ...buttonStyles.base, whiteSpace: "nowrap", fontSize: 'clamp(12px, 2vw, 16px)', }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Cancellation Reason
            </button>
          </div>
          <div className="row mt-4">
            {leadCancellationReasons.map((reason: any) => (
              <div key={reason.id} className="col-12 col-md-3 mb-3">
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
                        backgroundColor: reason.color,
                      }}

                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer",
                    }}>{reason.reason}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleCancellationReasonEdit(reason)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleCancellationReasonDelete(reason.id!)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Direct Source Card */}
      <div className="card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Lead Direct Source</h5>
            <button
              onClick={handleDirectSourceModalOpen}
              className="btn"
              style={{ ...buttonStyles.base, whiteSpace: "nowrap", fontSize: 'clamp(12px, 2vw, 16px)', }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Direct Source
            </button>
          </div>
          <div className="row mt-4">
            {leadDirectSource.map((source: any) => (
              <div key={source.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between "
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
                        backgroundColor: source.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                    }}>{source.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleDirectSourceEdit(source)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDirectSourceDelete(source.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prefix Settings Card */}
      <div className="card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <h5 className="card-title mb-4" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "16px" }}>Lead Prefix Settings</h5>
          <PrefixSettingsForm
            typeLabel="Lead"
            typeValue="LEAD"
          />
        </div>
      </div>

      {/* Lead Referral Type Card */}
      <div className="card responsive-card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Lead Referral Type</h5>
            <button
              onClick={handleReferralTypeModalOpen}
              className="btn"
              style={{ ...buttonStyles.base, whiteSpace: "nowrap", fontSize: 'clamp(12px, 2vw, 16px)', }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Referral Type
            </button>
          </div>

          <div className="row mt-4">
            {sortItemsAlphabetically(leadReferralType).map((status: any) => (
              <div key={status.id} className="col-12 col-md-3 mb-3">
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
                        backgroundColor: status.color,
                      }}
                    ></div>
                    <div
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: '14px',
                        lineHeight: '100%',
                        letterSpacing: '0',
                      }}
                    >
                      {status.name}
                    </div>

                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleReferralTypeEdit(status)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleReferralTypeDelete(status.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Status Card */}
      <div className="card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title " style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Lead Status</h5>
            <button
              onClick={handleModalOpen}
              className="btn"
              style={{ ...buttonStyles.base, whiteSpace: "nowrap", fontSize: 'clamp(12px, 2vw, 16px)', }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Status
            </button>
          </div>

          <div className="row mt-4">
            {sortItemsAlphabetically(leadDirectSource).map((source: any) => (
              <div key={source.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between "
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
                        backgroundColor: source.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                    }}>{source.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleDirectSourceEdit(source)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDirectSourceDelete(source.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        {/* Project Services */}
        <div
          className="card mt-5"
          style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
        >
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
              <h5
                className="card-title"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontStyle: "normal",
                  fontSize: "16px",
                  lineHeight: "100%",
                  letterSpacing: "0",
                }}
              >
                Project Services
              </h5>
              <button
                onClick={handleServiceModalOpen}
                className="btn"
                style={{ ...buttonStyles.base, whiteSpace: "nowrap", fontSize: 'clamp(12px, 2vw, 16px)' }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
              >
                New Service
              </button>
            </div>

            <div className="row mt-4">
              {sortItemsAlphabetically(projectServices).map((service) => (
                <div key={service.id} className="col-12 col-md-3 mb-3">
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
                          backgroundColor: service.color,
                        }}
                      ></div>
                      <div
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 400,
                          fontStyle: "normal",
                          fontSize: "14px",
                          lineHeight: "100%",
                          letterSpacing: "0",
                          cursor: "pointer",
                        }}
                        title={service.name}
                      >
                        {service.name.length > 10
                          ? `${service.name.slice(0, 14)}...`
                          : service.name}
                      </div>
                    </div>
                    <div className="ms-4 d-flex gap-3">
                      <i
                        className="fa fa-pencil cursor-pointer"
                        onClick={() => handleServiceEdit(service)}
                      ></i>
                      <i
                        className="fa fa-trash cursor-pointer"
                        onClick={() => handleServiceDelete(service.id!)}
                      ></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lead Cancellation Reasons Card */}
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
            }}>Lead Cancellation Reasons</h5>
            <button
              onClick={handleCancellationReasonModalOpen}
              className="btn"
              style={{ ...buttonStyles.base, whiteSpace: "nowrap", fontSize: 'clamp(12px, 2vw, 16px)', }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Cancellation Reason
            </button>
          </div>
          <div className="row mt-4">
            {sortCancellationReasonsAlphabetically(leadCancellationReasons).map((reason: LeadCancellationReason) => (
              <div key={reason.id} className="col-12 col-md-3 mb-3">
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
                        backgroundColor: reason.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={reason.reason}>{reason.reason.length > 10 ? `${reason.reason.slice(0, 15)}...` : reason.reason}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleCancellationReasonEdit(reason)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleCancellationReasonDelete(reason.id!)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Card */}
      <div
        className="card mb-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Project Categories and Project Subcategories</h5>
            <button
              onClick={handleCategoryModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Category
            </button>
          </div>

          <div className="row mt-4">
            {sortItemsAlphabetically(projectCategories).map((category) => (
              <div key={category.id} className="col-12 col-md-3 mb-3">
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
                        backgroundColor: category.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={category.name}>{category.name.length > 10 ? `${category.name.slice(0, 14)}...` : category.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleCategoryEdit(category)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleCategoryDelete(category.id)}


                    ></i>
                    {category.subCategories}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Services */}
      <div
        className="card mb-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Project Subcategories</h5>
            <button
              onClick={handleSubcategoryModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Subcategory
            </button>
          </div>

          <div className="row mt-4">
            {sortItemsAlphabetically(projectSubcategories).map((subcategory) => (
              <div key={subcategory.id} className="col-12 col-md-3 mb-3">
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
                        backgroundColor: subcategory.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={subcategory.name}>{subcategory.name.length > 10 ? `${subcategory.name.slice(0, 14)}...` : subcategory.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleSubcategoryEdit(subcategory)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() =>
                        handleSubcategoryDelete(subcategory.id)
                      }
                    ></i>
                    {/* {subcategory.subCategories} */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LeadsConfigForm
        show={showModal}
        onClose={handleModalClose}
        onSuccess={fetchLeadStatuses}
        initialData={editingStatus}
        isEditing={!!editingStatus}
        type="status"
        title="Status"
      />
      <LeadsConfigForm
        show={showReferralTypeModal}
        onClose={handleReferralTypeModalClose}
        onSuccess={fetchLeadReferralTypes}
        initialData={editingReferralType}
        isEditing={!!editingReferralType}
        type="referral"
        title="Referral Type"
      />
      <LeadsConfigForm
        show={showDirectSourceModal}
        onClose={handleDirectSourceModalClose}
        onSuccess={fetchLeadDirectSources}
        initialData={editingDirectSource}
        isEditing={!!editingDirectSource}
        type="direct-source"
        title="Direct Source"
      />
      <LeadsConfigForm
        show={showCancellationReasonModal}
        onClose={handleCancellationReasonModalClose}
        onSuccess={fetchLeadCancellationReasons}
        initialData={editingCancellationReason ? {
          ...editingCancellationReason,
          name: editingCancellationReason.reason,
          color: editingCancellationReason.color
        } : null}
        isEditing={!!editingCancellationReason}
        type="cancellation-reason"
        title="Cancellation Reason"
      />
      {/* Service Modal */}
      <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={fetchProjectServices}
        type="service"
        title="Service"
        isEditing={!!editingService}
        initialData={editingService}
      />

      {/* Category Modal */}
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSuccess={fetchProjectCategories}
        type="category"
        title="Category"
        isEditing={!!editingCategory}
        initialData={editingCategory}
      />

      {/* Subcategory Modal */}
      <ProjectConfigForm
        show={showSubcategoryModal}
        onClose={() => {
          setShowSubcategoryModal(false);
          setEditingSubcategory(null);
        }}
        onSuccess={() => {
          fetchProjectSubcategories();
          fetchProjectCategories();
        }}
        type="subcategory"
        title="Subcategory"
        isEditing={!!editingSubcategory}
        initialData={editingSubcategory}
      />


      {/* Delete Confirmation Modal */}
      {directSourceDeleteConfirmation.DeleteModal}
      {/* Delete Confirmation Modal for Project Services */}
      {serviceDeleteConfirmation.DeleteModal}

      {/* Chart Settings - Moved to LeadNewLead.tsx for modal access */}
      {/* <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">  
          <LeadsProjectCompanyChartSettings type={PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD}/>
        </div>
      </div> */}

    </div>
  );
};

export default LeadsConfigurationMain;
