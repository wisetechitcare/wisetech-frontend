import {
  fetchAllEmployeeConfigurations,
  deleteEmployeeConfigurationById,
  fetchAllOrganizationConfigurations,
  deleteOrganizationConfigurationById,
} from "@services/configurations";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
// The shared configuration delete: confirm → delete → announce, with the server's
// "still in use" refusal surfaced. Reusable by any Configure screen.
import { confirmAndDelete } from "@utils/configDelete";
import EmployeeConfigureForm from "./EmployeeConfigureForm";
import QualificationConfigureForm, { QualificationItem } from "./QualificationConfigureForm";
import JobProfileConfigureForm, { JobProfileItem } from "./JobProfileConfigureForm";
// The preset-task configure tree, reused verbatim — job profiles nest the same way.
import PresetTaskTree from "../tasks/configure/components/PresetTaskTree";
import { fetchQualificationMasters, deleteQualificationMaster } from "@services/employee";
import { fetchDesignations, archiveDesignationById } from "@services/options";
import { fetchCompanyOverview } from "@services/company";
import { resolveActiveOrgId } from "@utils/activeOrg";
import Loader from "@app/modules/common/utils/Loader";
import { ActionIconButton } from "@app/modules/common/components/ui";
import DepartmentConfigureForm, { DepartmentItem } from "./DepartmentConfigureForm";
import WorkingTypeConfigureForm, { WorkingTypeItem } from "./WorkingTypeConfigureForm";
import SourceOfHireConfigureForm, { SourceOfHireItem } from "./SourceOfHireConfigureForm";
import OnboardingDocConfigureForm, { OnboardingDocItem } from "./OnboardingDocConfigureForm";
import { fetchAllDepartments, archiveDepartmentById } from "@services/company";
import { fetchWorkingMethods, deleteWorkingMethodById, fetchOnboardingDocs, fetchSrcOfHire, deleteSourceOfHire } from "@services/options";
import OrganizationConfigureForm from "@pages/company/masters/components/OrganizationConfigureForm";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  ConfigSectionRail,
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
  { id: "job-profiles" },
  { id: "departments" },
  { id: "shifts" },
  { id: "working-types" },
  { id: "employee-types" },
  { id: "experience-levels" },
  { id: "onboarding-docs" },
  { id: "sources-of-hire" },
  { id: "qualifications" },
];

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
  /** Flips once the first load settles; from then on refreshes happen behind the content. */
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  /**
   * Every fetcher ends here, including the failed ones — a first load that errors should show
   * the page and its error, not a spinner with nothing behind it.
   */
  const finishLoading = () => {
    setLoading(false);
    setHasLoadedOnce(true);
  };

  /**
   * Which section the rail highlights. Every section is on the page at once, so this
   * only reflects what is in VIEW — it never decides what renders.
   */
  const [activeTab, setActiveTab] = useState(CONFIG_TABS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Stable per id, so the ref callback identity doesn't change between renders and
  // React isn't asked to detach and reattach every section on each update.
  const registerSection = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      sectionRefs.current[id] = element;
    },
    []
  );

  /**
   * Held true while a rail click's smooth scroll is in flight.
   *
   * Without it, jumping from the top of the page to the last section drags the
   * viewport through all six in between — the observer reports each one in turn and
   * the highlight strobes down the rail before landing. The scroll-spy is meant to
   * answer "what am I looking at", and during a jump the answer is already decided,
   * so it simply stops asking until the scroll settles.
   */
  const spyLockedRef = useRef(false);
  const spyTimersRef = useRef<number[]>([]);

  const scrollToSection = useCallback((id: string) => {
    const target = sectionRefs.current[id];
    if (!target) return;

    // Set it immediately so the click feels instant, and freeze it there for the ride.
    setActiveTab(id);
    spyLockedRef.current = true;
    spyTimersRef.current.forEach(window.clearTimeout);
    spyTimersRef.current = [];

    // Released when scrolling actually stops rather than after a guessed duration —
    // smooth-scroll timing varies with distance, and the last section is the longest
    // trip on the page. `capture` because scroll events do not bubble: this catches
    // them whether the page or an inner container is the thing scrolling.
    let settle = 0;
    const release = () => {
      window.removeEventListener('scroll', onScroll, true);
      window.clearTimeout(settle);
      window.clearTimeout(ceiling);
      spyLockedRef.current = false;
    };
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(release, 120);
      spyTimersRef.current.push(settle);
    };
    // Backstop for a click that scrolls nowhere (target already in view), and a hard
    // ceiling so a cancelled scroll can never strand the spy switched off.
    settle = window.setTimeout(release, 400);
    const ceiling = window.setTimeout(release, 2000);
    spyTimersRef.current.push(settle, ceiling);

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => () => spyTimersRef.current.forEach(window.clearTimeout), []);

  // Job Profile configurations
  const [jobProfiles, setJobProfiles] = useState<JobProfileItem[]>([]);
  const [showJobProfileModal, setShowJobProfileModal] = useState(false);
  const [editingJobProfile, setEditingJobProfile] = useState<JobProfileItem | null>(null);
  const [jobProfileCompanyId, setJobProfileCompanyId] = useState<string | undefined>(undefined);
  /** Set by the tree's [Add child] action — the profile a NEW one will be filed under. */
  const [jobProfileParent, setJobProfileParent] = useState<JobProfileItem | null>(null);

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

  // Sources of hire — company_source_of_hire, the onboarding "Source Of Hire" list.
  const [sourcesOfHire, setSourcesOfHire] = useState<SourceOfHireItem[]>([]);
  const [showSourceOfHireModal, setShowSourceOfHireModal] = useState(false);
  const [editingSourceOfHire, setEditingSourceOfHire] = useState<SourceOfHireItem | null>(null);
  const [sourceOfHireCompanyId, setSourceOfHireCompanyId] = useState<string | undefined>(undefined);

  // Shifts — an ORGANISATION configuration, the one section here that describes the
  // company rather than the employee. Rendered as a card like the rest: embedding the
  // Organization page instead brought its own ConfigPageLayout banner into the column.
  const [shifts, setShifts] = useState<EmployeeConfigItem[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<EmployeeConfigItem | null>(null);

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

  /**
   * Scroll-spy via IntersectionObserver — the platform primitive, same approach as
   * FaqsBoard. A scroll handler measuring every section with getBoundingClientRect
   * would force synchronous layout on each frame; this does the same job without it.
   *
   * The -60% bottom margin means a section stops counting once it has scrolled past
   * the upper third, so the highlight moves at the point the eye does rather than
   * clinging to a section still technically on screen.
   */
  useEffect(() => {
    const elements = CONFIG_TABS
      .map((tab) => sectionRefs.current[tab.id])
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // A rail click already decided the answer — don't narrate the trip there.
        if (spyLockedRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = (visible?.target as HTMLElement | undefined)?.dataset?.sectionId;
        if (id) setActiveTab(id);
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // Re-observed once the lists land: an empty section is shorter than a filled one,
    // so the boundaries the observer was given before the fetch are already stale.
  }, [jobProfiles.length, departments.length, workingTypes.length, employeeTypes.length,
      employeeLevels.length, onboardingDocs.length, qualifications.length, sourcesOfHire.length]);

  // Modal open handlers
  const handleJobProfileModalOpen = () => {
    setJobProfileParent(null);
    setShowJobProfileModal(true);
  };

  /** [Add child] on a tree row — the new profile is filed under that node. */
  const handleJobProfileAddChild = (parentId: string) => {
    setEditingJobProfile(null);
    setJobProfileParent(jobProfiles.find((profile) => profile.id === parentId) ?? null);
    setShowJobProfileModal(true);
  };
  const handleEmployeeTypeModalOpen = () => setShowEmployeeTypeModal(true);
  const handleEmployeeLevelModalOpen = () => setShowEmployeeLevelModal(true);

  // Modal close handlers
  const handleJobProfileModalClose = () => {
    setShowJobProfileModal(false);
    setEditingJobProfile(null);
    setJobProfileParent(null);
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
    setJobProfileParent(null);
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
      finishLoading();
    }
  };

  const handleQualificationDelete = (id: string) =>
    confirmAndDelete({
      label: "qualification",
      action: "archived",
      remove: () => deleteQualificationMaster(id),
      refresh: fetchQualifications,
    });

  /**
   * Job Profiles read from DESIGNATIONS — the table the onboarding "Job Profile"
   * dropdown actually uses. This card previously listed employee_configurations
   * (JOB_PROFILE), a separate table nothing consumed: anything created here never
   * reached the form, and the real designations could not be edited from this screen.
   * The column is `role`; it is mapped to `name` so the shared tree renders it unchanged.
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
          // The API returns the tree FLAT; `parentId` is what nests it. Null here is a
          // top-level profile, which is what all 24 existing rows are.
          parentId: d.parentId ?? null,
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
      finishLoading();
    }
  };

  // Shift handlers
  const handleShiftModalOpen = () => setShowShiftModal(true);
  const handleShiftModalClose = () => {
    setShowShiftModal(false);
    setEditingShift(null);
  };
  const handleShiftEdit = (shift: EmployeeConfigItem) => {
    setEditingShift(shift);
    setShowShiftModal(true);
  };

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await fetchAllOrganizationConfigurations("SHIFT");
      setShifts(response?.data?.organizationConfigurations || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      finishLoading();
    }
  };

  const handleShiftDelete = (id: string) =>
    confirmAndDelete({
      label: "shift",
      remove: () => deleteOrganizationConfigurationById(id),
      refresh: fetchShifts,
    });

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
      finishLoading();
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
      finishLoading();
    }
  };

  // The stray `fetchSourcesOfHire()` that used to trail the refresh here was a
  // copy-paste leftover — it reloaded an unrelated list and left this one stale on the
  // error path.
  const handleWorkingTypeDelete = (id: string) =>
    confirmAndDelete({
      label: "working location type",
      remove: () => deleteWorkingMethodById(id),
      refresh: fetchWorkingTypes,
    });

  const handleSourceOfHireModalOpen = () => setShowSourceOfHireModal(true);
  const handleSourceOfHireModalClose = () => {
    setShowSourceOfHireModal(false);
    setEditingSourceOfHire(null);
  };
  const handleSourceOfHireEdit = (item: SourceOfHireItem) => {
    setEditingSourceOfHire(item);
    setShowSourceOfHireModal(true);
  };

  const fetchSourcesOfHire = async () => {
    try {
      setLoading(true);
      const response = await fetchSrcOfHire();
      const rows = response?.data?.srcOfHire || [];
      // The column is `source`; mapped to `name` so ItemChip renders it unchanged.
      setSourcesOfHire(rows.map((s: any) => ({ id: s.id, name: s.source, companyId: s.companyId })));
      setSourceOfHireCompanyId(rows[0]?.companyId);
    } catch (error) {
      console.error("Error fetching sources of hire:", error);
    } finally {
      finishLoading();
    }
  };

  const handleSourceOfHireDelete = (id: string) =>
    confirmAndDelete({
      label: "source of hire",
      remove: () => deleteSourceOfHire(id),
      refresh: fetchSourcesOfHire,
    });

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
      finishLoading();
    }
  };

  const handleDepartmentDelete = (id: string) =>
    confirmAndDelete({
      label: "department",
      action: "archived",
      remove: () => archiveDepartmentById(id),
      refresh: fetchDepartments,
    });

  const handleJobProfileDelete = (id: string) =>
    confirmAndDelete({
      label: "job profile",
      action: "archived",
      remove: () => archiveDesignationById(id),
      refresh: fetchJobProfiles,
    });

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
      finishLoading();
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
      finishLoading();
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
    fetchShifts();
  }, []);

  // Delete handler
  const handleDelete = (
    id: string,
    type: "JOB_PROFILE" | "EMPLOYEE_TYPE" | "EMPLOYEE_LEVEL"
  ) => {
    const refresh = {
      JOB_PROFILE: fetchJobProfiles,
      EMPLOYEE_TYPE: fetchEmployeeTypes,
      EMPLOYEE_LEVEL: fetchEmployeeLevels,
    }[type];
    return confirmAndDelete({
      label: type.toLowerCase().replace("_", " "),
      remove: () => deleteEmployeeConfigurationById(id),
      refresh,
    });
  };

  // Only the FIRST load blanks the page. Every fetcher on this screen sets `loading`, so a
  // refetch after a save used to unmount the whole configuration — which reset each tree's
  // expanded set and sent the scroll back to the top, landing the user at screen one after
  // editing a job profile three screens down.
  if (loading && !hasLoadedOnce) {
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

  /**
   * Counts live here, not in the tab table, because they come from the fetched lists.
   * Shifts is the one section the rail cannot count — OrganizationConfigure owns that
   * data internally — so it is the only item without a number.
   */
  const railGroups = [
    {
      id: 'employee',
      label: 'Employee Configuration',
      items: [
        // Icons MUST match each section card's own `icon` below — the rail was drawn
        // with KTIcon glyphs while the cards use Bootstrap ones, so the same section
        // carried two different symbols and neither pointed at the other.
        { id: 'job-profiles', label: 'Job Profiles', icon: 'bi-briefcase', count: jobProfiles.length },
        { id: 'departments', label: 'Departments', icon: 'bi-diagram-2', count: departments.length },
        { id: 'working-types', label: 'Working Location Types', icon: 'bi-geo', count: workingTypes.length },
        { id: 'employee-types', label: 'Employee Types', icon: 'bi-people', count: employeeTypes.length },
        { id: 'experience-levels', label: 'Experience Levels', icon: 'bi-diagram-3', count: employeeLevels.length },
        { id: 'onboarding-docs', label: 'Onboarding Documents', icon: 'bi-file-earmark-text', count: onboardingDocs.length },
        { id: 'sources-of-hire', label: 'Sources of Hire', icon: 'bi-signpost-split', count: sourcesOfHire.length },
        { id: 'qualifications', label: 'Qualifications', icon: 'bi-mortarboard', count: qualifications.length },
      ],
    },
    {
      id: 'company',
      label: 'Company Configuration',
      items: [
        { id: 'shifts', label: 'Shifts', icon: 'bi-clock' },
      ],
    },
  ];

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ONE page banner, full width — then rail and sections side by side beneath it.
          The previous attempt nested a ConfigPageLayout (and the whole Organization
          page, banner and all) inside the flex child, so two page headers competed for
          the same column and squeezed the rail. This mirrors FaqsBoard: header, then
          `rail | stack of cards`. */}
      <ConfigPageLayout
        title="Configuration"
        subtitle="Everything the onboarding form offers, plus the company's shift list"
        icon="bi-sliders"
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 2, lg: 3 }, alignItems: 'flex-start' }}>
          <ConfigSectionRail
            groups={railGroups}
            activeId={activeTab}
            onChange={scrollToSection}
            ariaLabel="Configuration sections"
          />

          {/* minWidth: 0 lets the chip grids shrink instead of forcing the page wide. */}
          <Box sx={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: SP.lg }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
          {/* Group heading — mirrors the rail. Shifts is company-wide data, not part
              of the onboarding form, so it sits in its own band at the end of the
              scroll instead of interrupting the employee sections. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="h2"
              sx={{
                m: 0,
                fontFamily: FONT.body,
                fontSize: { xs: 15, md: 16 },
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: C.textPrimary,
                whiteSpace: 'nowrap',
              }}
            >
              Employee Configuration
            </Box>
            <Box sx={{ flex: 1, height: '1px', bgcolor: C.border }} />
          </Box>

          {/* Job Profiles Section */}
          <Box component="section" data-section-id="job-profiles" ref={registerSection('job-profiles')} sx={{ scrollMarginTop: '96px' }}>
          <ConfigSectionCard
            title="Job Profiles"
            description="Options offered in the onboarding Job Profile picker (also shown as Designations under Organization Profile)"
            icon="bi-briefcase"
            iconColor="primary"
            badge={{ label: `${jobProfiles.length}`, color: C.primary, bg: C.primaryLight }}
            primaryAction={{ label: 'New Job Profile', icon: 'bi-plus-lg', onClick: handleJobProfileModalOpen, variant: 'primary' }}
          >
            {/* The SAME tree the preset-task configure page uses. Job profiles have
                the same shape — one self-referencing table, `parentId` alone deciding
                where a node sits — so a flat grid of 24 chips was hiding a structure
                the names were already spelling out ("Associate", "Associate (D) (L1)",
                "(L2)", "(L3)"). Search, expand/collapse and the row actions come with
                it; only the nouns are passed in. */}
            <div style={{ marginTop: SP.md }}>
              <PresetTaskTree
                presetTasks={jobProfiles}
                onAddChild={handleJobProfileAddChild}
                onEditTask={handleJobProfileEdit}
                onDeleteTask={handleJobProfileDelete}
                labels={{
                  noun: 'job profile',
                  plural: 'job profiles',
                  kind: 'profile',
                  empty: 'No job profiles created yet',
                }}
              />
            </div>
          </ConfigSectionCard>
          </Box>

          {/* Departments Section — a chip card like every other tab. This used to embed
              the whole Departments PAGE, which brought its own banner and a full data
              table (search, export, pagination), so one tab in the strip looked like a
              different product. Code and description still exist — they live in the
              edit dialog rather than as table columns. */}
          <Box component="section" data-section-id="departments" ref={registerSection('departments')} sx={{ scrollMarginTop: '96px' }}>
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
          </Box>

          {/* Working Location Types — company_working_methods. This list had no
              management screen at all: only a bulk seed endpoint existed, so whatever
              a company shipped with could never be changed. The WORKING_TYPE entry
              under Organization Config looks like it belongs to this field but feeds
              nothing. */}
          <Box component="section" data-section-id="working-types" ref={registerSection('working-types')} sx={{ scrollMarginTop: '96px' }}>
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
          </Box>

          {/* Employee Types Section */}
          <Box component="section" data-section-id="employee-types" ref={registerSection('employee-types')} sx={{ scrollMarginTop: '96px' }}>
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
          </Box>

          {/* Experience Levels Section — EMPLOYEE_LEVEL is the stored enum; the form
              labels this "Experience Level", so the UI matches that, not the enum. */}
          <Box component="section" data-section-id="experience-levels" ref={registerSection('experience-levels')} sx={{ scrollMarginTop: '96px' }}>
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
          </Box>

          {/* Onboarding Documents — the uploads the onboarding form asks a new joiner
              for. Moved here from Organization → Onboarding Docs: they drive a step of
              this form, so configuring them from another module meant leaving the
              screen you were setting up.

              Replaces the Employee Status card, which configured a list nothing read —
              no dropdown rendered it, no employee had one set. */}
          <Box component="section" data-section-id="onboarding-docs" ref={registerSection('onboarding-docs')} sx={{ scrollMarginTop: '96px' }}>
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
          </Box>

          {/* Sources of Hire — company_source_of_hire, the onboarding "Source Of Hire"
              picker. Managed here rather than through a "+ Add" inside the form. */}
          <Box component="section" data-section-id="sources-of-hire" ref={registerSection('sources-of-hire')} sx={{ scrollMarginTop: '96px' }}>
          <ConfigSectionCard
            title="Sources of Hire"
            description="Options offered in the onboarding Source Of Hire picker"
            icon="bi-signpost-split"
            iconColor="primary"
            badge={{ label: `${sourcesOfHire.length}`, color: C.primary, bg: C.primaryLight }}
            primaryAction={{ label: 'New Source of Hire', icon: 'bi-plus-lg', onClick: handleSourceOfHireModalOpen, variant: 'primary' }}
          >
            <div style={{ marginTop: SP.md }}>
              {sourcesOfHire.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No sources of hire created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {sourcesOfHire.map((item) => (
                    <ItemChip
                      key={item.id}
                      item={item}
                      onEdit={handleSourceOfHireEdit}
                      onDelete={handleSourceOfHireDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </ConfigSectionCard>
          </Box>

          {/* Qualifications Section — drives the Education Details picker in onboarding */}
          <Box component="section" data-section-id="qualifications" ref={registerSection('qualifications')} sx={{ scrollMarginTop: '96px' }}>
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
          </Box>

          {/* Group heading — mirrors the rail. Shifts is company-wide data, not part
              of the onboarding form, so it sits in its own band at the end of the
              scroll instead of interrupting the employee sections. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <Box
              component="h2"
              sx={{
                m: 0,
                fontFamily: FONT.body,
                fontSize: { xs: 15, md: 16 },
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: C.textPrimary,
                whiteSpace: 'nowrap',
              }}
            >
              Company Configuration
            </Box>
            <Box sx={{ flex: 1, height: '1px', bgcolor: C.border }} />
          </Box>

          {/* Shifts — the Company Configuration group. Same card as the rest rather
              than the embedded Organization page, whose own banner competed with this
              page's for the column. */}
          <Box component="section" data-section-id="shifts" ref={registerSection('shifts')} sx={{ scrollMarginTop: '96px' }}>
          <ConfigSectionCard
            title="Shifts"
            description="Shift types employees are assigned to"
            icon="bi-clock"
            iconColor="primary"
            badge={{ label: `${shifts.length}`, color: C.primary, bg: C.primaryLight }}
            loading={loading}
            primaryAction={{ label: 'New Shift', icon: 'bi-plus-lg', onClick: handleShiftModalOpen, variant: 'primary' }}
          >
            <div style={{ marginTop: SP.md }}>
              {shifts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '14px' }}>No shifts created yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                  {shifts.map((shift) => (
                    <ItemChip
                      key={shift.id}
                      item={shift}
                      onEdit={handleShiftEdit}
                      onDelete={handleShiftDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </ConfigSectionCard>
          </Box>
        </div>
          </Box>
        </Box>
      </ConfigPageLayout>

      {/* Modals */}
      {/* Job Profile Modal — designations-backed, so it can't reuse EmployeeConfigureForm */}
      <JobProfileConfigureForm
        show={showJobProfileModal}
        onClose={handleJobProfileModalClose}
        onSuccess={fetchJobProfiles}
        initialData={editingJobProfile}
        isEditing={!!editingJobProfile}
        companyId={jobProfileCompanyId}
        parentId={jobProfileParent?.id}
        parentName={jobProfileParent?.name}
        // The whole list, so the form's Parent picker can offer every branch — this
        // is what lets an EXISTING profile be moved, which [Add child] cannot do.
        allProfiles={jobProfiles}
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

      {/* Shift Modal — reuses the Organization form, which already speaks SHIFT. */}
      <OrganizationConfigureForm
        show={showShiftModal}
        onClose={handleShiftModalClose}
        onSuccess={fetchShifts}
        initialData={editingShift}
        isEditing={!!editingShift}
        type="SHIFT"
        title="Shift"
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

      {/* Source of Hire Modal */}
      <SourceOfHireConfigureForm
        show={showSourceOfHireModal}
        onClose={handleSourceOfHireModalClose}
        onSuccess={fetchSourcesOfHire}
        initialData={editingSourceOfHire}
        isEditing={!!editingSourceOfHire}
        companyId={sourceOfHireCompanyId}
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
