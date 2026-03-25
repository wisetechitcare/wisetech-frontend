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
import ShowEmployeeDetailsById from "./ShowEmployeeDetailsById";
import { miscellaneousIcons } from "@metronic/assets/miscellaneousicons";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import { getAvatar } from "@utils/avatar";
import { resourceNameMapWithCamelCase, permissionConstToUseWithHasPermission } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { getEmployeeStatus, getEmployeeStatusString } from "@utils/employeeStatus";

const ShowEmployeeDetailsToggle = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const allemployees = useSelector((state: RootState) => state.allEmployees);
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const [employee, setEmployee] = useState<any>(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const dispatch = useDispatch<AppDispatch>();
  const employeeStatus = getEmployeeStatusString(employee);
  
  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await fetchCurrentEmployeeByEmpId(employeeId!);
      setEmployee(data.employee);
    };
    fetchData();
  }, [employeeId]);

  if (!employee) return <Loader />;

  const handleBackClick = () => {
    navigate(-1);
  };

  const { users, designations, isActive, avatar, gender, dateOfExit } = employee;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

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

  const handleEditClick = async (employeeId: string) => {
    navigate(`/employees/edit/${employeeId}`, { state: { employeeId } });
  };

  const handleTabChange = (
    event: React.MouseEvent<HTMLElement>,
    newTab: string
  ) => {
    if (newTab !== null) {
      setActiveTab(newTab);
    }
  };

  return (
    <div className="container-fluid mt-8">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-4 mb-md-6 gap-3">
        <div className="d-flex align-items-center w-100 w-md-auto">
          {/* Back Button */}
          <div
            className="rounded-circle p-0 mb-4 mb-md-6 me-3 cursor-pointer"
            onClick={handleBackClick}
          >
            <img src={miscellaneousIcons.leftArrow} alt="Back" />
          </div>

          {/* Profile Section */}
          <div className="d-flex align-items-center ms-2 ms-md-8 mb-4 mb-md-7">
            <img
              src={getAvatar(avatar, gender)}
              alt="Avatar"
              className="rounded-circle"
              style={{ width: "45px", height: "45px", objectFit: "cover" }}
            />
            <div className="ms-3">
              <h5 className="fw-bold mb-1" style={{ fontSize: "clamp(14px, 4vw, 18px)" }}>
                {users.firstName} {users.lastName}
              </h5>
              <div className="d-flex align-items-center flex-wrap text-muted" style={{ fontSize: "clamp(11px, 3vw, 13px)" }}>
                <span className="me-2">#{employee.employeeCode}</span>
                <span className="me-2 d-none d-sm-inline">•</span>
                <span className="me-2 me-sm-3">
                  {designations?.role || "Role not specified"}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    // backgroundColor: 'white',
                    color: employeeStatus?.trim()?.toLowerCase() === "active" ? '#3ECD45' : '#8A8A8A',
                    border: employeeStatus?.trim()?.toLocaleLowerCase() === "active" ? '2px solid #3ECD45' : '2px solid #8A8A8A',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: employeeStatus?.trim()?.toLowerCase() === "active" ? '#3ECD45' : '#8A8A8A',
                      marginRight: '6px',
                    }}
                  />
                  {getEmployeeStatusString(employee)}
                </span>
              </div>
            </div>
          </div>
        </div> 

        {/* Right Buttons */}
        {hasPermission(resourceNameMapWithCamelCase.employee, permissionConstToUseWithHasPermission.editOthers) && (
          <div className="d-flex gap-2 w-100 w-md-auto">
            <button
              className="btn btn-primary rounded-2 px-3 px-md-4 w-100 w-md-auto"
              style={{ fontSize: "clamp(12px, 3vw, 14px)" }}
              onClick={() => handleEditClick(employeeId!)}
            >
              Edit Details
            </button>
            {/* <button className="btn btn-primary rounded-2 px-4">
              Account Setting
            </button> */}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="d-flex justify-content-start border-bottom mb-4 me-4 overflow-auto">
        <ToggleButtonGroup
          value={activeTab}
          exclusive
          onChange={handleTabChange}
          aria-label="view selection"
          sx={{
            display: "flex",
            flexWrap: "nowrap",
            gap: { xs: "6px", sm: "8px" },
            justifyContent: "flex-start",
            "& .MuiToggleButton-root": {
              borderRadius: "20px",
              borderColor: "#A0B4D2 !important",
              color: "#000000 !important",
              paddingX: {
                xs: "16px",
                sm: "32px",
                md: "45px",
              },
              borderWidth: "2px",
              fontWeight: "600",
              minWidth: {
                xs: "80px",
                sm: "100px",
              },
              fontSize: {
                xs: "11px",
                sm: "12px",
              },
              height: { xs: "32px", sm: "36px" },
              fontFamily: "Inter",
              backgroundColor: "transparent !important",
              "&:hover": {
                backgroundColor: "transparent !important",
                borderColor: "#9D4141 !important",
                color: "#9D4141 !important",
              },
            },
            "& .Mui-selected": {
              borderColor: "#9D4141 !important",
              color: "#9D4141 !important",
              backgroundColor: "transparent !important",
            },
          }}
        >
          <ToggleButton value="details">Details</ToggleButton>
          {/* <ToggleButton value="configure">Configure</ToggleButton> */}
        </ToggleButtonGroup>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "details" && (
          <div className="tab-pane fade show active">
            <ShowEmployeeDetailsById employeeId={employeeId!} />
          </div>
        )}
        {activeTab === "configure" && (
          <div className="tab-pane fade show active">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-gear fs-1 text-muted mb-3"></i>
                <h5 className="fw-semibold text-muted">Configure Settings</h5>
                <p className="text-muted small mb-0">
                  Configuration options will be available here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowEmployeeDetailsToggle;
