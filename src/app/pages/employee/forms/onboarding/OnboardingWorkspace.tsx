import React, { useEffect, useMemo } from "react";
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

import { fetchDocumentsField } from "@services/employee";
import { fetchOrganizationTree } from "@services/company";
import { fetchBranches } from "@services/options";
import OnboardingWizard, { OnboardingGroup } from "./OnboardingWizard";
import * as S from "./OnboardingSections";
import type { OnboardingSectionsProps } from "./OnboardingSections";

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

const fmtDate = (v?: string) => (v && dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : "");

export const OnboardingWorkspace: React.FC<OnboardingWorkspaceProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();

  // Enabled document types drive the Documents section. Fetched at wizard level
  // (not on arrival at that section, as the legacy Step4 did) so sidebar
  // completion and the summary are correct before the user ever gets there.
  useEffect(() => {
    let cancelled = false;
    async function getAllDocFields() {
      try {
        const {
          data: { documents },
        } = await fetchDocumentsField();
        if (cancelled) return;

        const enabled = documents.filter((doc: any) => doc.isEnabled);
        setFieldValue("documentFields", enabled, true);

        const docInfo = values.documentInfo;
        if (!docInfo || docInfo.length === 0 || docInfo.length !== enabled.length) {
          setFieldValue(
            "documentInfo",
            enabled.map((doc: any) => createInitialDocumentInfo(doc.id)),
            true
          );
        } else {
          setFieldValue(
            "documentInfo",
            docInfo.map((doc: any, i: number) => ({
              ...doc,
              documentId: doc.documentId || enabled[i]?.id,
            })),
            true
          );
        }
      } catch {
        // A failed lookup must not break the wizard — the section renders empty.
      }
    }
    getAllDocFields();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            requiredFields: ["companyEmailId", "companyPhoneNumber"],
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
            requiredFields: ["ctcInLpa"],
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
            fields: ["appRole", "isEmployeeActive"],
            requiredFields: ["appRole"],
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
    []
  );

  // Comprehensive summary: show all essential data across all sections, not just active.
  const summaryRows = (v: any) => {
    const rows: Array<{ label: string; value: React.ReactNode; isStrong?: boolean }> = [];

    // Personal Details
    if (v.firstName || v.lastName) {
      rows.push({
        label: "Name",
        value: `${v.firstName || ""} ${v.lastName || ""}`.trim(),
        isStrong: true,
      });
    }
    if (v.dateOfBirth) rows.push({ label: "DOB", value: fmtDate(v.dateOfBirth) });
    if (v.gender) rows.push({ label: "Gender", value: v.gender });

    // Contact
    if (v.personalEmailId) rows.push({ label: "Personal Email", value: v.personalEmailId });
    if (v.personalPhoneNumber) rows.push({ label: "Phone", value: v.personalPhoneNumber });
    if (v.alternatePhoneNumber) rows.push({ label: "Alternate", value: v.alternatePhoneNumber });

    // Address
    if (v.addressInfo?.presentCity) rows.push({ label: "City", value: v.addressInfo.presentCity });
    if (v.addressInfo?.state) rows.push({ label: "State", value: v.addressInfo.state });

    // Company Info
    if (v.companyEmailId) rows.push({ label: "Company Email", value: v.companyEmailId });
    if (v.companyPhoneNumber) rows.push({ label: "Company Phone", value: v.companyPhoneNumber });
    if (v.dateOfJoining) {
      rows.push({ label: "Joining Date", value: fmtDate(v.dateOfJoining), isStrong: true });
    }

    // Org Structure
    if (v.designationId) rows.push({ label: "Designation", value: "✓ Set" });
    if (v.departmentId) rows.push({ label: "Department", value: "✓ Set" });
    if (v.branchId) rows.push({ label: "Branch", value: "✓ Set" });
    if (v.teamId) rows.push({ label: "Team", value: "✓ Set" });

    // Financial
    if (v.ctcInLpa) {
      rows.push({
        label: "CTC",
        value: `₹ ${Number(String(v.ctcInLpa).replace(/,/g, "")).toLocaleString("en-IN")}`,
        isStrong: true,
      });
    }

    // Bank
    if (v.bankInfo?.accountNumber) rows.push({ label: "Account", value: v.bankInfo.accountNumber });
    if (v.bankInfo?.ifscCode) rows.push({ label: "IFSC", value: v.bankInfo.ifscCode });

    // Family & Emergency
    const familyCount = (v.familyInfo || []).filter((f: any) => f?.name).length;
    if (familyCount > 0) rows.push({ label: "Family Members", value: `${familyCount}` });
    if (v.emergencyDetails?.emergencyContactName) {
      rows.push({ label: "Emergency Contact", value: v.emergencyDetails.emergencyContactName });
    }
    if (v.emergencyDetails?.bloodGroup) rows.push({ label: "Blood Group", value: v.emergencyDetails.bloodGroup });

    // Education & Experience
    const educationCount = (v.educationalInfo || []).filter(
      (e: any) => e?.instituteName || e?.qualificationName || e?.degree
    ).length;
    if (educationCount > 0) rows.push({ label: "Qualifications", value: `${educationCount}` });

    const workExpCount = (v.workExpInfo || []).filter((w: any) => w?.companyName).length;
    if (workExpCount > 0) rows.push({ label: "Prior Employers", value: `${workExpCount}` });

    // Access & Reporting
    if (v.reportsToId) rows.push({ label: "Reports To", value: "✓ Set" });
    if (v.appRole) rows.push({ label: "App Role", value: "✓ Set" });

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
