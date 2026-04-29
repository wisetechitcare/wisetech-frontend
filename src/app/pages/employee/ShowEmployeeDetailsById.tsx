import React, { useEffect, useState } from "react";
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
    id: empId,
    employeeCode,
    dateOfJoining,
    departments,
    designations,
    branches,
    nickName,
    dateOfExit,
    dateOfReJoining,
    dateOfReExit,
    companyPhoneNumber,
    companyPhoneExtension,
    reportsToId,
    avatar,
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
    allowOverTime,
    isActive,
    anniversary,
    attendanceRequestRaiseLimit,
    method,
    aadharNumber,
    panNumber,
    showAppSettings,
    createdAt: employeeCreatedAt,
    companyId,
    employeeTypeId,
    branchId,
    departmentId,
    sourceOfHireId,
    referredById,
    workingMethodId,
    employeeStatusId,
    workSchedule,
    digitalSignatureHash,
    digitalSignaturePath,
    aadharCardPath,
    panCardPath,
  } = employee;

  const getGender = (val: number) => (val === 0 ? "Male" : "Female");
  const getMaritalStatus = (val: number) => (val === 1 ? "Single" : "Married");
  const getMethod = (val: number) => (val === 0 ? "Office" : "Remote");

  const formatBloodGroup = (bloodGroup: string | null | undefined) => {
    if (!bloodGroup) return "-NA-";
    const bloodGroupMap: { [key: string]: string } = {
      'A_POS': 'A+',
      'A_NEG': 'A-',
      'B_POS': 'B+',
      'B_NEG': 'B-',
      'AB_POS': 'AB+',
      'AB_NEG': 'AB-',
      'O_POS': 'O+',
      'O_NEG': 'O-'
    };
    return bloodGroupMap[bloodGroup] || bloodGroup;
  };

  const handleEditClick = async (employeeId: string) => {
    navigate(`/employees/edit/${employeeId}`, { state: { employeeId } });
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleWhatsAppShare = () => {
    const message = `CONTACT CARD

${users.firstName} ${users.lastName}
${designations?.role || 'Employee'} | ${departments?.name || 'Department'}
Email: ${companyEmailId || 'N/A'}
Phone: ${companyPhoneNumber || 'N/A'}${companyPhoneExtension ? ` (Ext: ${companyPhoneExtension})` : ''}
Mobile: ${users.personalPhoneNumber || 'N/A'}
Company: ${employee?.companyOverview?.name || 'N/A'}
Branch: ${branches?.name || 'N/A'}
Location: ${branches?.address || 'N/A'}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Find reporting manager name
  const reportingManagerName =
    allemployees?.list?.find((emp: any) => emp.employeeId === reportsToId)
      ?.employeeName || "Not Assigned";

  // Format date function - DD/MM/YYYY
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-NA-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Check if employee is actually active based on dateOfExit
  const isEmployeeActive = () => {
    if (!isActive) return false;
    if (dateOfExit) {
      const exitDate = new Date(dateOfExit);
      const currentDate = new Date();
      // If exit date is before current date, employee is inactive
      if (exitDate < currentDate) return false;
    }
    return true;
  };

  // Parse working days
  const parseWorkingDays = (workingDaysString: string) => {
    try {
      const days = JSON.parse(workingDaysString);
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const workingDays: string[] = [];
      const offDays: string[] = [];

      Object.entries(days).forEach(([day, isWorking]) => {
        const dayIndex = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ].indexOf(day.toLowerCase());
        const dayName = dayNames[dayIndex === 6 ? 0 : dayIndex + 1]; // Adjust for Sunday being 0
        if (isWorking === "1") {
          workingDays.push(dayName);
        } else {
          offDays.push(dayName);
        }
      });

      return { workingDays, offDays };
    } catch {
      return { workingDays: [], offDays: [] };
    }
  };

  const workingDaysInfo = branches?.workingAndOffDays
    ? parseWorkingDays(branches.workingAndOffDays)
    : { workingDays: [], offDays: [] };

  const referredByEmployeeName = allemployees?.list?.find((emp: any) => emp.employeeId?.toString() === employee?.referredById?.toString())?.employeeName;

  return (
    <>
      <div style={{ padding: "0px", margin: "0px" }}>
        <div style={{ padding: "0px" }}>
          {/* Header with WhatsApp Share Button */}
          <div
            className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-3 mb-sm-4"
          >
            <h2
              style={{
                margin: "0px",
                fontFamily: "Barlow",
                fontWeight: "600",
                fontSize: "clamp(18px, 5vw, 24px)",
                color: "#000"
              }}
            >
              {/* Employee Details - {users.firstName} {users.lastName} */}
            </h2>
            <div className="d-flex gap-2">
              <button
                onClick={handleWhatsAppShare}
                className="w-100 w-sm-auto"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  fontSize: "clamp(12px, 3vw, 14px)",
                  borderRadius: "6px",
                  backgroundColor: "#25D366",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
                title="Share Employee Details via WhatsApp"
              >
                <i className="bi bi-whatsapp" style={{ fontSize: "16px", color: "white" }}></i>
                Share Details
              </button>
              {hasPermission(
          resourceNameMapWithCamelCase.employee,
          permissionConstToUseWithHasPermission.editOthers) && <button
                onClick={() => setShowAppSettingsModal(true)}
                className="w-100 w-sm-auto"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  fontSize: "clamp(12px, 3vw, 14px)",
                  borderRadius: "6px",
                  backgroundColor: "#8B4444",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
                title="App Settings"
              >
                <i className="bi bi-gear" style={{ fontSize: "16px", color: "white" }}></i>
                App Settings
              </button>}
              
            </div>
          </div>

          {/* Main Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* First Row - Personal and Employee Details */}
            <div className="row g-3">
              {/* Personal Details Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-person fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Personal Details
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Full Name</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {users.firstName + " " + users.lastName || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Nickname</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{nickName || "-NA-"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date of Birth</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {formatDate(users.dateOfBirth) || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Gender</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {getGender(gender) || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Marital Status</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {getMaritalStatus(maritalStatus) || "-NA-"}
                      </div>
                    </div>
                    {maritalStatus == 0 && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Anniversary</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {formatDate(anniversary) || "-NA-"}
                      </div>
                    </div>}
                    {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Blood Group</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {formatBloodGroup(users?.bloodGroup)}
                    </div>
                  </div> */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Meal Preference</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {vegMealPreference
                          ? "Vegetarian"
                          : nonVegMealPreference
                            ? "Non-Vegetarian"
                            : veganMealPreference
                              ? "Vegan"
                              : "-NA-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Details Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-briefcase fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Employee Details
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Job Profile</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {designations?.role || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Department</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {departments?.name || "-NA-"}
                      </div>
                    </div>
                    {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Experience Level</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {"-NA-"}
                    </div>
                  </div> */}
                    {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Management level</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {"-"}
                    </div>
                  </div> */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Type of Employee</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {employeeTypes.find((type: any) => type.id === employeeTypeId)?.type || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Working Location Type</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {getMethod(method) || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Branch</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {branches?.name || "-NA-"}
                      </div>
                    </div>
                    {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Shift</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {"-"}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Room/Block</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {"-"}
                    </div>
                  </div> */}
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row - Contact Details and Hiring Details */}
            <div className="row g-3">
              {/* Contact Details Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-telephone fs-2 text-info"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Contact Details
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500", color: "black" }}>Company Email</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", color: "#9d4141" }}>{companyEmailId || "-NA-"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Company Phone</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{companyPhoneNumber || "-NA-"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Extension</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{companyPhoneExtension || "-NA-"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500", color: "black" }}>Personal Email</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", color: "#9d4141" }}>{users?.personalEmailId || "-NA-"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Personal Phone</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{users?.personalPhoneNumber || "-NA-"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Alternate Phone</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{users?.alternatePhoneNumber || "-NA-"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      {/* <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Socials</div> */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ width: "28px", height: "28px" }}></div>
                        <div style={{ width: "28px", height: "28px" }}></div>
                        <div style={{ width: "28px", height: "28px" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hiring Details Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-building fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Hiring Details
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Hiring Source</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {employee?.companySrcOfHire?.source || "-NA-"}
                      </div>
                    </div>
                    {hasPermission(
                      uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves,
                      permissionConstToUseWithHasPermission.readOthers
                    ) && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                          <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Current Package</div>
                          <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                            {ctcInLpa
                              ? `${(parseInt(ctcInLpa) / 100000).toFixed(2)} LPA`
                              : "-NA-"}
                          </div>
                        </div>
                      )}
                    {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Referred By</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {"-NA-"}
                    </div>
                  </div> */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date of Joining</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {formatDate(dateOfJoining) || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date of Exit</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {formatDate(dateOfExit) || "-NA-"}
                      </div>
                    </div>
                    {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date of Rejoining</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {formatDate(dateOfReJoining) || "-NA-" }
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                    <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date of Re-exit</div>
                    <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                      {formatDate(dateOfReExit) || "-NA-" }
                    </div>
                  </div> */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Reporting Manager</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {reportingManagerName || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Referred By</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {referredByEmployeeName || "-NA-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Account Role</div>
                      <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                        {roles && roles.length > 0 ? roles[0].name : "-NA-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Third Row - Work Experience and Education */}
            <div className="row g-3">
              {/* Work Experience Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-briefcase fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Work Experience
                    </div>
                  </div>
                  {EmployeePreviousExperience && EmployeePreviousExperience.length > 0 ? (
                    <div style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      scrollbarWidth: "thin",
                      scrollbarColor: "#e6eaf1 transparent"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {EmployeePreviousExperience.map((exp: any, index: any) => (
                          <div key={index}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Company</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{exp.companyName || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Job Title</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{exp.jobTitle || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>From Date</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                                  {exp.fromDate
                                    ? `${formatDate(exp.fromDate)}`
                                    : "-NA-"}
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>To Date</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                                  {exp.toDate
                                    ? `${formatDate(exp.toDate)}`
                                    : "-NA-"}
                                </div>
                              </div>
                            </div>
                            {index < EmployeePreviousExperience.length - 1 && (
                              <div style={{ height: "0px", borderTop: "1px solid #e6eaf0", margin: "16px 0" }}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#666" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px" }}>No work experience data available</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-briefcase fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Re-joining History
                    </div>
                  </div>
                  {EmployeeRejoinHistory && EmployeeRejoinHistory.length > 0 ? (
                    <div style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      scrollbarWidth: "thin",
                      scrollbarColor: "#e6eaf1 transparent"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {EmployeeRejoinHistory.map((exp: any, index: any) => (
                          <div key={index}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date Of Re-Joining</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{formatDate(exp.dateOfReJoining) || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date Of Re-Exit</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{formatDate(exp.dateOfReExit) || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Reason</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                                  {exp.reason
                                    ? `${exp.reason}`
                                    : "-NA-"}
                                </div>
                              </div>
                            </div>
                            {index < EmployeeRejoinHistory.length - 1 && (
                              <div style={{ height: "0px", borderTop: "1px solid #e6eaf0", margin: "16px 0" }}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#666" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px" }}>No Re-joining history available</div>
                    </div>
                  )}
                </div>
              </div>


            </div>

            {/* Fourth Row - Address and Family Details */}
            <div className="row g-3">
              {/* Address Card */}
              {/* Education Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-mortarboard fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Education
                    </div>
                  </div>
                  {EmployeeEducationalDetails && EmployeeEducationalDetails.length > 0 ? (
                    <div style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      scrollbarWidth: "thin",
                      scrollbarColor: "#e6eaf1 transparent"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {EmployeeEducationalDetails.map((edu: any, index: any) => (
                          <div key={index}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Institute</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{edu.instituteName || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Degree</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{edu.degree || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Specialization</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{edu.specialization || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>From Date</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                                  {edu.fromDate
                                    ? `${formatDate(edu.fromDate)}`
                                    : "-NA-"}
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>To Date</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                                  {edu.toDate
                                    ? `${formatDate(edu.toDate)}`
                                    : "-NA-"}
                                </div>
                              </div>
                            </div>
                            {index < EmployeeEducationalDetails.length - 1 && (
                              <div style={{ height: "0px", borderTop: "1px solid #e6eaf0", margin: "16px 0" }}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#666" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px" }}>No education data available</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >

                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-house fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Address
                    </div>
                  </div>
                  {EmployeeAddressDetails && EmployeeAddressDetails.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ fontFamily: "Inter", fontWeight: "600", fontSize: "14px", color: "black" }}>Current Address</div>
                        <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px", color: "black" }}>
                          {[
                            EmployeeAddressDetails[0]?.presentAddressLine1 || EmployeeAddressDetails[0]?.permanentAddressLine1,
                            EmployeeAddressDetails[0]?.presentAddressLine2 || EmployeeAddressDetails[0]?.permanentAddressLine2,
                            EmployeeAddressDetails[0]?.presentCity || EmployeeAddressDetails[0]?.permanentCity,
                            EmployeeAddressDetails[0]?.presentState || EmployeeAddressDetails[0]?.permanentState,
                            EmployeeAddressDetails[0]?.presentCountry || EmployeeAddressDetails[0]?.permanentCountry,
                            EmployeeAddressDetails[0]?.presentPostalCode || EmployeeAddressDetails[0]?.permanentPostalCode
                          ].filter(Boolean).join(", ") || "-NA-"}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ fontFamily: "Inter", fontWeight: "600", fontSize: "14px", color: "black" }}>Permanent Address</div>
                        <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px", color: "black" }}>
                          {[
                            EmployeeAddressDetails[0]?.permanentAddressLine1,
                            EmployeeAddressDetails[0]?.permanentAddressLine2,
                            EmployeeAddressDetails[0]?.permanentCity,
                            EmployeeAddressDetails[0]?.permanentState,
                            EmployeeAddressDetails[0]?.permanentCountry,
                            EmployeeAddressDetails[0]?.permanentPostalCode
                          ].filter(Boolean).join(", ") || "-NA-"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#666" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px" }}>No address data available</div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Fifth Row - Emergency Details and Bank Details */}
            <div className="row g-3">

              {/* Family Details Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-people fs-2 text-primary"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Family Details
                    </div>
                  </div>
                  {EmergencyContacts && EmergencyContacts.length > 0 ? (
                    <div style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      scrollbarWidth: "thin",
                      scrollbarColor: "#e6eaf1 transparent"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {EmergencyContacts.map((contact: any, index: number) => (
                          <div key={index}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Relative Name</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{contact.name || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Relation</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{contact.relationship || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Phone</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{contact.mobileNumber || "-NA-"}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                                <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Date of Birth</div>
                                <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{formatDate(contact.dateOfBirth) || "-NA-"}</div>
                              </div>
                            </div>
                            {index < EmergencyContacts.length - 1 && (
                              <div style={{ height: "0px", borderTop: "1px solid #e6eaf0", margin: "16px 0" }}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#666" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px" }}>No family details available</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Details Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-exclamation-triangle fs-2 text-warning"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Emergency Details
                    </div>
                  </div>
                  {EmployeeEmergencyDetails && EmployeeEmergencyDetails.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                        <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Blood Group</div>
                        <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                          {formatBloodGroup(EmployeeEmergencyDetails[0].bloodGroup)}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                        <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Allergies</div>
                        <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                          {EmployeeEmergencyDetails[0].allergies || "-NA-"}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                        <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Emergency Contact Name</div>
                        <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                          {EmployeeEmergencyDetails[0].emergencyContactName || "-NA-"}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                        <div style={{ fontFamily: "Inter", fontWeight: "500" }}>Emergency Contact Number</div>
                        <div style={{ fontFamily: "Inter", fontWeight: "400" }}>
                          {EmployeeEmergencyDetails[0].emergencyContactNumber || "-NA-"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#666" }}>
                      <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px" }}>No emergency details available</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Details Card */}
              <div className="col-12 col-md-6 d-flex">
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <i className="bi bi-bank fs-2 text-success"></i>
                    </div>
                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "600",
                        fontSize: "19px",
                        color: "black",
                        letterSpacing: "0.19px",
                        margin: "0"
                      }}
                    >
                      Bank Details
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {EmployeeBankDetails && EmployeeBankDetails.length > 0 ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                          <div style={{ fontFamily: "Inter", fontWeight: "500" }}>AC Number</div>
                          <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{EmployeeBankDetails[0].accountNumber || "-NA-"}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                          <div style={{ fontFamily: "Inter", fontWeight: "500" }}>AC Holder Name</div>
                          <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{EmployeeBankDetails[0].accountName || "-NA-"} </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "black" }}>
                          <div style={{ fontFamily: "Inter", fontWeight: "500" }}>IFSC</div>
                          <div style={{ fontFamily: "Inter", fontWeight: "400" }}>{EmployeeBankDetails[0].ifscCode || "-NA-"}</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px 0", color: "#666" }}>
                        <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px" }}>No bank details available</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Note Card - Full Width */}
            {/* <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                height: "185px"
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: "#e6eaf1",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <i className="bi bi-sticky fs-2 text-info"></i>
                </div>
                <div
                  style={{
                    fontFamily: "Barlow",
                    fontWeight: "600",
                    fontSize: "19px",
                    color: "black",
                    letterSpacing: "0.19px",
                    margin: "0"
                  }}
                >
                  Note
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px", color: "black" }}>
                  Lorem ipsum
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
      
        <AppSettingsModal
            show={showAppSettingsModal}
            onClose={() => setShowAppSettingsModal(false)}
            onSuccess={() => {
              fetchEmployeeData();
            }}
            employeeId={employeeId}
        />
      
    </>
  );
};

export default ShowEmployeeDetailsById;