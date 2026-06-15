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
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from "@app/modules/configuration";

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

  // ItemChip helper component
  const ItemChip = ({ item, onEdit, onDelete }: any) => (
    <div
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
        padding: `${SP.sm} ${SP.md}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        marginBottom: SP.md,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 12px ${C.primaryShadowMd}`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
        {item.color && (
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontFamily: FONT.body,
            fontSize: '14px',
            color: C.textPrimary,
            fontWeight: 500,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.name}
        >
          {item.name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: SP.md, alignItems: 'center' }}>
        <button
          onClick={() => onEdit(item)}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.primary,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.primaryMid)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.primary)}
        >
          <i className="bi bi-pencil" style={{ fontSize: '16px' }} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#dc3545',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#c82333')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#dc3545')}
        >
          <i className="bi bi-trash" style={{ fontSize: '16px' }} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Employee Configuration"
        subtitle="Manage job profiles, employee types, levels, and statuses"
        icon="bi-person-badge"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
          {/* Job Profiles Section */}
          <ConfigSectionCard
            title="Job Profiles"
            description="Define different job profiles for employees"
            icon="bi-briefcase"
            iconColor="blue"
            badge={{ label: `${jobProfiles.length}`, color: C.info, bg: '#dbeafe' }}
          >
            <div style={{ marginTop: SP.md }}>
              {jobProfiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No job profiles created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {jobProfiles.map((jobProfile) => (
                    <ItemChip
                      key={jobProfile.id}
                      item={jobProfile}
                      onEdit={handleJobProfileEdit}
                      onDelete={(id: string) => handleDelete(id, 'JOB_PROFILE')}
                    />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleJobProfileModalOpen}
              style={{
                backgroundColor: C.info,
                color: '#fff',
                border: 'none',
                borderRadius: RADIUS.md,
                padding: `${SP.sm} ${SP.lg}`,
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: SP.lg,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0066b3';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 18px ${C.infoShadowMd || 'rgba(0, 133, 219, 0.3)'}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.info;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="bi bi-plus me-2" /> New Job Profile
            </button>
          </ConfigSectionCard>

          {/* Employee Types Section */}
          <ConfigSectionCard
            title="Employee Types"
            description="Classify employees by type (e.g., Full-time, Part-time)"
            icon="bi-people"
            iconColor="green"
            badge={{ label: `${employeeTypes.length}`, color: C.success, bg: '#dcfce7' }}
          >
            <div style={{ marginTop: SP.md }}>
              {employeeTypes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No employee types created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {employeeTypes.map((employeeType) => (
                    <ItemChip
                      key={employeeType.id}
                      item={employeeType}
                      onEdit={handleEmployeeTypeEdit}
                      onDelete={(id: string) => handleDelete(id, 'EMPLOYEE_TYPE')}
                    />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleEmployeeTypeModalOpen}
              style={{
                backgroundColor: C.success,
                color: '#fff',
                border: 'none',
                borderRadius: RADIUS.md,
                padding: `${SP.sm} ${SP.lg}`,
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: SP.lg,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#15803d';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 18px rgba(34, 197, 94, 0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.success;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="bi bi-plus me-2" /> New Employee Type
            </button>
          </ConfigSectionCard>

          {/* Employee Levels Section */}
          <ConfigSectionCard
            title="Employee Levels"
            description="Define organizational hierarchy levels"
            icon="bi-diagram-3"
            iconColor="purple"
            badge={{ label: `${employeeLevels.length}`, color: '#7c3aed', bg: '#ede9fe' }}
          >
            <div style={{ marginTop: SP.md }}>
              {employeeLevels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No employee levels created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {employeeLevels.map((employeeLevel) => (
                    <ItemChip
                      key={employeeLevel.id}
                      item={employeeLevel}
                      onEdit={handleEmployeeLevelEdit}
                      onDelete={(id: string) => handleDelete(id, 'EMPLOYEE_LEVEL')}
                    />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleEmployeeLevelModalOpen}
              style={{
                backgroundColor: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: RADIUS.md,
                padding: `${SP.sm} ${SP.lg}`,
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: SP.lg,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#6d28d9';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 18px rgba(124, 58, 237, 0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#7c3aed';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="bi bi-plus me-2" /> New Employee Level
            </button>
          </ConfigSectionCard>

          {/* Employee Status Section */}
          <ConfigSectionCard
            title="Employee Status"
            description="Track employee employment status"
            icon="bi-check-circle"
            iconColor="amber"
            badge={{ label: `${employeeStatuses.length}`, color: '#d97706', bg: '#fef3c7' }}
          >
            <div style={{ marginTop: SP.md }}>
              {employeeStatuses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No employee statuses created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {employeeStatuses.map((employeeStatus) => (
                    <ItemChip
                      key={employeeStatus.id}
                      item={employeeStatus}
                      onEdit={handleEmployeeStatusEdit}
                      onDelete={(id: string) => handleDelete(id, 'EMPLOYEE_STATUS')}
                    />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleEmployeeStatusModalOpen}
              style={{
                backgroundColor: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: RADIUS.md,
                padding: `${SP.sm} ${SP.lg}`,
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: SP.lg,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b45309';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 18px rgba(217, 119, 6, 0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#d97706';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="bi bi-plus me-2" /> New Employee Status
            </button>
          </ConfigSectionCard>
        </div>
      </ConfigPageLayout>

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
