import { useEffect, useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import { KTIcon } from "@metronic/helpers";
import { fetchAllEmployees } from "@services/employee";
import MaterialTable from "app/modules/common/components/MaterialTable";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getAvatar } from "@utils/avatar";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { fetchAllBranches } from "@services/company";
import Loader from "@app/modules/common/utils/Loader";
import { getEmployeeStatusString } from "@utils/employeeStatus";
import StatusToggle from "@app/modules/common/components/StatusToggle";

type StatusType = "all" | "active" | "inactive";

interface StatusCounts {
  all: number;
  active: number;
  inactive: number;
}

const EmployeeListContent = () => {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("all");
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ all: 0, active: 0, inactive: 0 });
  const [currentPage, setCurrentPage] = useState(() => {
    // Restore page from sessionStorage on mount
    const saved = sessionStorage.getItem('employeeListPage');
    return saved ? parseInt(saved, 10) : 0;
  });
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const employeeRole = useSelector((state: RootState) => state.allEmployees?.list?.find((emp: any) => emp.employeeId === employeeId));

  const navigate = useNavigate();

  // Save current page to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('employeeListPage', currentPage.toString());
  }, [currentPage]);

  const handleEditClick = useCallback((employeeId: string) => {
    navigate(`/employees/edit/${employeeId}`, { state: { employeeId } });
  }, [navigate]);

  const handleWhatsAppShare = useCallback((employee: any) => {
    const message = `Employee Details:
    Name: ${employee.users}
    Designation: ${employee.designations}
    Department: ${employee.departments}
    Email: ${employee.companyEmailId}
    Phone: ${employee.companyPhoneNumber}
    Employee Code: ${employee.employeeCode}
    Branch: ${employee.branches}
    Status: ${employee.employeeStatus}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }, []);

  // Memoize base columns to prevent recreation on every render
  const baseColumns = useMemo(() => [
    {
      accessorKey: "avatar",
      header: "Profile Photo",
      Cell: ({ row }: any) => (
        <img
          src={getAvatar(row.original.avatar, row.original.gender)}
          alt="Avatar"
          style={{ width: 50, height: 50, borderRadius: "50%" }}
        />
      ),
    },
    {
      accessorKey: "users",
      header: "Name",
      Cell: ({ renderedCellValue, row }: any) => (
        <button
          className="btn btn-link p-0 text-start text-decoration-none"
          style={{
            color: "inherit",
            fontWeight: "600",
            fontSize: "14px",
          }}
          onClick={() => {
            navigate(`/employees/${row.original.id}`);
          }}
        >
          {renderedCellValue}
        </button>
      ),
    },
    {
      accessorKey: "companyEmailId",
      header: "Email Id",
      Cell: ({ renderedCellValue }: any) => renderedCellValue ? <a href={`mailto:${renderedCellValue}`}>{renderedCellValue}</a> : "N/A"
    },
    {
      accessorKey: "designations",
      header: "Designation",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "departments",
      header: "Department",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "companyPhoneNumber",
      header: "Company Phone Number",
      Cell: ({ renderedCellValue }: any) => renderedCellValue ? <a href={`tel:${renderedCellValue}`}>{renderedCellValue}</a> : "N/A"
    },
    {
      accessorKey: "dateOfJoining",
      header: "Date Of Joining",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
  ], [navigate]);

  // Memoize admin columns
  const adminColumns = useMemo(() => [
    {
      accessorKey: "createdAt",
      header: "Created On",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    // {
    //   accessorKey: "dateOfReJoining",
    //   header: "Date of Rejoining",
    //   Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    // },
    // {
    //   accessorKey: "dateOfReExit",
    //   header: "Date of Re-leaving",
    //   Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    // },
    {
      accessorKey: "employeeType",
      header: "Type of Employee",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "branches",
      header: "Branches",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "employeeStatus",
      header: "Status",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "employeeCode",
      header: "Employee Code",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "gender",
      header: "Gender",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "maritalStatus",
      header: "Marital Status",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "mealPreference",
      header: "Meal preference",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "dateOfExit",
      header: "Date Of Exit",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "referredBy",
      header: "Referred By",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "actions",
      header: "Actions",
      Cell: ({ row }: any) => (
        hasPermission(resourceNameMapWithCamelCase.employee, permissionConstToUseWithHasPermission.editOthers) ?
          <div className="d-flex gap-2">
            <button
              className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
              onClick={() => handleEditClick(row.original.id)}
              title="Edit Employee"
            >
              <KTIcon iconName='pencil' className='fs-3' />
            </button>
            <button
              className='btn btn-icon btn-bg-light btn-active-color-success btn-sm'
              onClick={() => handleWhatsAppShare(row.original)}
              title="Share on WhatsApp"
            >
              <i className="fab fa-whatsapp fs-3 text-success"></i>
            </button>
          </div>
          : "Not Allowed"
      )
    }
  ], [handleEditClick, handleWhatsAppShare]);

  // Determine columns based on role
  const isAdminRole = useMemo(() => {
    const roles = employeeRole?.roles as string[] | string | undefined;
    if (Array.isArray(roles)) {
      return roles.some((role) => typeof role === "string" && role.toLowerCase().includes("admin") || role === "admin");
    }
    if (typeof roles === "string") {
      return roles.toLowerCase() === "admin";
    }
    return false;
  }, [employeeRole]);

  const columns = useMemo(() =>
    isAdminRole ? [...baseColumns, ...adminColumns] : baseColumns,
    [isAdminRole, baseColumns, adminColumns]
  );
  
  
  useEffect(() => {
    async function fetchData() {
      try {
        // Use initialLoading only on first load, dataLoading for subsequent loads
        if (initialLoading) {
          setInitialLoading(true);
        } else {
          setDataLoading(true);
        }

        // Always fetch all employees to get counts
        const [employeesRes, branchesRes] = await Promise.all([
          fetchAllEmployees(), // No filter - get all employees
          fetchAllBranches()
        ]);

        const { data } = employeesRes;

        const { data: { branches: branchesData } } = branchesRes;

        setBranches(branchesData);

        // Mapping of employeeTypeId to employee type name
        const employeeTypeMap: Record<string, string> = {};

        const allMappedEmployees = data.employees.map((obj: Record<string, any>) => {
          let referredBy;
          let employeeNewStatus = getEmployeeStatusString(obj as any);

          if (obj?.referredById && data.employees) {
            referredBy = data.employees.find((employee: any) => employee.id === obj.referredById)
          }
          return {
            ...obj,
            users: `${obj.users.firstName} ${obj.users.lastName}`,
            designations: obj.designations ? obj?.designations?.role : "N/A",
            departments: obj.departments ? obj.departments.name : "N/A",
            dateOfJoining: obj.dateOfJoining ? dayjs(obj.dateOfJoining).format("DD/MM/YYYY") : "N/A",
            createdAt: obj.createdAt ? dayjs(obj.createdAt).format("DD/MM/YYYY") : "N/A",
            employeeType: employeeTypeMap[obj.employeeTypeId] || "N/A",
            dateOfExit: obj.dateOfExit ? dayjs(obj.dateOfExit).format("DD/MM/YYYY") : "N/A",
            dateOfReJoining: obj.dateOfReJoining ? dayjs(obj.dateOfReJoining).format("DD/MM/YYYY") : "N/A",
            dateOfReExit: obj.dateOfReExit ? dayjs(obj.dateOfReExit).format("DD/MM/YYYY") : "N/A",
            branches: branchesData.find((b: any) => b.id === obj.branchId)?.name || "N/A",
            employeeStatus: employeeNewStatus,
            gender: obj.gender === 0 ? "Male" : (obj.gender === 1 ? "Female" : (obj.gender === 2 ? "Other" : "N/A")),
            maritalStatus: obj.maritalStatus ? "Unmarried" : (obj.maritalStatus === 0 ? "Married" : "N/A"),
            referredBy: obj.referredById && referredBy ? `${referredBy.users.firstName} ${referredBy.users.lastName}` : "N/A",
            mealPreference: obj.veganMealPreference ? "Vegan" : obj.nonVegMealPreference ? "Non-Vegetarian" : obj.vegMealPreference ? "Vegetarian" : "N/A",
            avatar: getAvatar(obj.avatar, obj.gender),
          };
        });

        // Calculate counts
        const activeCount = allMappedEmployees.filter((emp: any) => emp.employeeStatus === "Active").length;
        const inactiveCount = allMappedEmployees.filter((emp: any) => emp.employeeStatus === "Inactive").length;
        setStatusCounts({
          all: allMappedEmployees.length,
          active: activeCount,
          inactive: inactiveCount
        });

        // Filter based on selectedStatus
        let filteredEmployees = allMappedEmployees;
        if (selectedStatus === "active") {
          filteredEmployees = allMappedEmployees.filter((emp: any) => emp.employeeStatus === "Active");
        } else if (selectedStatus === "inactive") {
          filteredEmployees = allMappedEmployees.filter((emp: any) => emp.employeeStatus === "Inactive");
        }

        setEmployees(filteredEmployees);
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setInitialLoading(false);
        setDataLoading(false);
      }
    }
    fetchData();
  }, [selectedStatus]);

  if (initialLoading) {
    return <Loader />;
  }

  return (
  <>
    <div className="d-flex flex-row flex-md-row align-items-center justify-content-between mt-5 w-100 gap-3">

  {/* Left side — Status Toggle */}
  <div className="d-flex align-items-center">
    <StatusToggle
      selectedStatus={selectedStatus}
      onStatusChange={setSelectedStatus}
      counts={statusCounts}
    />
  </div>

  {/* Right side — New Employee button */}
  {hasPermission(
    resourceNameMapWithCamelCase.employee,
    permissionConstToUseWithHasPermission.create
  ) && (
    <div
      className="card-toolbar text-end d-flex align-items-center justify-content-center"
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      data-bs-trigger="hover"
      title="Click to add new employee"
    >
      <Link to="/employees/create-new" className="btn btn-md btn-light-primary">
        <KTIcon iconName="plus" className="fs-2" />
        New Employee
      </Link>
    </div>
  )}
</div>


    {/* Table section */}
    <div className="" style={{ position: 'relative', minHeight: dataLoading ? '300px' : 'auto' }}>
      {dataLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <Loader />
        </div>
      )}
      <MaterialTable
        columns={columns}
        data={employees}
        tableName="Employees"
        employeeId={employeeId}
        enableColumnSpecificSearch={true}
      />
    </div>
  </>
);
};
export default EmployeeListContent;
