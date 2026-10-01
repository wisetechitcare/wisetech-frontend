import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchEmployeeTypes } from "@services/options";
import { uiControlResourceNameMapWithCamelCase, permissionConstToUseWithHasPermission } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { getEducationAcademicLabel, getEducationDetailValue } from "../../../utils/educationUtils";
import { formatBloodGroup, formatPhoneWithCode } from "@utils/employeeFormat";
import { DetailCard, DetailRow, DetailInfoItem } from "@app/modules/detail-page/DetailPageComponents";
import { Box, Link, Typography } from "@mui/material";
import { FONT, ICON_COLORS } from "@app/modules/configuration/ConfigDesignSystem";
import { StatGrid, SectionHeading } from "./entity/detail/sections/SummarySection";
import { fmtDate, DASH } from "./entity/detail/entityViewModel";

/**
 * The employee's Details tab, built from the same pieces as the lead/project detail page
 * (stat band → grouped DetailCards) so the two read as one product. The header (avatar,
 * status, actions) belongs to the page, not to this tab.
 */

/** Blank and the legacy "-NA-" placeholder both read as the app-wide dash. */
const val = (v: any): React.ReactNode => (v === null || v === undefined || v === "" || v === "-NA-" ? DASH : v);

const mailLink = (email?: string | null) =>
  email ? <Link href={`mailto:${email}`} underline="hover" sx={{ fontSize: "inherit" }}>{email}</Link> : DASH;

const telLink = (phone: string) =>
  phone && phone !== "-NA-"
    ? <Link href={`tel:${phone.replace(/[^\d+]/g, "")}`} underline="hover" color="inherit" sx={{ fontSize: "inherit" }}>{phone}</Link>
    : DASH;

/** One record in a repeating list (a past job, a degree, a relative): title + subtitle on the left, a fact on the right. */
const Entry: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode; meta?: React.ReactNode; isLast?: boolean }> = ({ title, subtitle, meta, isLast }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, py: 1.5, borderBottom: isLast ? 0 : 1, borderColor: "divider" }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontFamily: FONT.body, fontSize: 13.5, fontWeight: 600, color: "text.primary" }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontFamily: FONT.body, fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>{subtitle}</Typography>}
    </Box>
    {meta && <Typography component="div" sx={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 500, color: "text.secondary", textAlign: "right", flexShrink: 0 }}>{meta}</Typography>}
  </Box>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <Typography sx={{ fontFamily: FONT.body, fontSize: 13, color: "text.disabled", py: 2.75, textAlign: "center" }}>{text}</Typography>
);

/** Two cards per row on desktop. Unlike the lead page's CardGrid, an odd last card keeps its half width — a short card stretched edge to edge is mostly empty space. */
const CARD_GRID = { display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2.5, alignItems: "stretch" } as const;

const range = (from?: string | null, to?: string | null) =>
  from || to ? `${from ? fmtDate(from) : "?"} – ${to ? fmtDate(to) : "Present"}` : undefined;

const ShowEmployeeDetailsById = ({ employee }: { employee: any }) => {
  const allEmployees = useSelector((state: RootState) => state.allEmployees?.list) || [];
  const [employeeTypes, setEmployeeTypes] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployeeTypes().then(({ data }) => setEmployeeTypes(data?.employeeTypes || [])).catch(() => {});
  }, []);

  const {
    users, departments, designations, branches, dateOfJoining, dateOfExit, companyPhoneNumber,
    companyPhoneExtension, reportsToId, EmployeeAddressDetails, EmployeeBankDetails,
    EmployeeEducationalDetails, EmployeePreviousExperience, EmployeeRejoinHistory, EmergencyContacts,
    EmployeeEmergencyDetails, companyEmailId, roles, ctcInLpa, gender, maritalStatus,
    vegMealPreference, nonVegMealPreference, veganMealPreference, anniversary, method,
    employeeTypeId, employeeTypeConfig, referredById,
  } = employee;

  // A missing value reads as missing, never as a default (null gender used to show "Female").
  const genderLabel = gender === 0 ? "Male" : gender === 1 ? "Female" : DASH;
  const maritalLabel = maritalStatus === 1 ? "Unmarried" : maritalStatus === 0 ? "Married" : DASH;
  const methodLabel = method === 0 ? "Office" : method === 1 ? "Remote" : DASH;
  const mealPreference = vegMealPreference ? "Vegetarian" : nonVegMealPreference ? "Non-Vegetarian" : veganMealPreference ? "Vegan" : DASH;
  const employeeType = employeeTypes.find((t: any) => t.id === employeeTypeId)?.type || employeeTypeConfig?.name || DASH;
  const nameOf = (id: any) => allEmployees.find((e: any) => e.employeeId?.toString() === id?.toString())?.employeeName;
  const manager = nameOf(reportsToId) || "Not assigned";

  const canSeePackage = hasPermission(
    uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves,
    permissionConstToUseWithHasPermission.readOthers,
  );

  const address = EmployeeAddressDetails?.[0];
  const join = (parts: any[]) => parts.filter(Boolean).join(", ") || DASH;
  const currentAddress = address ? join([
    address.presentAddressLine1 || address.permanentAddressLine1,
    address.presentAddressLine2 || address.permanentAddressLine2,
    address.presentCity || address.permanentCity,
    address.presentState || address.permanentState,
    address.presentCountry || address.permanentCountry,
    address.presentPostalCode || address.permanentPostalCode,
  ]) : DASH;
  const permanentAddress = address ? join([
    address.permanentAddressLine1, address.permanentAddressLine2, address.permanentCity,
    address.permanentState, address.permanentCountry, address.permanentPostalCode,
  ]) : DASH;

  const emergency = EmployeeEmergencyDetails?.[0];
  const bank = EmployeeBankDetails?.[0];
  const experience: any[] = EmployeePreviousExperience || [];
  const education: any[] = EmployeeEducationalDetails || [];
  const family: any[] = EmergencyContacts || [];
  const rejoins: any[] = EmployeeRejoinHistory || [];

  return (
    <div>
      <StatGrid
        items={[
          { label: "Date of Joining", value: fmtDate(dateOfJoining), icon: "bi bi-calendar-event", accent: "teal" },
          { label: "Department", value: val(departments?.name), icon: "bi bi-diagram-3", accent: "primary" },
          { label: "Reporting Manager", value: manager, icon: "bi bi-person-badge", accent: "purple" },
          { label: "Branch", value: val(branches?.name), icon: "bi bi-geo-alt", accent: "blue" },
          { label: "Employee Type", value: employeeType, icon: "bi bi-briefcase", accent: "amber" },
          { label: "Work Mode", value: methodLabel, icon: "bi bi-building", accent: "green" },
        ]}
      />

      <Box sx={{ mt: 3 }}>
        <SectionHeading icon="bi bi-person" title="Personal & Contact" color={ICON_COLORS.blue.color} />
        <Box sx={CARD_GRID}>
          <DetailCard title="Personal Details" subtitle="Who they are" icon="bi bi-person" accentColor="primary">
            <DetailRow label="Full Name" value={val(`${users?.firstName || ""} ${users?.lastName || ""}`.trim())} />
            <DetailRow label="Date of Birth" value={fmtDate(users?.dateOfBirth)} />
            <DetailRow label="Gender" value={genderLabel} />
            <DetailRow label="Marital Status" value={maritalLabel} />
            {maritalStatus == 0 &&<DetailRow label="Anniversary" value={fmtDate(anniversary)} />}
            <DetailRow label="Meal Preference" value={mealPreference} isLast />
          </DetailCard>

          <DetailCard title="Contact Details" subtitle="How to reach them" icon="bi bi-telephone" accentColor="blue">
            <DetailRow label="Company Email" value={mailLink(companyEmailId)} />
            <DetailRow label="Company Phone" value={telLink(formatPhoneWithCode(companyPhoneNumber, companyPhoneExtension))} />
            <DetailRow label="Personal Email" value={mailLink(users?.personalEmailId)} />
            <DetailRow label="Personal Phone" value={telLink(formatPhoneWithCode(users?.personalPhoneNumber, users?.personalPhoneNumberExtension))} />
            <DetailRow label="Alternate Phone" value={telLink(users?.alternatePhoneNumber || "")} isLast />
          </DetailCard>

          <DetailCard title="Address" subtitle="Where they live" icon="bi bi-house" accentColor="teal">
            <DetailInfoItem label="Current Address" value={currentAddress} borderBottom />
            <DetailInfoItem label="Permanent Address" value={permanentAddress} />
          </DetailCard>

          <DetailCard title="Emergency Details" subtitle="Medical and who to call" icon="bi bi-heart-pulse" accentColor="danger">
            <DetailRow label="Blood Group" value={val(emergency && formatBloodGroup(emergency.bloodGroup))} />
            <DetailRow label="Allergies" value={val(emergency?.allergies)} />
            <DetailRow label="Emergency Contact" value={val(emergency?.emergencyContactName)} />
            <DetailRow label="Emergency Number" value={telLink(emergency?.emergencyContactNumber || "")} isLast />
          </DetailCard>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <SectionHeading icon="bi bi-briefcase" title="Employment" color="#7c3aed" />
        <Box sx={CARD_GRID}>
          <DetailCard title="Role & Placement" subtitle="Where they sit in the company" icon="bi bi-briefcase" accentColor="primary">
            <DetailRow label="Job Profile" value={val(designations?.role)} />
            <DetailRow label="Department" value={val(departments?.name)} />
            <DetailRow label="Type of Employee" value={employeeType} />
            <DetailRow label="Working Location Type" value={methodLabel} />
            <DetailRow label="Branch" value={val(branches?.name)} isLast />
          </DetailCard>

          <DetailCard title="Hiring Details" subtitle="How and when they joined" icon="bi bi-person-check" accentColor="green">
            <DetailRow label="Hiring Source" value={val(employee?.companySrcOfHire?.source)} />
            {canSeePackage && (
              <DetailRow label="Current Package" value={ctcInLpa ? `${(parseInt(ctcInLpa) / 100000).toFixed(2)} LPA` : DASH} />
            )}
            <DetailRow label="Date of Joining" value={fmtDate(dateOfJoining)} />
            <DetailRow label="Date of Exit" value={fmtDate(dateOfExit)} />
            <DetailRow label="Reporting Manager" value={manager} />
            <DetailRow label="Referred By" value={val(nameOf(referredById))} />
            <DetailRow label="Account Role" value={val(roles?.[0]?.name)} isLast />
          </DetailCard>

          <DetailCard title="Work Experience" subtitle="Before joining" icon="bi bi-clock-history" accentColor="amber">
            {experience.length ? experience.map((x, i) => (
              <Entry key={i} title={val(x.companyName)} subtitle={x.jobTitle} meta={range(x.fromDate, x.toDate)} isLast={i === experience.length - 1} />
            )) : <Empty text="No previous experience added" />}
          </DetailCard>

          <DetailCard title="Education" subtitle="Qualifications" icon="bi bi-mortarboard" accentColor="teal">
            {education.length ? education.map((e, i) => {
              const academic = getEducationAcademicLabel(e) === "Passing Year"
                ? (e.passingYear ? `Passed ${e.passingYear}` : undefined)
                : range(e.fromDate, e.toDate);
              return (
                <Entry
                  key={i}
                  title={val(e.qualificationName || e.degree)}
                  subtitle={[e.instituteName, getEducationDetailValue(e)].filter(Boolean).join(", ") || undefined}
                  meta={academic}
                  isLast={i === education.length - 1}
                />
              );
            }) : <Empty text="No education added" />}
          </DetailCard>

          <DetailCard title="Re-joining History" subtitle="Each return to the company" icon="bi bi-arrow-repeat" accentColor="blue">
            {rejoins.length ? rejoins.map((r, i) => (
              <Entry
                key={i}
                title={`Rejoined ${fmtDate(r.dateOfReJoining)}`}
                subtitle={r.reason}
                meta={r.dateOfReExit ? `Left ${fmtDate(r.dateOfReExit)}` : "Current"}
                isLast={i === rejoins.length - 1}
              />
            )) : <Empty text="Has not left and rejoined" />}
          </DetailCard>

          <DetailCard title="Bank Details" subtitle="Salary account" icon="bi bi-bank" accentColor="green">
            <DetailRow label="Account Number" value={val(bank?.accountNumber)} />
            <DetailRow label="Account Holder" value={val(bank?.accountName)} />
            <DetailRow label="IFSC" value={val(bank?.ifscCode)} isLast />
          </DetailCard>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <SectionHeading icon="bi bi-people" title="Family" color="#9333ea" />
        <Box sx={CARD_GRID}>
          <DetailCard title="Family Details" subtitle={family.length ? `${family.length} on record` : "Relatives on record"} icon="bi bi-people" accentColor="purple">
            {family.length ? family.map((f, i) => (
              <Entry
                key={i}
                title={val(f.name)}
                subtitle={[f.relationship, f.dateOfBirth && `Born ${fmtDate(f.dateOfBirth)}`].filter(Boolean).join(", ") || undefined}
                meta={f.mobileNumber ? telLink(f.mobileNumber) : undefined}
                isLast={i === family.length - 1}
              />
            )) : <Empty text="No family details added" />}
          </DetailCard>
        </Box>
      </Box>
    </div>
  );
};

export default ShowEmployeeDetailsById;
