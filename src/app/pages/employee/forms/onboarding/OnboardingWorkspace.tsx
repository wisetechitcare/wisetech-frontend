import React, { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import dayjs from "dayjs";

import {
  PersonOutlined,
  ContactPhoneOutlined,
  SchoolOutlined,
  GroupsOutlined,
  HealthAndSafetyOutlined,
  AccountBalanceOutlined,
  PlaceOutlined,
  RestaurantOutlined,
  BadgeOutlined,
  BusinessCenterOutlined,
  WorkHistoryOutlined,
  EventAvailableOutlined,
  SupervisorAccountOutlined,
  PaymentsOutlined,
  ReceiptLongOutlined,
  AdminPanelSettingsOutlined,
  VisibilityOffOutlined,
  UploadFileOutlined,
  PersonOutlineOutlined,
  ApartmentOutlined,
  TuneOutlined,
  FolderOutlined,
} from "@mui/icons-material";

import { fetchAllEmployees, fetchDocumentsField, getAllEmployeeLevels } from "@services/employee";
import { fetchCompanyOverview, fetchOrganizationTree } from "@services/company";
import {
  fetchBranches,
  fetchDepartments,
  fetchDesignations,
  fetchSrcOfHire,
  fetchWorkingMethods,
} from "@services/options";
import { fetchAllEmployeeConfigurations, fetchAllOrganizationConfigurations } from "@services/configurations";
import { getAllTeams } from "@services/projects";
import { fetchRoles } from "@services/roles";
import { cachedRequest } from "@services/_requestCache";
import { resolveActiveOrgId } from "@utils/activeOrg";
import OnboardingWizard, { OnboardingGroup } from "./OnboardingWizard";
import * as S from "./OnboardingSections";
import type { OnboardingSectionsProps } from "./OnboardingSections";
import { formatBloodGroup } from "@utils/employeeFormat";

/**
 * Employee Onboarding wizard configuration.
 *
 * The legacy shell rendered TWO competing navigation systems at once — a
 * Metronic horizontal stepper for the 4 macro-steps AND a separate left rail for
 * the sub-sections inside the active step — so "where am I" had two conflicting
 * answers and progress was split across both.
 *
 * The hierarchy itself was right; only its presentation was. So it is preserved
 * in full (4 groups × 19 sections, unchanged) and collapsed into ONE timeline:
 * a tree in the sidebar, parents with their children nested underneath. Nothing
 * lives above the canvas any more.
 */

export interface OnboardingWorkspaceProps extends OnboardingSectionsProps {
  /** Blank-form defaults, so progress counts entered data rather than defaults. */
  defaultValues?: any;
  isSubmitting: boolean;
  onCancel: () => void;
  onFinalSave: () => void;
  headerName?: string;
}

const createInitialDocumentInfo = (documentId: string) => ({
  identityNumber: "",
  employeeId: "",
  documentId,
  path: "",
  fileName: "",
});

/**
 * The row to show for one document type — i.e. what the employee already has on file.
 *
 * A type can own SEVERAL saved rows: every save without a row `id` inserts a new
 * EmployeeDocuments record rather than updating, so re-uploading a document leaves the
 * earlier rows behind. Taking the first match would surface whichever the API happened to
 * return first — often an older, or empty, row — and the field would read "Not attached"
 * on an employee who plainly has the document. Prefer rows that carry a file, newest
 * first; the same "latest wins" rule the Aadhaar/PAN save path already applies.
 */
const pickSavedDocumentRow = (rows: any[], documentId: string) => {
  const matches = rows.filter((r) => r?.documentId === documentId);
  if (matches.length <= 1) return matches[0];

  const weight = (r: any) => (r?.path || r?.fileName ? 2 : r?.identityNumber ? 1 : 0);
  const time = (r: any) => new Date(r?.createdAt ?? 0).getTime() || 0;

  return matches
    .slice()
    .sort((a, b) => weight(b) - weight(a) || time(b) - time(a))[0];
};

const fmtDate = (v?: string) => (v && dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : "");

/** The three request types every employee needs an approval chain for. */
const APPROVAL_WORKFLOW_TYPES = ["attendance", "leave", "reimbursement"] as const;

const hasValue = (v: any) => v !== undefined && v !== null && String(v).trim() !== "";

/* ── Summary lookups ──────────────────────────────────────────────────────────
   The form stores IDs; the summary has to show names. Without these the panel
   could only say "✓ Set" against Designation, Department, Branch, Team, Reports
   To and App Role — which tells the admin a field is filled but not what with,
   and is exactly what made the panel look thin.

   Every list is fetched once, through the shared request cache, and every failure
   degrades to "no map" rather than breaking the wizard — `fetchRoles` in
   particular is admin-gated and 403s for non-admin accounts. */
type LabelMap = Record<string, string>;

const LOOKUP_TTL_MS = 5 * 60 * 1000;

const toLabelMap = (rows: any[] | undefined, labelKey: string): LabelMap =>
  (rows || []).reduce((acc: LabelMap, row: any) => {
    if (row?.id) acc[String(row.id)] = String(row[labelKey] ?? "");
    return acc;
  }, {});

interface SummaryLookups {
  designation: LabelMap;
  department: LabelMap;
  branch: LabelMap;
  team: LabelMap;
  workingMethod: LabelMap;
  employeeType: LabelMap;
  shift: LabelMap;
  experienceLevel: LabelMap;
  employeeLevel: LabelMap;
  sourceOfHire: LabelMap;
  employee: LabelMap;
  role: LabelMap;
}

const EMPTY_LOOKUPS: SummaryLookups = {
  designation: {}, department: {}, branch: {}, team: {}, workingMethod: {},
  employeeType: {}, shift: {}, experienceLevel: {}, employeeLevel: {},
  sourceOfHire: {}, employee: {}, role: {},
};

function useSummaryLookups(): SummaryLookups {
  const [lookups, setLookups] = useState<SummaryLookups>(EMPTY_LOOKUPS);

  useEffect(() => {
    let cancelled = false;

    const map = async (key: string, fn: () => Promise<any>, pick: (res: any) => LabelMap) => {
      try {
        return pick(await cachedRequest(key, fn, LOOKUP_TTL_MS));
      } catch {
        return {} as LabelMap;
      }
    };

    async function load() {
      const [
        designation, department, branch, team, workingMethod, employeeType,
        shift, experienceLevel, employeeLevel, sourceOfHire, employee, role,
      ] = await Promise.all([
        map("summary:designations", fetchDesignations, (r) => toLabelMap(r?.data?.designations, "role")),
        map("summary:departments", fetchDepartments, (r) => toLabelMap(r?.data?.departments, "name")),
        map("summary:branches", fetchBranches, (r) => toLabelMap(r?.data?.branches, "name")),
        map("summary:teams", () => getAllTeams(1, 1000), (r) => toLabelMap(r?.data?.teams, "name")),
        map("summary:workingMethods", fetchWorkingMethods, (r) => toLabelMap(r?.data?.workingMethods, "type")),
        map("summary:employeeTypes", () => fetchAllEmployeeConfigurations("EMPLOYEE_TYPE"), (r) => toLabelMap(r?.data?.employeeConfigurations, "name")),
        map("summary:shifts", () => fetchAllOrganizationConfigurations("SHIFT"), (r) => toLabelMap(r?.data?.organizationConfigurations, "name")),
        map("summary:experienceLevels", () => fetchAllEmployeeConfigurations("EMPLOYEE_LEVEL"), (r) => toLabelMap(r?.data?.employeeConfigurations, "name")),
        map("summary:employeeLevels", () => getAllEmployeeLevels(1, 1000), (r) => toLabelMap(r?.data?.employeeLevels, "name")),
        map("summary:sourceOfHire", fetchSrcOfHire, (r) => toLabelMap(r?.data?.srcOfHire, "source")),
        map("summary:employees", fetchAllEmployees, (r) =>
          (r?.data?.employees || []).reduce((acc: LabelMap, emp: any) => {
            if (emp?.id) acc[String(emp.id)] = `${emp.users?.firstName ?? ""} ${emp.users?.lastName ?? ""}`.trim();
            return acc;
          }, {} as LabelMap)
        ),
        map("summary:roles", fetchRoles, (r) => toLabelMap(Array.isArray(r?.data) ? r.data : [], "name")),
      ]);

      if (cancelled) return;
      setLookups({
        designation, department, branch, team, workingMethod, employeeType,
        shift, experienceLevel, employeeLevel, sourceOfHire, employee, role,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return lookups;
}

const GENDER_LABELS: LabelMap = { "0": "Male", "1": "Female", "2": "Others" };
const MARITAL_LABELS: LabelMap = { "0": "Married", "1": "Unmarried" };

export const OnboardingWorkspace: React.FC<OnboardingWorkspaceProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();

  // ── The company's configured document types ──────────────────────────────
  //
  // Held in REACT state, not Formik, because it is server configuration rather
  // than form data — and because Formik cannot hold it reliably: the wizard runs
  // with `enableReinitialize`, so the moment the edit-mode employee record lands
  // Formik resets `values` to `initialValues`, discarding anything an effect had
  // written into it. `documentFields` was written exactly that way and wiped
  // exactly that way, which is why Upload Documents rendered nothing but its
  // notice on every existing employee. This state survives any number of resets;
  // the sync effect below re-seeds Formik from it whenever one happens.
  const [docConfig, setDocConfig] = useState<any[]>([]);

  // id → name maps so the summary can name what was chosen, not just tick it.
  const lookups = useSummaryLookups();

  useEffect(() => {
    let cancelled = false;

    async function loadDocumentTypes() {
      // Scope to the same organization the Company → Onboarding Docs screen
      // writes to (its root org), so the wizard shows THIS company's document
      // types. Unscoped, the backend's `where` clause skips the filter entirely
      // and every company's types come back.
      let companyId: string | undefined;
      try {
        const {
          data: { companyOverview },
        } = await fetchCompanyOverview();
        companyId = resolveActiveOrgId(companyOverview);
      } catch {
        // Fall through unscoped rather than showing nothing.
      }

      try {
        const {
          data: { documents = [] },
        } = await fetchDocumentsField(companyId);
        if (cancelled) return;
        // Disabled types are configuration that exists but is switched off — the
        // wizard must not ask for them.
        setDocConfig(documents.filter((doc: any) => doc.isEnabled));
      } catch {
        // A failed lookup must not break the wizard — the section renders empty.
      }
    }

    loadDocumentTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror the configuration into Formik, and KEEP it mirrored.
  //
  // Runs on every values change and repairs any divergence, so it covers all three
  // ways the two can drift apart: the initial fetch, a reinitialize that wipes
  // `documentFields`, and a document type added or removed in Onboarding Docs since
  // this form was opened.
  //
  // `documentInfo` is rebuilt to one row per configured type, CARRYING OVER the
  // employee's saved row for that type — that is what makes an existing upload show up
  // pre-filled (file name, View link, identity number) instead of as an empty field on
  // an employee who already submitted it. Rows for types no longer configured drop out
  // of the form; they stay in the database untouched.
  //
  // Terminates because "in sync" is checked before writing: once written, the next pass
  // matches and no further writes are made.
  useEffect(() => {
    if (docConfig.length === 0) return;

    const fields = Array.isArray(values.documentFields) ? values.documentFields : [];
    if (
      fields.length !== docConfig.length ||
      !docConfig.every((doc, i) => fields[i]?.id === doc.id)
    ) {
      setFieldValue("documentFields", docConfig, false);
    }

    const rows = Array.isArray(values.documentInfo) ? values.documentInfo : [];
    if (
      rows.length !== docConfig.length ||
      !docConfig.every((doc, i) => rows[i]?.documentId === doc.id)
    ) {
      setFieldValue(
        "documentInfo",
        docConfig.map(
          (doc) => pickSavedDocumentRow(rows, doc.id) ?? createInitialDocumentInfo(doc.id)
        ),
        false
      );
    }
  }, [docConfig, values.documentFields, values.documentInfo, setFieldValue]);

  // `organizationId` has no column on the employee record — it is DERIVED:
  // branch → companyId → walk the org tree to find that node's root parent.
  //
  // That derivation used to live in an effect inside EmployeeInfo, which only
  // mounts while the user is standing on the Employee Information section. Now
  // that the wizard renders ONE section at a time but validates the WHOLE form
  // on save, a field populated by an unmounted component reads as empty — which
  // is why saving from any other section reported "Organization is a required
  // field" on an employee that plainly had one. Hydrate it at wizard level, the
  // same seam that already owns the documentFields lookup above.
  useEffect(() => {
    if (!props.editMode) return;
    let cancelled = false;

    async function deriveOrganization() {
      if (values.organizationId) return;
      if (!values.branchId && !values.companyId) return;

      try {
        const [treeRes, branchRes] = await Promise.all([
          fetchOrganizationTree(),
          fetchBranches(),
        ]);
        if (cancelled) return;

        const orgTree = treeRes?.data?.organizations ?? [];
        const branches = branchRes?.data?.branches ?? [];
        const companyId =
          branches.find((b: any) => b.id === values.branchId)?.companyId || values.companyId;
        if (!companyId) return;

        // Flatten so the node and its parent are findable in one pass.
        const flat: { id: string; parentId: string | null }[] = [];
        const walk = (nodes: any[], parentId: string | null) =>
          nodes.forEach((n) => {
            flat.push({ id: n.id, parentId });
            walk(n.children || [], n.id);
          });
        walk(orgTree, null);

        const node = flat.find((f) => f.id === companyId);
        if (!node) return;

        // Validate once, on the last write — validating each call in turn would
        // re-raise the required error against a snapshot that is still stale.
        if (node.parentId) {
          setFieldValue("organizationId", node.parentId, false);
          setFieldValue("subOrganizationId", node.id, true);
        } else {
          setFieldValue("organizationId", node.id, true);
        }
      } catch {
        // Leave unset — EmployeeInfo still derives it on mount as a fallback.
      }
    }

    deriveOrganization();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editMode, values.branchId, values.companyId]);

  const groups: OnboardingGroup[] = useMemo(
    () => [
      {
        id: "personal",
        label: "Personal Details",
        icon: <PersonOutlineOutlined />,
        children: [
          {
            id: "personal-info",
            label: "Personal Information",
            title: "Personal Information",
            subtitle: "Photo, legal name and key dates",
            icon: <PersonOutlined />,
            fields: [
              "avatar",
              "firstName",
              "lastName",
              "dateOfBirth",
              "gender",
              "maritalStatus",
              "anniversary",
              "bloodGroup",
            ],
            requiredFields: ["firstName", "lastName", "dateOfBirth", "gender"],
            render: (p) => <S.PersonalInfoSection {...p} />,
          },
          {
            id: "contact-info",
            label: "Contact Information",
            title: "Contact Information",
            subtitle: "Personal email, phone and social profiles",
            icon: <ContactPhoneOutlined />,
            fields: [
              "personalEmailId",
              "personalPhoneNumber",
              "personalPhoneNumberExtension",
              "alternatePhoneNumber",
              "linkedInProfileUrl",
              "instagramProfileUrl",
              "facebookProfileUrl",
            ],
            requiredFields: ["personalEmailId", "personalPhoneNumber"],
            render: (p) => <S.ContactInfoSection {...p} />,
          },
          {
            id: "education",
            label: "Education Details",
            title: "Education Details",
            subtitle: "Qualifications, institutes and certificates",
            icon: <SchoolOutlined />,
            fields: ["educationalInfo"],
            render: (p) => <S.EducationSection {...p} />,
          },
          {
            id: "family",
            label: "Family Details",
            title: "Family Details",
            subtitle: "Dependants and relatives on record",
            icon: <GroupsOutlined />,
            fields: ["familyInfo"],
            requiredFields: ["familyInfo"],
            render: (p) => <S.FamilySection {...p} />,
          },
          {
            id: "emergency",
            label: "Health & Emergency Info",
            title: "Health & Emergency Info",
            subtitle: "Blood group, allergies and who to call",
            icon: <HealthAndSafetyOutlined />,
            fields: ["emergencyDetails"],
            render: (p) => <S.EmergencySection {...p} />,
          },
          {
            id: "bank",
            label: "Bank Details",
            title: "Bank Details",
            subtitle: "Salary account and supporting proof",
            icon: <AccountBalanceOutlined />,
            fields: ["bankInfo"],
            render: (p) => <S.BankSection {...p} />,
          },
          {
            id: "address",
            label: "Address Details",
            title: "Address Details",
            subtitle: "Present and permanent address",
            icon: <PlaceOutlined />,
            fields: ["addressInfo"],
            requiredFields: ["addressInfo"],
            render: (p) => <S.AddressSection {...p} />,
          },
          {
            id: "meal",
            label: "Additional Details",
            title: "Additional Details",
            subtitle: "Dietary preference",
            icon: <RestaurantOutlined />,
            fields: ["meal"],
            render: (p) => <S.AdditionalDetailsSection {...p} />,
          },
        ],
      },
      {
        id: "company",
        label: "Company Details",
        icon: <ApartmentOutlined />,
        children: [
          {
            id: "employee_info",
            label: "Employee Information",
            title: "Employee Information",
            subtitle: "Organization, designation, department and team",
            icon: <BadgeOutlined />,
            fields: [
              "organizationId",
              "subOrganizationId",
              "designationId",
              "departmentId",
              "branchId",
              "teamId",
              "employeeTypeId",
              "employeeTypeConfigId",
              "workingMethodId",
            ],
            requiredFields: [
              "organizationId",
              "designationId",
              "departmentId",
              "branchId",
              "teamId",
            ],
            render: (p) => <S.EmployeeInfoSection {...p} />,
          },
          {
            id: "contact_info",
            label: "Work Contact Details",
            title: "Work Contact Details",
            subtitle: "Company email and phone",
            icon: <ContactPhoneOutlined />,
            fields: ["companyEmailId", "companyPhoneNumber", "companyPhoneExtension"],
            render: (p) => <S.WorkContactSection {...p} />,
          },
          {
            id: "hiring_info",
            label: "Hiring Information",
            title: "Hiring Information",
            subtitle: "Source of hire, joining date and rejoin history",
            icon: <BusinessCenterOutlined />,
            fields: [
              "sourceOfHireId",
              "referredById",
              "dateOfJoining",
              "dateOfExit",
              "rejoinHistory",
              "employeeStatusId",
              "employeeStatusConfigId",
            ],
            requiredFields: ["dateOfJoining"],
            render: (p) => <S.HiringSection {...p} />,
          },
          {
            id: "work_experience",
            label: "Work Experience",
            title: "Work Experience",
            subtitle: "Prior employers — optional",
            icon: <WorkHistoryOutlined />,
            fields: ["workExpInfo"],
            render: (p) => <S.WorkExperienceSection {...p} />,
          },
          {
            id: "leave_settings",
            label: "Leave Settings",
            title: "Leave Settings",
            subtitle: "Allocations for the selected branch",
            icon: <EventAvailableOutlined />,
            fields: ["leaveAllocations"],
            render: (p) => <S.LeaveSettingsSection {...p} />,
          },
        ],
      },
      {
        id: "app-settings",
        label: "App Settings",
        icon: <TuneOutlined />,
        children: [
          {
            id: "reporting",
            label: "Reporting",
            title: "Reporting",
            subtitle: "Who this employee reports to",
            icon: <SupervisorAccountOutlined />,
            fields: ["reportsToId"],
            render: (p) => <S.ReportingSection {...p} />,
          },
          {
            id: "financial",
            label: "Financial Config",
            title: "Financial Configuration",
            subtitle: "CTC, professional fees, TDS and retention",
            icon: <PaymentsOutlined />,
            fields: [
              "ctcInLpa",
              "professionalFeesEnabled",
              "professionalFeesType",
              "professionalFeesAmount",
              "professionalFeesPercentage",
              "tds2Enabled",
              "tds2Type",
              "tds2Amount",
              "tds2Percentage",
              "retentionEnabled",
              "retentionStartDate",
              "retentionEndDate",
              "retentionType",
              "retentionAmount",
              "retentionPercentage",
            ],
            // CTC is optional and may legitimately be zero, so nothing here blocks.
            render: (p) => <S.FinancialSection {...p} />,
          },
          {
            id: "reimbursement",
            label: "Reimbursement",
            title: "Reimbursement",
            subtitle: "Per-request claim ceiling",
            icon: <ReceiptLongOutlined />,
            fields: ["reimbursementLimitPerRequest"],
            render: (p) => <S.ReimbursementSection {...p} />,
          },
          {
            id: "access",
            label: "System Access",
            title: "System Access",
            subtitle: "App role and account state",
            icon: <AdminPanelSettingsOutlined />,
            fields: ["appRole", "isEmployeeActive", "approvalChains"],
            requiredFields: ["appRole"],
            // Approval Settings carries a required mark, so it has to hold Continue the
            // way every other required field does — `requiredFields` cannot express it,
            // because "approvalChains has something in it" is not the same as "all three
            // request types have a Level 1 approver".
            //
            // Create mode only: while editing, the chains are persisted server-side and
            // never mirrored into `values`, so testing them here would block navigation
            // on an employee whose chains are perfectly well configured. That path has
            // its own gate — the wizard verifies them against the backend before saving.
            isComplete: props.editMode
              ? undefined
              : (v: any) =>
                  hasValue(v?.appRole) &&
                  APPROVAL_WORKFLOW_TYPES.every((type) => Boolean(v?.approvalChains?.[type]?.[0])),
            render: (p) => <S.SystemAccessSection {...p} />,
          },
          {
            id: "privacy",
            label: "Privacy Controls",
            title: "Privacy Controls",
            subtitle: "Directory discoverability",
            icon: <VisibilityOffOutlined />,
            fields: ["isHiddenFromStaff"],
            render: (p) => <S.PrivacySection {...p} />,
          },
        ],
      },
      {
        id: "documents",
        label: "Documents",
        icon: <FolderOutlined />,
        children: [
          {
            id: "upload_docs",
            label: "Upload Documents",
            title: "Upload Documents",
            subtitle: "Identity and statutory documents on file",
            icon: <UploadFileOutlined />,
            fields: ["documentInfo"],
            render: (p) => <S.DocumentsSection {...p} />,
          },
        ],
      },
    ],
    // `editMode` decides whether System Access enforces the approval chains, so the
    // tree has to be rebuilt if it ever changes.
    [props.editMode]
  );

  /**
   * Comprehensive summary: every essential and required field, across all sections
   * — not just the one on screen.
   *
   * Two rules keep it honest:
   *   · A row appears only once its field holds something, so the panel grows as the
   *     admin works rather than showing a wall of blanks.
   *   · A row shows the VALUE, never a checkmark. "Designation ✓ Set" told the admin
   *     nothing they could verify; `lookups` resolves the stored id to its name, and
   *     the row is skipped entirely while the lookup is still loading or was denied.
   */
  const summaryRows = (v: any) => {
    const rows: Array<{ label: string; value: React.ReactNode; isStrong?: boolean }> = [];

    const push = (label: string, value: React.ReactNode, isStrong = false) => {
      if (value === undefined || value === null || value === "") return;
      rows.push({ label, value, isStrong });
    };
    // Resolved name, or nothing — an unresolved id is not worth a row.
    const named = (map: LabelMap, id: any) => (id ? map[String(id)] || "" : "");

    // ── Personal Details ──
    const fullName = `${v.firstName || ""} ${v.lastName || ""}`.trim();
    push("Name", fullName, true);
    push("DOB", fmtDate(v.dateOfBirth));
    push("Gender", named(GENDER_LABELS, v.gender));
    push("Marital Status", named(MARITAL_LABELS, v.maritalStatus));
    if (String(v.maritalStatus) === "0") push("Anniversary", fmtDate(v.anniversary));
    // The form stores the enum TOKEN ("A_POS"); the summary must show the notation.
    // Empty fallback, not the usual "-NA-", so `push` still drops the row entirely
    // when no blood group has been entered.
    push("Blood Group", formatBloodGroup(v.bloodGroup || v.emergencyDetails?.bloodGroup, ""));

    // ── Contact ──
    push("Personal Email", v.personalEmailId);
    push("Phone", v.personalPhoneNumber);
    push("Alternate", v.alternatePhoneNumber);

    // ── Education & Family ──
    const educationCount = (v.educationalInfo || []).filter(
      (e: any) => e?.instituteName || e?.qualificationName || e?.degree
    ).length;
    if (educationCount > 0) push("Qualifications", `${educationCount}`);

    const familyCount = (v.familyInfo || []).filter((f: any) => f?.name).length;
    if (familyCount > 0) push("Family Members", `${familyCount}`);
    push("Emergency Contact", v.emergencyDetails?.emergencyContactName);
    push("Emergency Phone", v.emergencyDetails?.emergencyContactNumber);

    // ── Bank ──
    push("Bank", v.bankInfo?.bankName);
    push("Account", v.bankInfo?.accountNumber);
    push("IFSC", v.bankInfo?.ifscCode);

    // ── Address ── (present address; `state` was the wrong key and never rendered)
    push("City", v.addressInfo?.presentCity);
    push("State", v.addressInfo?.presentState);
    push("Pin Code", v.addressInfo?.presentPostalCode);

    // ── Employee Information ──
    push("Branch", named(lookups.branch, v.branchId));
    push("Job Profile", named(lookups.designation, v.designationId), true);
    push("Department", named(lookups.department, v.departmentId));
    push("Team", named(lookups.team, v.teamId));
    push("Shift", named(lookups.shift, v.shift));
    push("Employee Type", named(lookups.employeeType, v.employeeTypeConfigId));
    push("Working Location", named(lookups.workingMethod, v.workingMethodId));
    push("Experience Level", named(lookups.experienceLevel, v.experienceLevel));
    push("Employee Level", named(lookups.employeeLevel, v.employeeLevelId));

    // ── Work contact & hiring ──
    push("Company Email", v.companyEmailId);
    push("Company Phone", v.companyPhoneNumber);
    push("Source of Hire", named(lookups.sourceOfHire, v.sourceOfHireId));
    push("Referred By", named(lookups.employee, v.referredById));
    push("Joining Date", fmtDate(v.dateOfJoining), true);
    push("Exit Date", fmtDate(v.dateOfExit));

    const workExpCount = (v.workExpInfo || []).filter((w: any) => w?.companyName).length;
    if (workExpCount > 0) push("Prior Employers", `${workExpCount}`);

    // ── Reporting, pay and access ──
    push("Reports To", named(lookups.employee, v.reportsToId));
    if (v.ctcInLpa) {
      push(
        "CTC",
        `₹ ${Number(String(v.ctcInLpa).replace(/,/g, "")).toLocaleString("en-IN")}`,
        true
      );
    }
    push("App Role", named(lookups.role, v.appRole));

    // Documents
    const attachedDocs = (v.documentInfo || []).filter(
      (d: any) => d?.path || d?.fileName || d?.identityNumber
    ).length;
    const totalDocs = (v.documentFields || []).length;
    if (totalDocs > 0) {
      rows.push({
        label: "Documents",
        value: `${attachedDocs}/${totalDocs} attached`,
        isStrong: attachedDocs === totalDocs,
      });
    }

    // Privacy
    rows.push({
      label: "Directory",
      value: (
        <span
          className={`badge px-2 py-1 fs-8 fw-bold ${
            v.isHiddenFromStaff ? "bg-light-danger text-danger" : "bg-light-success text-success"
          }`}
        >
          {v.isHiddenFromStaff ? "Hidden" : "Visible"}
        </span>
      ),
    });

    return rows;
  };

  return (
    <OnboardingWizard
      groups={groups}
      sectionProps={props}
      defaultValues={props.defaultValues}
      isSubmitting={props.isSubmitting}
      isEditMode={props.editMode}
      onCancel={props.onCancel}
      onFinalSave={props.onFinalSave}
      submitText={props.editMode ? "Save Employee" : "Complete Onboarding"}
      summaryTitle="Employee Summary"
      summaryRows={(v) => summaryRows(v)}
      headerTitle={
        props.editMode
          ? `Edit Employee: ${
              props.headerName ||
              `${values.firstName || ""} ${values.lastName || ""}`.trim()
            }`
          : "Employee Onboarding"
      }
      headerSub={
        props.editMode ? (
          <>
            {values.companyEmailId && (
              <span className="wizard-meta-chip">
                <i className="bi bi-envelope" /> {values.companyEmailId}
              </span>
            )}
            {values.dateOfJoining && (
              <span className="wizard-meta-chip is-accent">
                <i className="bi bi-calendar-check" /> Joined {fmtDate(values.dateOfJoining)}
              </span>
            )}
          </>
        ) : (
          "Capture the new joiner's profile, employment terms and documents"
        )
      }
    />
  );
};

export default OnboardingWorkspace;
