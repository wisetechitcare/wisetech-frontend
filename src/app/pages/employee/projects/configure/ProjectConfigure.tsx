import {
  getAllProjectSubcategories,
  getAllProjectCategories,
  deleteProjectCategory,
  deleteProjectSubcategory,
  deleteProjectService,
  deleteProjectStatus,
  getAllProjectServices,
  getAllProjectStatuses,
  getAllStakeholders,
  deleteStakeholderService,
} from "@services/projects";
import { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import ProjectConfigForm from "./components/ProjectConfigForm";
import { Container } from "react-bootstrap";
import Loader from "@app/modules/common/utils/Loader";
import { ProjectItem } from "@models/clientProject";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { DropdownOption } from "./../../../../../types/deleteConfirmation";
import LeadsProjectCompanyChartSettings from "@pages/company/settings/LeadsProjectCompanyChartSettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import ProjectButtonSettings from "./ProjectButtonSettingUI";


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



const ProjectConfiguration = () => {
  const [loading, setLoading] = useState(false);

  // Project Categories
  const [projectCategories, setProjectCategories] = useState<ProjectItem[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectItem | null>(
    null
  );

  // Project Subcategories
  const [projectSubcategories, setProjectSubcategories] = useState<
    ProjectItem[]
  >([]);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] =
    useState<ProjectItem | null>(null);

  // Project Services
  const [projectServices, setProjectServices] = useState<ProjectItem[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ProjectItem | null>(
    null
  );

  // Project Statuses
  const [projectStatuses, setProjectStatuses] = useState<ProjectItem[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectItem | null>(null);

  // Stakeholders
  const [stakeholders, setStakeholders] = useState<ProjectItem[]>([]);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] =
    useState<ProjectItem | null>(null);
  // Modal open handlers
  const handleCategoryModalOpen = () => setShowCategoryModal(true);
  const handleSubcategoryModalOpen = () => setShowSubcategoryModal(true);
  const handleServiceModalOpen = () => setShowServiceModal(true);
  const handleStatusModalOpen = () => setShowStatusModal(true);
  const handleStakeholderModalOpen = () => setShowStakeholderModal(true);

  // Modal close handlers
  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleSubcategoryModalClose = () => {
    setShowSubcategoryModal(false);
    setEditingSubcategory(null);
  };

  const handleServiceModalClose = () => {
    setShowServiceModal(false);
    setEditingService(null);
  };

  const handleStatusModalClose = () => {
    setShowStatusModal(false);
    setEditingStatus(null);
  };

  const handleStakeholderModalClose = () => {
    setShowStakeholderModal(false);
    setEditingStakeholder(null);
  };

  // Edit handlers
  const handleCategoryEdit = (category: ProjectItem) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleSubcategoryEdit = (subcategory: ProjectItem) => {
    setEditingSubcategory(subcategory);
    setShowSubcategoryModal(true);
  };

  const handleServiceEdit = (service: ProjectItem) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleStatusEdit = (status: ProjectItem) => {
    setEditingStatus(status);
    setShowStatusModal(true);
  };

  const handleStakeholderEdit = (stakeholder: ProjectItem) => {
    setEditingStakeholder(stakeholder);
    setShowStakeholderModal(true);
  };

  // Fetch project categories
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

  // Fetch project subcategories
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

  // Fetch project services
  const fetchProjectServices = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectServices();
      if (response?.services) {
        const sorted = [...response.services].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setProjectServices(sorted);
      }
    } catch (error) {
      console.error("Error fetching project services:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project statuses
  const fetchProjectStatuses = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectStatuses();
      if (response?.projectStatuses) {
        const sorted = [...response.projectStatuses].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setProjectStatuses(sorted);
      }
    } catch (error) {
      console.error("Error fetching project statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stakeholders
  const fetchStakeholders = async () => {
    try {
      setLoading(true);
      const response = await getAllStakeholders();
      if (response?.stakeholderServices) {
        const sorted = [...response.stakeholderServices].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setStakeholders(sorted);
      }
    } catch (error) {
      console.error("Error fetching stakeholders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Event bus listeners
  useEventBus(EVENT_KEYS.projectCategoryCreated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectSubcategoryCreated, fetchProjectSubcategories);
  useEventBus(EVENT_KEYS.projectServiceCreated, fetchProjectServices);
  useEventBus(EVENT_KEYS.projectStatusCreated, fetchProjectStatuses);
  useEventBus(EVENT_KEYS.projectCategoryUpdated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectSubcategoryUpdated, fetchProjectSubcategories);
  useEventBus(EVENT_KEYS.projectServiceUpdated, fetchProjectServices);
  useEventBus(EVENT_KEYS.projectStatusUpdated, fetchProjectStatuses);
  useEventBus(EVENT_KEYS.stakeholderCreated, fetchStakeholders);
  useEventBus(EVENT_KEYS.stakeholderUpdated, fetchStakeholders);
  useEffect(() => {
    fetchProjectCategories();
    fetchProjectSubcategories();
    fetchProjectServices();
    fetchProjectStatuses();
    fetchStakeholders();
  }, []);

  // Delete confirmation hook for Project Services
  const serviceDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => {
      // Call the delete service with optional targetId for data transfer
      await deleteProjectService(itemId, targetId);
    },
    defaultConfig: {
      entityName: 'Project Service',
      entityDisplayName: '',
      showTransferOption: true,
      transferDescription: 'All projects and leads using this service will be transferred to the selected service.'
    },
    onSuccess: () => {
      fetchProjectServices(); // Refresh the list
    },
    onError: (error:any) => {
      console.error('Failed to delete project service:', error);
      alert('Failed to delete project service');
    }
  });

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

  // Unified delete handler for all project configuration types
  const handleDelete = async (
    id: string,
    type: "category" | "subcategory" | "service" | "status" | "stakeholder"
  ) => {
    try {
      const confirmed = await deleteConfirmation(
        `Successfully deleted ${type}`
      );
      if (!confirmed) return;

      switch (type) {
        case "category":
          await deleteProjectCategory(id);
          fetchProjectCategories();
          break;
        case "subcategory":
          await deleteProjectSubcategory(id);
          fetchProjectSubcategories();
          break;
        case "service":
          await deleteProjectService(id);
          fetchProjectServices();
          break;
        case "status":
          await deleteProjectStatus(id);
          fetchProjectStatuses();
          break;
        case "stakeholder":
          await deleteStakeholderService(id);
          fetchStakeholders();
          break;
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
    }
  };


  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      {/* Configure Heading */}

      <div
        className="d-flex pb-4"
        style={{ fontFamily: "Barlow", fontSize: "24px", fontWeight: "600" }}
      >
        Configure
      </div>
      <div className="card mb-5">
        <ProjectButtonSettings/>
      </div>

      {/* Prefix Settings Card */}
      <div className="card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <h5 className="card-title mb-4" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "16px" }}>Project Prefix Settings</h5>
          <PrefixSettingsForm
            typeLabel="Project"
            typeValue="PROJECT"
          />
        </div>
      </div>

      {/* Stakeholders services */}
      <div
        className="card mt-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
           <div  className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Stakeholders Services</h5>
            <button
              onClick={handleStakeholderModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Stakeholder
            </button>
          </div>
          <div className="row mt-4">
            {stakeholders.map((stakeholder) => (
              <div key={stakeholder.id} className="col-12 col-md-3 mb-3">
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
                        backgroundColor: stakeholder.color,
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
                    }} title={stakeholder.name}>{stakeholder.name.length > 10 ? `${stakeholder.name.slice(0, 14)}...` : stakeholder.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleStakeholderEdit(stakeholder)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() =>
                        handleDelete(stakeholder.id, "stakeholder")
                      }
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Services */}
      {/* <div
        className="card mt-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div  className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Project Services</h5>
            <button
              onClick={handleServiceModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Service
            </button>
          </div>
          <div className="row mt-4">
            {projectServices.map((service) => (
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
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={service.name}>{service.name.length > 10 ? `${service.name.slice(0, 14)}...` : service.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleServiceEdit(service)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleServiceDelete(service.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {/* Project Status Section */}
      <div
        className="card mb-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
           <div  className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Project Status</h5>
            <button
              onClick={handleStatusModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Status
            </button>
          </div>
          <div className="row mt-4">
            {projectStatuses.map((status) => (
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
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={status.name}>{status.name.length > 10 ? `${status.name.slice(0, 14)}...` : status.name}</div>
                    { /* when need a deafult mark */ }
                    {/* {(status as any).isDefault && (
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: '#8B4444',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        marginLeft: '4px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}>
                        Default
                      </span>
                    )} */}
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    {/* {!["completed"].includes(status.name.toLowerCase()) && (   */}
                      <i
                        className="fa fa-pencil cursor-pointer"
                        onClick={() => handleStatusEdit(status)}
                      ></i>
                    {/* )} */}
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(status.id, "status")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stakeholders services */}
      <div
        className="card mb-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
           <div  className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Stakeholders Services</h5>
            <button
              onClick={handleStakeholderModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Stakeholder
            </button>
          </div>
          <div className="row mt-4">
            {stakeholders.map((stakeholder) => (
              <div key={stakeholder.id} className="col-12 col-md-3 mb-3">
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
                        backgroundColor: stakeholder.color,
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
                    }} title={stakeholder.name}>{stakeholder.name.length > 10 ? `${stakeholder.name.slice(0, 14)}...` : stakeholder.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleStakeholderEdit(stakeholder)}
                    ></i>
                    {/* <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() =>
                        handleDelete(stakeholder.id, "stakeholder")
                      }
                    ></i> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Category Modal */}
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={handleCategoryModalClose}
        onSuccess={fetchProjectCategories}
        initialData={editingCategory}
        isEditing={!!editingCategory}
        type="category"
        title="Category"
      />

      {/* Subcategory Modal */}
      <ProjectConfigForm
        show={showSubcategoryModal}
        onClose={handleSubcategoryModalClose}
        onSuccess={fetchProjectSubcategories}
        initialData={editingSubcategory}
        isEditing={!!editingSubcategory}
        type="subcategory"
        title="Subcategory"
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

      {/* Status Modal */}
      <ProjectConfigForm
        show={showStatusModal}
        onClose={handleStatusModalClose}
        onSuccess={fetchProjectStatuses}
        type="status"
        title="Status"
        isEditing={!!editingStatus}
        initialData={editingStatus}
      />

      {/* Stakeholder Modal */}
      <ProjectConfigForm
        show={showStakeholderModal}
        onClose={handleStakeholderModalClose}
        onSuccess={fetchStakeholders}
        type="stakeholder"
        title="Stakeholder"
        isEditing={!!editingStakeholder}
        initialData={editingStakeholder}
      />
      
      {/* Delete Confirmation Modal for Project Services */}
      {serviceDeleteConfirmation.DeleteModal}
      {/* <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">  
          <LeadsProjectCompanyChartSettings type={PROJECT_CHART_SETTINGS_MODAL_TYPE.PROJECT}/>
        </div>
      </div> */}
    </div>
  );
};

export default ProjectConfiguration;
