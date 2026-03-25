import {
  fetchAllEmployeeConfigurations,
  deleteEmployeeConfigurationById,
} from "@services/configurations";
import { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import EmployeeConfigureForm from "./EmployeeConfigureForm";
import Loader from "@app/modules/common/utils/Loader";
import EmployeeTypes from "@pages/company/masters/EmployeeTypes";

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

interface EmployeeConfigItem {
  id: string;
  type: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

const EmployeeConfigure = () => {
  const [loading, setLoading] = useState(false);

  // Job Profile configurations
  const [jobProfiles, setJobProfiles] = useState<EmployeeConfigItem[]>([]);
  const [showJobProfileModal, setShowJobProfileModal] = useState(false);
  const [editingJobProfile, setEditingJobProfile] = useState<EmployeeConfigItem | null>(null);

  // Employee Type configurations
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeConfigItem[]>([]);
  const [showEmployeeTypeModal, setShowEmployeeTypeModal] = useState(false);
  const [editingEmployeeType, setEditingEmployeeType] = useState<EmployeeConfigItem | null>(null);

  // Employee Level configurations
  const [employeeLevels, setEmployeeLevels] = useState<EmployeeConfigItem[]>([]);
  const [showEmployeeLevelModal, setShowEmployeeLevelModal] = useState(false);
  const [editingEmployeeLevel, setEditingEmployeeLevel] = useState<EmployeeConfigItem | null>(null);

  // Employee Status configurations
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeConfigItem[]>([]);
  const [showEmployeeStatusModal, setShowEmployeeStatusModal] = useState(false);
  const [editingEmployeeStatus, setEditingEmployeeStatus] = useState<EmployeeConfigItem | null>(null);

  // Modal open handlers
  const handleJobProfileModalOpen = () => setShowJobProfileModal(true);
  const handleEmployeeTypeModalOpen = () => setShowEmployeeTypeModal(true);
  const handleEmployeeLevelModalOpen = () => setShowEmployeeLevelModal(true);
  const handleEmployeeStatusModalOpen = () => setShowEmployeeStatusModal(true);

  // Modal close handlers
  const handleJobProfileModalClose = () => {
    setShowJobProfileModal(false);
    setEditingJobProfile(null);
  };

  const handleEmployeeTypeModalClose = () => {
    setShowEmployeeTypeModal(false);
    setEditingEmployeeType(null);
  };

  const handleEmployeeLevelModalClose = () => {
    setShowEmployeeLevelModal(false);
    setEditingEmployeeLevel(null);
  };

  const handleEmployeeStatusModalClose = () => {
    setShowEmployeeStatusModal(false);
    setEditingEmployeeStatus(null);
  };

  // Edit handlers
  const handleJobProfileEdit = (jobProfile: EmployeeConfigItem) => {
    setEditingJobProfile(jobProfile);
    setShowJobProfileModal(true);
  };

  const handleEmployeeTypeEdit = (employeeType: EmployeeConfigItem) => {
    setEditingEmployeeType(employeeType);
    setShowEmployeeTypeModal(true);
  };

  const handleEmployeeLevelEdit = (employeeLevel: EmployeeConfigItem) => {
    setEditingEmployeeLevel(employeeLevel);
    setShowEmployeeLevelModal(true);
  };

  const handleEmployeeStatusEdit = (employeeStatus: EmployeeConfigItem) => {
    setEditingEmployeeStatus(employeeStatus);
    setShowEmployeeStatusModal(true);
  };

  // Fetch job profiles
  const fetchJobProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetchAllEmployeeConfigurations("JOB_PROFILE");
      if (response?.data?.employeeConfigurations) {
        setJobProfiles(response.data.employeeConfigurations);
      }
    } catch (error) {
      console.error("Error fetching job profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee types
  const fetchEmployeeTypes = async () => {
    try {
      setLoading(true);
      const response = await fetchAllEmployeeConfigurations("EMPLOYEE_TYPE");
      if (response?.data?.employeeConfigurations) {
        setEmployeeTypes(response.data.employeeConfigurations);
      }
    } catch (error) {
      console.error("Error fetching employee types:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee levels
  const fetchEmployeeLevels = async () => {
    try {
      setLoading(true);
      const response = await fetchAllEmployeeConfigurations("EMPLOYEE_LEVEL");
      if (response?.data?.employeeConfigurations) {
        setEmployeeLevels(response.data.employeeConfigurations);
      }
    } catch (error) {
      console.error("Error fetching employee levels:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee statuses
  const fetchEmployeeStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetchAllEmployeeConfigurations("EMPLOYEE_STATUS");
      if (response?.data?.employeeConfigurations) {
        setEmployeeStatuses(response.data.employeeConfigurations);
      }
    } catch (error) {
      console.error("Error fetching employee statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Event bus listeners
  useEventBus(EVENT_KEYS.employeeConfigCreated, () => {
    fetchJobProfiles();
    fetchEmployeeTypes();
    fetchEmployeeLevels();
    fetchEmployeeStatuses();
  });

  useEventBus(EVENT_KEYS.employeeConfigUpdated, () => {
    fetchJobProfiles();
    fetchEmployeeTypes();
    fetchEmployeeLevels();
    fetchEmployeeStatuses();
  });

  useEffect(() => {
    fetchJobProfiles();
    fetchEmployeeTypes();
    fetchEmployeeLevels();
    fetchEmployeeStatuses();
  }, []);

  // Delete handler
  const handleDelete = async (
    id: string,
    type: "JOB_PROFILE" | "EMPLOYEE_TYPE" | "EMPLOYEE_LEVEL" | "EMPLOYEE_STATUS"
  ) => {
    try {
      const confirmed = await deleteConfirmation(
        `Successfully deleted ${type.toLowerCase().replace('_', ' ')}`
      );
      if (!confirmed) return;

      await deleteEmployeeConfigurationById(id);

      // Refresh appropriate list
      switch (type) {
        case "JOB_PROFILE":
          fetchJobProfiles();
          break;
        case "EMPLOYEE_TYPE":
          fetchEmployeeTypes();
          break;
        case "EMPLOYEE_LEVEL":
          fetchEmployeeLevels();
          break;
        case "EMPLOYEE_STATUS":
          fetchEmployeeStatuses();
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
      {/* Job Profile Card */}
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
              Job Profile
            </h5>
            <button
              onClick={handleJobProfileModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Job Profile
            </button>
          </div>

          <div className="row mt-4">
            {jobProfiles.map((jobProfile) => (
              <div key={jobProfile.id} className="col-12 col-md-3 mb-3">
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
                    {jobProfile.color && (
                      <div
                        className="rounded-circle"
                        style={{
                          width: "18px",
                          height: "18px",
                          backgroundColor: jobProfile.color,
                        }}
                      ></div>
                    )}
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
                      title={jobProfile.name}
                    >
                      {jobProfile.name.length > 20
                        ? `${jobProfile.name.slice(0, 20)}...`
                        : jobProfile.name}
                    </div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleJobProfileEdit(jobProfile)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(jobProfile.id, "JOB_PROFILE")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Type Card */}
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
              Employee Type
            </h5>
            <button
              onClick={handleEmployeeTypeModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Employee Type
            </button>
          </div>

          <div className="row mt-4">
            {employeeTypes.map((employeeType) => (
              <div key={employeeType.id} className="col-12 col-md-3 mb-3">
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
                    {employeeType.color && (
                      <div
                        className="rounded-circle"
                        style={{
                          width: "18px",
                          height: "18px",
                          backgroundColor: employeeType.color,
                        }}
                      ></div>
                    )}
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
                      title={employeeType.name}
                    >
                      {employeeType.name.length > 20
                        ? `${employeeType.name.slice(0, 20)}...`
                        : employeeType.name}
                    </div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleEmployeeTypeEdit(employeeType)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(employeeType.id, "EMPLOYEE_TYPE")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Level Card */}
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
              Employee Level
            </h5>
            <button
              onClick={handleEmployeeLevelModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Employee Level
            </button>
          </div>

          <div className="row mt-4">
            {employeeLevels.map((employeeLevel) => (
              <div key={employeeLevel.id} className="col-12 col-md-3 mb-3">
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
                    {employeeLevel.color && (
                      <div
                        className="rounded-circle"
                        style={{
                          width: "18px",
                          height: "18px",
                          backgroundColor: employeeLevel.color,
                        }}
                      ></div>
                    )}
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
                      title={employeeLevel.name}
                    >
                      {employeeLevel.name.length > 20
                        ? `${employeeLevel.name.slice(0, 20)}...`
                        : employeeLevel.name}
                    </div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleEmployeeLevelEdit(employeeLevel)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(employeeLevel.id, "EMPLOYEE_LEVEL")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Status Card */}
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
              Employee Status
            </h5>
            <button
              onClick={handleEmployeeStatusModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Employee Status
            </button>
          </div>

          <div className="row mt-4">
            {employeeStatuses.map((employeeStatus) => (
              <div key={employeeStatus.id} className="col-12 col-md-3 mb-3">
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
                    {employeeStatus.color && (
                      <div
                        className="rounded-circle"
                        style={{
                          width: "18px",
                          height: "18px",
                          backgroundColor: employeeStatus.color,
                        }}
                      ></div>
                    )}
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
                      title={employeeStatus.name}
                    >
                      {employeeStatus.name.length > 20
                        ? `${employeeStatus.name.slice(0, 20)}...`
                        : employeeStatus.name}
                    </div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleEmployeeStatusEdit(employeeStatus)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(employeeStatus.id, "EMPLOYEE_STATUS")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Job Profile Modal */}
      <EmployeeConfigureForm
        show={showJobProfileModal}
        onClose={handleJobProfileModalClose}
        onSuccess={fetchJobProfiles}
        initialData={editingJobProfile}
        isEditing={!!editingJobProfile}
        type="JOB_PROFILE"
        title="Job Profile"
      />

      {/* Employee Type Modal */}
      <EmployeeConfigureForm
        show={showEmployeeTypeModal}
        onClose={handleEmployeeTypeModalClose}
        onSuccess={fetchEmployeeTypes}
        initialData={editingEmployeeType}
        isEditing={!!editingEmployeeType}
        type="EMPLOYEE_TYPE"
        title="Employee Type"
      />

      {/* Employee Level Modal */}
      <EmployeeConfigureForm
        show={showEmployeeLevelModal}
        onClose={handleEmployeeLevelModalClose}
        onSuccess={fetchEmployeeLevels}
        initialData={editingEmployeeLevel}
        isEditing={!!editingEmployeeLevel}
        type="EMPLOYEE_LEVEL"
        title="Employee Level"
      />

      {/* Employee Status Modal */}
      <EmployeeConfigureForm
        show={showEmployeeStatusModal}
        onClose={handleEmployeeStatusModalClose}
        onSuccess={fetchEmployeeStatuses}
        initialData={editingEmployeeStatus}
        isEditing={!!editingEmployeeStatus}
        type="EMPLOYEE_STATUS"
        title="Employee Status"
      />

      <EmployeeTypes/>
    </div>
  );
};

export default EmployeeConfigure;
