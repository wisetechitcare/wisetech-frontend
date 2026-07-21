import React, { useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { fetchCurrentEmployeeByEmpId } from "@services/employee";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { useDispatch } from "react-redux";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import type { AppDispatch } from "@redux/store";
import Loader from "@app/modules/common/utils/Loader";
import { fetchEmployeeTypes } from "@services/options";
import { resourceNameMapWithCamelCase, permissionConstToUseWithHasPermission, uiControlResourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import AppSettingsModal from "./components/AppSettingsModal";
import { getEducationAcademicLabel, getEducationDetailValue } from "../../../utils/educationUtils";
import "./glass.css";
import "./ShowEmployeeDetails.css";

/* ── Presentational building blocks (className-driven, zero inline sizing) ──
   All layout/typography comes from ShowEmployeeDetails.css tokens, so cards and rows
   reflow fluidly with available/container width. */

function DetailCard({
  icon,
  title,
  iconVariant,
  wide = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  iconVariant?: "warn" | "success";
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`emp-card${wide ? " emp-card--wide" : ""}`}>
      <div className="emp-card-header">
        <span className={`emp-card-icon${iconVariant ? ` emp-card-icon--${iconVariant}` : ""}`}>{icon}</span>
        <h3 className="emp-card-title">{title}</h3>
      </div>
      <div className="emp-card-body">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, link = false }: { label: string; value: ReactNode; link?: boolean }) {
  return (
    <div className="emp-row">
      <span className="emp-row-label">{label}</span>
      <span className={`emp-row-value${link ? " emp-row-value--link" : ""}`}>{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="emp-empty">{text}</div>;
}

const ShowEmployeeDetailsById = ({ employeeId }: { employeeId: string }) => {
  const allemployees = useSelector((state: RootState) => state.allEmployees);
  const [employee, setEmployee] = useState<any>(null);
  const [employeeTypes, setEmployeeTypes] = useState<any[]>([]);
  const [showAppSettingsModal, setShowAppSettingsModal] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  const fetchEmployeeData = async () => {
    const { data } = await fetchCurrentEmployeeByEmpId(employeeId!);
    setEmployee(data.employee);
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data: { employeeTypes } } = await fetchEmployeeTypes();
      setEmployeeTypes(employeeTypes);
    };
    fetchTypes();
  }, []);

  if (!employee) return <Loader />;

  const {
    users,
    departments,
    designations,
    branches,
    nickName,
    dateOfJoining,
    dateOfExit,
    companyPhoneNumber,
    companyPhoneExtension,
    reportsToId,
    EmployeeAddressDetails,
    EmployeeBankDetails,
    EmployeeEducationalDetails,
    EmployeePreviousExperience,
    EmployeeRejoinHistory,
    EmergencyContacts,
    EmployeeEmergencyDetails,
    companyEmailId,
    roles,
    ctcInLpa,
    gender,
    maritalStatus,
    vegMealPreference,
    nonVegMealPreference,
    veganMealPreference,
    isActive,
    anniversary,
    method,
    employeeTypeId,
    employeeTypeConfig,
    referredById,
  } = employee;

  // Return "-NA-" for a missing value rather than a misleading default (a null gender used to
  // read as "Female", null marital status as "Married", null method as "Remote").
  const getGender = (val: number) => (val === 0 ? "Male" : val === 1 ? "Female" : "-NA-");
  const getMaritalStatus = (val: number) => (val === 1 ? "Unmarried" : val === 0 ? "Married" : "-NA-");
  const getMethod = (val: number) => (val === 0 ? "Office" : val === 1 ? "Remote" : "-NA-");

  // The onboarding phone input stores the country dial code (e.g. "91") in the *Extension field,
  // so render it merged into the number ("+91 9987221079") instead of as a standalone "Extension".
  const formatPhoneWithCode = (number?: string | null, code?: string | null) => {
    if (!number) return "-NA-";
    return code ? `+${code} ${number}` : number;
  };

  const formatBloodGroup = (bloodGroup: string | null | undefined) => {
    if (!bloodGroup) return "-NA-";
    const bloodGroupMap: { [key: string]: string } = {
      'A_POS': 'A+', 'A_NEG': 'A-', 'B_POS': 'B+', 'B_NEG': 'B-',
      'AB_POS': 'AB+', 'AB_NEG': 'AB-', 'O_POS': 'O+', 'O_NEG': 'O-',
    };
    return bloodGroupMap[bloodGroup] || bloodGroup;
  };

  const handleWhatsAppShare = () => {
    const message = `CONTACT CARD

${users.firstName} ${users.lastName}
${designations?.role || 'Employee'} | ${departments?.name || 'Department'}
Email: ${companyEmailId || 'N/A'}
Phone: ${companyPhoneNumber ? formatPhoneWithCode(companyPhoneNumber, companyPhoneExtension) : 'N/A'}
Mobile: ${users.personalPhoneNumber ? formatPhoneWithCode(users.personalPhoneNumber, users.personalPhoneNumberExtension) : 'N/A'}
Company: ${employee?.companyOverview?.name || 'N/A'}
Branch: ${branches?.name || 'N/A'}
Location: ${branches?.address || 'N/A'}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Find reporting manager name
  const reportingManagerName =
    allemployees?.list?.find((emp: any) => emp.employeeId === reportsToId)?.employeeName || "Not Assigned";

  // Format date function - DD/MM/YYYY
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-NA-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const referredByEmployeeName = allemployees?.list?.find(
    (emp: any) => emp.employeeId?.toString() === employee?.referredById?.toString()
  )?.employeeName;

  const mealPreference = vegMealPreference
    ? "Vegetarian"
    : nonVegMealPreference
      ? "Non-Vegetarian"
      : veganMealPreference
        ? "Vegan"
        : "-NA-";

  const employeeType =
    employeeTypes.find((type: any) => type.id === employeeTypeId)?.type || employeeTypeConfig?.name || "-NA-";

  const canSeePackage = hasPermission(
    uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves,
    permissionConstToUseWithHasPermission.readOthers
  );

  const address = EmployeeAddressDetails?.[0];
  const currentAddress = address
    ? [
        address.presentAddressLine1 || address.permanentAddressLine1,
        address.presentAddressLine2 || address.permanentAddressLine2,
        address.presentCity || address.permanentCity,
        address.presentState || address.permanentState,
        address.presentCountry || address.permanentCountry,
        address.presentPostalCode || address.permanentPostalCode,
      ].filter(Boolean).join(", ") || "-NA-"
    : "-NA-";
  const permanentAddress = address
    ? [
        address.permanentAddressLine1,
        address.permanentAddressLine2,
        address.permanentCity,
        address.permanentState,
        address.permanentCountry,
        address.permanentPostalCode,
      ].filter(Boolean).join(", ") || "-NA-"
    : "-NA-";

  return (
    <div className="emp-details">
      {/* Header actions */}
      <div className="emp-header">
        <div className="emp-actions">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="emp-btn emp-btn-whatsapp"
            title="Share Employee Details via WhatsApp"
          >
            <i className="bi bi-whatsapp" aria-hidden></i>
            Share Details
          </button>
          {hasPermission(
            resourceNameMapWithCamelCase.employee,
            permissionConstToUseWithHasPermission.editOthers
          ) && (
            <button
              type="button"
              onClick={() => setShowAppSettingsModal(true)}
              className="emp-btn emp-btn-settings"
              title="App Settings"
            >
              <i className="bi bi-gear" aria-hidden></i>
              App Settings
            </button>
          )}
        </div>
      </div>

      {/* Fluid card grid — reflows 2-up ↔ 1-up from available width */}
      <div className="emp-grid">
        {/* Personal Details */}
        <DetailCard icon={<i className="bi bi-person" aria-hidden></i>} title="Personal Details">
          <DetailRow label="Full Name" value={`${users.firstName} ${users.lastName}`.trim() || "-NA-"} />
          <DetailRow label="Nickname" value={nickName || "-NA-"} />
          <DetailRow label="Date of Birth" value={formatDate(users.dateOfBirth)} />
          <DetailRow label="Gender" value={getGender(gender)} />
          <DetailRow label="Marital Status" value={getMaritalStatus(maritalStatus)} />
          {maritalStatus == 0 && <DetailRow label="Anniversary" value={formatDate(anniversary)} />}
          <DetailRow label="Meal Preference" value={mealPreference} />
        </DetailCard>

        {/* Employee Details */}
        <DetailCard icon={<i className="bi bi-briefcase" aria-hidden></i>} title="Employee Details">
          <DetailRow label="Job Profile" value={designations?.role || "-NA-"} />
          <DetailRow label="Department" value={departments?.name || "-NA-"} />
          <DetailRow label="Type of Employee" value={employeeType} />
          <DetailRow label="Working Location Type" value={getMethod(method)} />
          <DetailRow label="Branch" value={branches?.name || "-NA-"} />
        </DetailCard>

        {/* Contact Details */}
        <DetailCard icon={<i className="bi bi-telephone" aria-hidden></i>} title="Contact Details">
          <DetailRow label="Company Email" value={companyEmailId || "-NA-"} link />
          <DetailRow label="Company Phone" value={formatPhoneWithCode(companyPhoneNumber, companyPhoneExtension)} />
          <DetailRow label="Personal Email" value={users?.personalEmailId || "-NA-"} link />
          <DetailRow label="Personal Phone" value={formatPhoneWithCode(users?.personalPhoneNumber, users?.personalPhoneNumberExtension)} />
          <DetailRow label="Alternate Phone" value={users?.alternatePhoneNumber || "-NA-"} />
        </DetailCard>

        {/* Hiring Details */}
        <DetailCard icon={<i className="bi bi-building" aria-hidden></i>} title="Hiring Details">
          <DetailRow label="Hiring Source" value={employee?.companySrcOfHire?.source || "-NA-"} />
          {canSeePackage && (
            <DetailRow
              label="Current Package"
              value={ctcInLpa ? `${(parseInt(ctcInLpa) / 100000).toFixed(2)} LPA` : "-NA-"}
            />
          )}
          <DetailRow label="Date of Joining" value={formatDate(dateOfJoining)} />
          <DetailRow label="Date of Exit" value={formatDate(dateOfExit)} />
          <DetailRow label="Reporting Manager" value={reportingManagerName || "-NA-"} />
          <DetailRow label="Referred By" value={referredByEmployeeName || "-NA-"} />
          <DetailRow label="Account Role" value={roles && roles.length > 0 ? roles[0].name : "-NA-"} />
        </DetailCard>

        {/* Work Experience */}
        <DetailCard icon={<i className="bi bi-briefcase" aria-hidden></i>} title="Work Experience">
          {EmployeePreviousExperience && EmployeePreviousExperience.length > 0 ? (
            <div className="emp-scroll-list">
              {EmployeePreviousExperience.map((exp: any, index: number) => (
                <div className="emp-list-item" key={index}>
                  <DetailRow label="Company" value={exp.companyName || "-NA-"} />
                  <DetailRow label="Job Title" value={exp.jobTitle || "-NA-"} />
                  <DetailRow label="From Date" value={exp.fromDate ? formatDate(exp.fromDate) : "-NA-"} />
                  <DetailRow label="To Date" value={exp.toDate ? formatDate(exp.toDate) : "-NA-"} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No work experience data available" />
          )}
        </DetailCard>

        {/* Re-joining History */}
        <DetailCard icon={<i className="bi bi-briefcase" aria-hidden></i>} title="Re-joining History">
          {EmployeeRejoinHistory && EmployeeRejoinHistory.length > 0 ? (
            <div className="emp-scroll-list">
              {EmployeeRejoinHistory.map((exp: any, index: number) => (
                <div className="emp-list-item" key={index}>
                  <DetailRow label="Date Of Re-Joining" value={formatDate(exp.dateOfReJoining)} />
                  <DetailRow label="Date Of Re-Exit" value={formatDate(exp.dateOfReExit)} />
                  <DetailRow label="Reason" value={exp.reason || "-NA-"} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No Re-joining history available" />
          )}
        </DetailCard>

        {/* Education */}
        <DetailCard icon={<i className="bi bi-mortarboard" aria-hidden></i>} title="Education">
          {EmployeeEducationalDetails && EmployeeEducationalDetails.length > 0 ? (
            <div className="emp-scroll-list">
              {EmployeeEducationalDetails.map((edu: any, index: number) => {
                const academicLabel = getEducationAcademicLabel(edu);
                const detailValue = getEducationDetailValue(edu) || "-NA-";
                const academicValue = academicLabel === "Passing Year"
                  ? (edu.passingYear || "-NA-")
                  : [edu.fromDate && formatDate(edu.fromDate), edu.toDate && formatDate(edu.toDate)].filter(Boolean).join(" - ") || "-NA-";
                return (
                  <div className="emp-list-item" key={index}>
                    <DetailRow label="Institute" value={edu.instituteName || "-NA-"} />
                    <DetailRow label="Qualification" value={edu.qualificationName || edu.degree || "-NA-"} />
                    <DetailRow label="Detail" value={detailValue} />
                    <DetailRow label={academicLabel} value={academicValue} />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No education data available" />
          )}
        </DetailCard>

        {/* Address — normal card; Permanent stacks under Current to stay compact */}
        <DetailCard icon={<i className="bi bi-house" aria-hidden></i>} title="Address">
          {EmployeeAddressDetails && EmployeeAddressDetails.length > 0 ? (
            <div className="emp-address-grid">
              <div className="emp-address-block">
                <div className="emp-subhead">Current Address</div>
                <div className="emp-address-text">{currentAddress}</div>
              </div>
              <div className="emp-address-block">
                <div className="emp-subhead">Permanent Address</div>
                <div className="emp-address-text">{permanentAddress}</div>
              </div>
            </div>
          ) : (
            <EmptyState text="No address data available" />
          )}
        </DetailCard>

        {/* Family Details */}
        <DetailCard icon={<i className="bi bi-people" aria-hidden></i>} title="Family Details">
          {EmergencyContacts && EmergencyContacts.length > 0 ? (
            <div className="emp-scroll-list">
              {EmergencyContacts.map((contact: any, index: number) => (
                <div className="emp-list-item" key={index}>
                  <DetailRow label="Relative Name" value={contact.name || "-NA-"} />
                  <DetailRow label="Relation" value={contact.relationship || "-NA-"} />
                  <DetailRow label="Phone" value={contact.mobileNumber || "-NA-"} />
                  <DetailRow label="Date of Birth" value={formatDate(contact.dateOfBirth)} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No family details available" />
          )}
        </DetailCard>

        {/* Emergency Details */}
        <DetailCard
          icon={<i className="bi bi-exclamation-triangle" aria-hidden></i>}
          title="Emergency Details"
          iconVariant="warn"
        >
          {EmployeeEmergencyDetails && EmployeeEmergencyDetails.length > 0 ? (
            <>
              <DetailRow label="Blood Group" value={formatBloodGroup(EmployeeEmergencyDetails[0].bloodGroup)} />
              <DetailRow label="Allergies" value={EmployeeEmergencyDetails[0].allergies || "-NA-"} />
              <DetailRow label="Emergency Contact Name" value={EmployeeEmergencyDetails[0].emergencyContactName || "-NA-"} />
              <DetailRow label="Emergency Contact Number" value={EmployeeEmergencyDetails[0].emergencyContactNumber || "-NA-"} />
            </>
          ) : (
            <EmptyState text="No emergency details available" />
          )}
        </DetailCard>

        {/* Bank Details */}
        <DetailCard
          icon={<i className="bi bi-bank" aria-hidden></i>}
          title="Bank Details"
          iconVariant="success"
        >
          {EmployeeBankDetails && EmployeeBankDetails.length > 0 ? (
            <>
              <DetailRow label="AC Number" value={EmployeeBankDetails[0].accountNumber || "-NA-"} />
              <DetailRow label="AC Holder Name" value={EmployeeBankDetails[0].accountName || "-NA-"} />
              <DetailRow label="IFSC" value={EmployeeBankDetails[0].ifscCode || "-NA-"} />
            </>
          ) : (
            <EmptyState text="No bank details available" />
          )}
        </DetailCard>
      </div>

      <AppSettingsModal
        show={showAppSettingsModal}
        onClose={() => setShowAppSettingsModal(false)}
        onSuccess={() => {
          fetchEmployeeData();
        }}
        employeeId={employeeId}
      />
    </div>
  );
};

export default ShowEmployeeDetailsById;
