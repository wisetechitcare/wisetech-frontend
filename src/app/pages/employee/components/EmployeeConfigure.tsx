import {
  fetchAllEmployeeConfigurations,
  deleteEmployeeConfigurationById,
} from "@services/configurations";
import { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation, errorConfirmation } from "@utils/modal";
import EmployeeConfigureForm from "./EmployeeConfigureForm";
import QualificationConfigureForm, { QualificationItem } from "./QualificationConfigureForm";
import JobProfileConfigureForm, { JobProfileItem } from "./JobProfileConfigureForm";
import { fetchQualificationMasters, deleteQualificationMaster } from "@services/employee";
import { fetchDesignations, archiveDesignationById } from "@services/options";
import { fetchCompanyOverview } from "@services/company";
import { resolveActiveOrgId } from "@utils/activeOrg";
import Loader from "@app/modules/common/utils/Loader";
import { ActionIconButton } from "@app/modules/common/components/ui";
import DepartmentConfigureForm, { DepartmentItem } from "./DepartmentConfigureForm";
import WorkingTypeConfigureForm, { WorkingTypeItem } from "./WorkingTypeConfigureForm";
import OnboardingDocConfigureForm, { OnboardingDocItem } from "./OnboardingDocConfigureForm";
import { fetchAllDepartments, archiveDepartmentById } from "@services/company";
import { fetchWorkingMethods, deleteWorkingMethodById, fetchOnboardingDocs } from "@services/options";
import OrganizationConfigure from "@pages/company/masters/OrganizationConfigure";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  ConfigTabStrip,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from "@app/modules/configuration";

/**
 * Every list the onboarding form offers, in the order the form asks for them.
 *
 * Shifts, Departments and Job Profiles moved here from Organization → Configure:
 * all three fill onboarding dropdowns, so editing them from a different module meant
 * hunting across two screens both labelled "Configure". Towns stayed behind — it feeds
 * a BRANCH, and onboarding only picks the finished branch.
 */
const CONFIG_TABS = [
  { id: "job-profiles", label: "Job Profiles", icon: "bi-briefcase" },
  { id: "departments", label: "Departments", icon: "bi-diagram-2" },
  { id: "shifts", label: "Shifts", icon: "bi-clock" },
  { id: "working-types", label: "Working Location Types", icon: "bi-geo" },
  { id: "employee-types", label: "Employee Types", icon: "bi-people" },
  { id: "experience-levels", label: "Experience Levels", icon: "bi-diagram-3" },
  { id: "onboarding-docs", label: "Onboarding Documents", icon: "bi-file-earmark-text" },
  { id: "qualifications", label: "Qualifications", icon: "bi-mortarboard" },
];

/** Tabs whose card lives in THIS page's own ConfigPageLayout. */
const OWN_TAB_IDS = CONFIG_TABS.map((t) => t.id).filter((id) => id !== "shifts");

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
  const [activeTab, setActiveTab] = useState(CONFIG_TABS[0].id);

  // Job Profile configurations
  const [jobProfiles, setJobProfiles] = useState<JobProfileItem[]>([]);
  const [showJobProfileModal, setShowJobProfileModal] = useState(false);
  const [editingJobProfile, setEditingJobProfile] = useState<JobProfileItem | null>(null);
  const [jobProfileCompanyId, setJobProfileCompanyId] = useState<string | undefined>(undefined);

  // Employee Type configurations
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeConfigItem[]>([]);
  const [showEmployeeTypeModal, setShowEmployeeTypeModal] = useState(false);
  const [editingEmployeeType, setEditingEmployeeType] = useState<EmployeeConfigItem | null>(null);

  // Employee Level configurations
  const [employeeLevels, setEmployeeLevels] = useState<EmployeeConfigItem[]>([]);
  const [showEmployeeLevelModal, setShowEmployeeLevelModal] = useState(false);
  const [editingEmployeeLevel, setEditingEmployeeLevel] = useState<EmployeeConfigItem | null>(null);


  // Working location types — company_working_methods, its own endpoints.
  const [workingTypes, setWorkingTypes] = useState<WorkingTypeItem[]>([]);
  const [showWorkingTypeModal, setShowWorkingTypeModal] = useState(false);
  const [editingWorkingType, setEditingWorkingType] = useState<WorkingTypeItem | null>(null);
  const [workingTypeCompanyId, setWorkingTypeCompanyId] = useState<string | undefined>(undefined);

  // Departments — own table/endpoints, not employee_configurations.
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null);
  const [departmentCompanyId, setDepartmentCompanyId] = useState<string | undefined>(undefined);

  // Onboarding documents — the uploads the onboarding form asks a new joiner for.
  const [onboardingDocs, setOnboardingDocs] = useState<OnboardingDocItem[]>([]);
  const [showOnboardingDocModal, setShowOnboardingDocModal] = useState(false);
  const [editingOnboardingDoc, setEditingOnboardingDoc] = useState<OnboardingDocItem | null>(null);
  const [onboardingDocCompanyId, setOnboardingDocCompanyId] = useState<string | undefined>(undefined);

  // Qualifications — own table/endpoints, not employee_configurations.
  const [qualifications, setQualifications] = useState<QualificationItem[]>([]);
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [editingQualification, setEditingQualification] = useState<QualificationItem | null>(null);

  // Modal open handlers
  const handleJobProfileModalOpen = () => setShowJobProfileModal(true);
  const handleEmployeeTypeModalOpen = () => setShowEmployeeTypeModal(true);
  const handleEmployeeLevelModalOpen = () => setShowEmployeeLevelModal(true);

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

  // Edit handlers
  const handleJobProfileEdit = (jobProfile: JobProfileItem) => {
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

  // Qualification handlers
  const handleQualificationModalOpen = () => setShowQualificationModal(true);
  const handleQualificationModalClose = () => {
    setShowQualificationModal(false);
    setEditingQualification(null);
  };
  const handleQualificationEdit = (qualification: QualificationItem) => {
    setEditingQualification(qualification);
    setShowQualificationModal(true);
  };

  const fetchQualifications = async () => {
    try {
      setLoading(true);
      const response = await fetchQualificationMasters();
      setQualifications(response?.data?.qualifications || []);
    } catch (error) {
      console.error("Error fetching qualifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualificationDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Successfully deleted qualification");
      if (!confirmed) return;
      await deleteQualificationMaster(id);
      fetchQualifications();
    } catch (error) {
      console.error("Error deleting qualification:", error);
    }
  };

  /**
   * Job Profiles read from DESIGNATIONS — the table the onboarding "Job Profile"
   * dropdown actually uses. This card previously listed employee_configurations
   * (JOB_PROFILE), a separate table nothing consumed: anything created here never
   * reached the form, and the real designations could not be edited from this screen.
   * The column is `role`; it is mapped to `name` so ItemChip renders it unchanged.
   */
  const fetchJobProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetchDesignations();
      const rows = response?.data?.designations || [];
      setJobProfiles(
        rows.map((d: any) => ({
          id: d.id,
          name: d.role ?? d.name ?? "",
          companyId: d.companyId,
          isActive: d.isActive,
        }))
      );

      // Creating one needs a companyId and the create schema requires it. Take it from
      // an existing row; fall back to the active org when the list is still empty.
      let resolved = rows[0]?.companyId as string | undefined;
      if (!resolved) {
        try {
          const { data: { companyOverview } } = await fetchCompanyOverview();
          resolved = resolveActiveOrgId(companyOverview) ?? undefined;
        } catch {
          resolved = undefined;
        }
      }
      setJobProfileCompanyId(resolved);
    } catch (error) {
      console.error("Error fetching job profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  // Onboarding document handlers
  const handleOnboardingDocModalOpen = () => setShowOnboardingDocModal(true);
  const handleOnboardingDocModalClose = () => {
    setShowOnboardingDocModal(false);
    setEditingOnboardingDoc(null);
  };
  const handleOnboardingDocEdit = (doc: OnboardingDocItem) => {
    setEditingOnboardingDoc(doc);
    setShowOnboardingDocModal(true);
  };

  const fetchOnboardingDocuments = async (company?: string) => {
    try {
      setLoading(true);
      // This endpoint is company-scoped, so it needs the id up front rather than
      // falling back after an empty list the way the others do.
      let owner = company || onboardingDocCompanyId;
      if (!owner) {
        const { data: { companyOverview } } = await fetchCompanyOverview();
        owner = resolveActiveOrgId(companyOverview) ?? undefined;
        setOnboardingDocCompanyId(owner);
      }
      if (!owner) return;

      const response = await fetchOnboardingDocs(owner);
      const rows = response?.data?.documents || [];
      // The column is `fieldName`; mapped to `name` so ItemChip renders it unchanged.
      setOnboardingDocs(
        rows.map((d: any) => ({
          id: d.id,
          name: d.fieldName,
          isEnabled: d.isEnabled,
          hasIdentityNumber: d.hasIdentityNumber,
          companyId: d.companyId,
        }))
      );
    } catch (error) {
      console.error("Error fetching onboarding documents:", error);
    } finally {
      setLoading(false);
    }
  };

  // Working location type handlers
  const handleWorkingTypeModalOpen = () => setShowWorkingTypeModal(true);
  const handleWorkingTypeModalClose = () => {
    setShowWorkingTypeModal(false);
    setEditingWorkingType(null);
  };
  const handleWorkingTypeEdit = (workingType: WorkingTypeItem) => {
    setEditingWorkingType(workingType);
    setShowWorkingTypeModal(true);
  };

  const fetchWorkingTypes = async () => {
    try {
      setLoading(true);
      const response = await fetchWorkingMethods();
      const rows = response?.data?.workingMethods || [];
      // The column is `type`; mapped to `name` so ItemChip renders it unchanged.
      setWorkingTypes(
        rows.map((w: any) => ({ id: w.id, name: w.type, companyId: w.companyId }))
      );
      setWorkingTypeCompanyId(rows[0]?.companyId);
    } catch (error) {
      console.error("Error fetching working location types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkingTypeDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Successfully deleted working location type");
      if (!confirmed) return;
      await deleteWorkingMethodById(id);
      fetchWorkingTypes();
    } catch (error: any) {
      // The server refuses while employees or attendance still reference it — that
      // message names the count, so show it rather than failing silently.
      errorConfirmation(
        error?.response?.data?.message || "Could not delete this working location type."
      );
    }
  };

  // Department handlers
  const handleDepartmentModalOpen = () => setShowDepartmentModal(true);
  const handleDepartmentModalClose = () => {
    setShowDepartmentModal(false);
    setEditingDepartment(null);
  };
  const handleDepartmentEdit = (department: DepartmentItem) => {
    setEditingDepartment(department);
    setShowDepartmentModal(true);
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetchAllDepartments();
      const rows = response?.data?.departments || [];
      setDepartments(
        rows.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          description: d.description,
          companyId: d.companyId,
          isActive: d.isActive,
        }))
      );

      // Same resolution as job profiles: the create schema requires a companyId, so
      // take it from an existing row and fall back to the active org when empty.
      let resolved = rows[0]?.companyId as string | undefined;
      if (!resolved) {
        try {
          const { data: { companyOverview } } = await fetchCompanyOverview();
          resolved = resolveActiveOrgId(companyOverview) ?? undefined;
        } catch {
          resolved = undefined;
        }
      }
      setDepartmentCompanyId(resolved);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Successfully deleted department");
      if (!confirmed) return;
      await archiveDepartmentById(id);
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
    }
  };

  const handleJobProfileDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Successfully deleted job profile");
      if (!confirmed) return;
      await archiveDesignationById(id);
      fetchJobProfiles();
    } catch (error) {
      console.error("Error deleting job profile:", error);
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

  // Event bus listeners
  useEventBus(EVENT_KEYS.employeeConfigCreated, () => {
    fetchJobProfiles();
    fetchEmployeeTypes();
    fetchEmployeeLevels();
  });

  useEventBus(EVENT_KEYS.employeeConfigUpdated, () => {
    fetchJobProfiles();
    fetchEmployeeTypes();
    fetchEmployeeLevels();
  });

  useEffect(() => {
    fetchJobProfiles();
    fetchEmployeeTypes();
    fetchEmployeeLevels();
    fetchQualifications();
    fetchDepartments();
    fetchWorkingTypes();
    fetchOnboardingDocuments();
  }, []);

  // Delete handler
  const handleDelete = async (
    id: string,
    type: "JOB_PROFILE" | "EMPLOYEE_TYPE" | "EMPLOYEE_LEVEL"
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
      <div style={{ display: 'flex', gap: SP.sm, alignItems: 'center', flexShrink: 0 }}>
        <ActionIconButton iconName="pencil" title="Edit" onClick={() => onEdit(item)} size="sm" />
        <ActionIconButton
          iconName="trash"
          title="Delete"
          tone="danger"
          onClick={() => onDelete(item.id)}
          size="sm"
        />
      </div>
    </div>
  );

  return (
    <>
      <style>{KEYFRAMES}</style>

      <ConfigTabStrip
        items={CONFIG_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        label="Onboarding configuration"
      />

      {/* Shifts still renders its OWN ConfigPageLayout, so it sits outside the one
          below — nesting it would stack two banners. */}
      {activeTab === 'shifts' && <OrganizationConfigure />}

      {OWN_TAB_IDS.includes(activeTab) && (
      <ConfigPageLayout
        title="Employee Configuration"
        subtitle="Options offered by the onboarding form's dropdowns"
        icon="bi-person-badge"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
          {/* Job Profiles Section */}
          {activeTab === 'job-profiles' && (
          <ConfigSectionCard
            title="Job Profiles"
            description="Options offered in the onboarding Job Profile picker (also shown as Designations under Organization Profile)"
            icon="bi-briefcase"
            iconColor="primary"
            badge={{ label: `${jobProfiles.length}`, color: C.primary, bg: C.primaryLight }}
            primaryAction={{ label: 'New Job Profile', icon: 'bi-plus-lg', onClick: handleJobProfileModalOpen, variant: 'primary' }}
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
                      onDelete={handleJobProfileDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </ConfigSectionCard>
          )}

          {/* Departments Section — a chip card like every other tab. This used to embed
              the whole Departments PAGE, which brought its own banner and a full data
              table (search, export, pagination), so one tab in the strip looked like a
              different product. Code and description still exist — they live in the
              edit dialog rather than as table columns. */}
          {activeTab === 'departments' && (
          <ConfigSectionCard
            title="Departments"
            description="Options offered in the onboarding Department picker"
            icon="bi-diagram-2"
            iconColor="primary"
            badge={{ label: `${departments.length}`, color: C.primary, bg: C.primaryLight }}
            loading={loading}
            primaryAction={{ label: 'New Department', icon: 'bi-plus-lg', onClick: handleDepartmentModalOpen, variant: 'primary' }}
          >
            <div style={{ marginTop: SP.md }}>
              {departments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No departments created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {departments.map((department) => (
                    <ItemChip
                      key={department.id}
                      item={department}
                      onEdit={handleDepartmentEdit}
                      onDelete={handleDepartmentDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </ConfigSectionCard>
          )}

          {/* Working Location Types — company_working_methods. This list had no
              management screen at all: only a bulk seed endpoint existed, so whatever
              a company shipped with could never be changed. The WORKING_TYPE entry
              under Organization Config looks like it belongs to this field but feeds
              nothing. */}
          {activeTab === 'working-types' && (
          <ConfigSectionCard
            title="Working Location Types"
            description="Options offered in the onboarding Working Location Type picker"
            icon="bi-geo"
            iconColor="primary"
            badge={{ label: `${workingTypes.length}`, color: C.primary, bg: C.primaryLight }}
            loading={loading}
            primaryAction={{ label: 'New Working Location Type', icon: 'bi-plus-lg', onClick: handleWorkingTypeModalOpen, variant: 'primary' }}
          >
            <div style={{ marginTop: SP.md }}>
              {workingTypes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No working location types created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {workingTypes.map((workingType) => (
                    <ItemChip
                      key={workingType.id}
                      item={workingType}
                      onEdit={handleWorkingTypeEdit}
                      onDelete={handleWorkingTypeDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </ConfigSectionCard>
          )}

          {/* Employee Types Section */}
          {activeTab === 'employee-types' && (
          <ConfigSectionCard
            title="Employee Types"
            description="Classify employees by type (e.g., Full-time, Part-time)"
            icon="bi-people"
            iconColor="primary"
            badge={{ label: `${employeeTypes.length}`, color: C.primary, bg: C.primaryLight }}
            primaryAction={{ label: 'New Employee Type', icon: 'bi-plus-lg', onClick: handleEmployeeTypeModalOpen, variant: 'primary' }}
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
          </ConfigSectionCard>
          )}

          {/* Experience Levels Section — EMPLOYEE_LEVEL is the stored enum; the form
              labels this "Experience Level", so the UI matches that, not the enum. */}
          {activeTab === 'experience-levels' && (
          <ConfigSectionCard
            title="Experience Levels"
            description="Options offered in the onboarding Experience Level picker"
            icon="bi-diagram-3"
            iconColor="primary"
            badge={{ label: `${employeeLevels.length}`, color: C.primary, bg: C.primaryLight }}
            primaryAction={{ label: 'New Experience Level', icon: 'bi-plus-lg', onClick: handleEmployeeLevelModalOpen, variant: 'primary' }}
          >
            <div style={{ marginTop: SP.md }}>
              {employeeLevels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No experience levels created yet</p>
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
          </ConfigSectionCard>
          )}

          {/* Onboarding Documents — the uploads the onboarding form asks a new joiner
              for. Moved here from Organization → Onboarding Docs: they drive a step of
              this form, so configuring them from another module meant leaving the
              screen you were setting up.

              Replaces the Employee Status card, which configured a list nothing read —
              no dropdown rendered it, no employee had one set. */}
          {activeTab === 'onboarding-docs' && (
          <ConfigSectionCard
            title="Onboarding Documents"
            description="Documents the onboarding form asks a new employee to upload"
            icon="bi-file-earmark-text"
            iconColor="primary"
            badge={{ label: `${onboardingDocs.length}`, color: C.primary, bg: C.primaryLight }}
            loading={loading}
            primaryAction={{ label: 'New Onboarding Document', icon: 'bi-plus-lg', onClick: handleOnboardingDocModalOpen, variant: 'primary' }}
          >
            <div style={{ marginTop: SP.md }}>
              {onboardingDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No onboarding documents created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {onboardingDocs.map((doc) => (
                    <ItemChip
                      key={doc.id}
                      item={doc}
                      onEdit={handleOnboardingDocEdit}
                      onDelete={undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </ConfigSectionCard>
          )}

          {/* Qualifications Section — drives the Education Details picker in onboarding */}
          {activeTab === 'qualifications' && (
          <ConfigSectionCard
            title="Qualifications"
            description="Options offered in the onboarding Education Details picker"
            icon="bi-mortarboard"
            iconColor="primary"
            badge={{ label: `${qualifications.length}`, color: C.primary, bg: C.primaryLight }}
            primaryAction={{ label: 'New Qualification', icon: 'bi-plus-lg', onClick: handleQualificationModalOpen, variant: 'primary' }}
          >
            <div style={{ marginTop: SP.md }}>
              {qualifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No qualifications created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {qualifications.map((qualification) => (
                    <ItemChip
                      key={qualification.id}
                      item={qualification}
                      onEdit={handleQualificationEdit}
                      onDelete={handleQualificationDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </ConfigSectionCard>
          )}
        </div>
      </ConfigPageLayout>
      )}

      {/* Modals */}
      {/* Job Profile Modal — designations-backed, so it can't reuse EmployeeConfigureForm */}
      <JobProfileConfigureForm
        show={showJobProfileModal}
        onClose={handleJobProfileModalClose}
        onSuccess={fetchJobProfiles}
        initialData={editingJobProfile}
        isEditing={!!editingJobProfile}
        companyId={jobProfileCompanyId}
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
        title="Experience Level"
      />

      {/* Onboarding Document Modal */}
      <OnboardingDocConfigureForm
        show={showOnboardingDocModal}
        onClose={handleOnboardingDocModalClose}
        onSuccess={() => fetchOnboardingDocuments()}
        initialData={editingOnboardingDoc}
        isEditing={!!editingOnboardingDoc}
        companyId={onboardingDocCompanyId}
      />

      {/* Working Location Type Modal */}
      <WorkingTypeConfigureForm
        show={showWorkingTypeModal}
        onClose={handleWorkingTypeModalClose}
        onSuccess={fetchWorkingTypes}
        initialData={editingWorkingType}
        isEditing={!!editingWorkingType}
        companyId={workingTypeCompanyId}
      />

      {/* Department Modal — departments carry a code and description, so they can't
          reuse the name-only forms. */}
      <DepartmentConfigureForm
        show={showDepartmentModal}
        onClose={handleDepartmentModalClose}
        onSuccess={fetchDepartments}
        initialData={editingDepartment}
        isEditing={!!editingDepartment}
        companyId={departmentCompanyId}
      />

      {/* Qualification Modal */}
      <QualificationConfigureForm
        show={showQualificationModal}
        onClose={handleQualificationModalClose}
        onSuccess={fetchQualifications}
        initialData={editingQualification}
        isEditing={!!editingQualification}
      />
    </>
  );
};

export default EmployeeConfigure;
