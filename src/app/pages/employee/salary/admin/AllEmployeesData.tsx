import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchAllEmployees, fetchEmpAttendanceStatistics } from "@services/employee";
import { fetchCompanyOverview } from "@services/company";
import { fetchAllEmployeeTotalSalaryOfYear, fetchAllEmployeeMonthlySalary } from "@services/employee";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import MaterialTable from "app/modules/common/components/MaterialTable";
import { PageTitle } from "@metronic/layout/core";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { toAbsoluteUrl } from "@metronic/helpers";
import { KTIcon } from "@metronic/helpers";
import ReactApexChart from "react-apexcharts";
import { MONTH } from '@constants/statistics';
import { YEAR } from '@constants/statistics';
import SalaryReport from "../personal/views/my-salary/SalaryReport";
import { Modal, Box } from '@mui/material';
import { fetchEmployeeLeaves } from '@services/employee';
import { saveFilteredPublicHolidays, saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import { fetchAllPublicHolidays } from '@services/company';
import { customLeaves, filterLeavesPublicHolidays, formatNumber } from "@utils/statistics";
import { Card, Container } from "react-bootstrap";

// Breadcrumbs
const employeesBreadCrumb = [
  { title: "Finance", path: "/employees", isSeparator: false, isActive: false },
  { title: "", path: "", isSeparator: true, isActive: false },
];

const AllEmployeesData = ({ fromAdmin = false }: { fromAdmin?: boolean }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const companyId = useSelector((state: RootState) => state.company.currentCompany.id);
  
  // Redux state selectors
  const monthlyStats = useSelector((state: RootState) => state.attendanceStats.monthly);
  
  const yearlyStats = useSelector((state: RootState) => state.attendanceStats.yearly);

  // State
  const [alignment, setAlignment] = useState<"monthly" | "yearly">("monthly");
  const [month, setMonth] = useState(dayjs());
  const [year, setYear] = useState(dayjs());
  const [fiscalYear, setFiscalYear] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [departmentTotals, setDepartmentTotals] = useState<{ name: string; total: number; color: string }[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [employeeSpecificStats, setEmployeeSpecificStats] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [totalAmountPaid, setTotalAmountPaid] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
  
  // Handle previous month
  const handlePrevMonth = useCallback(() => {
    setMonth(prevMonth => prevMonth.subtract(1, 'month'));
  }, []);
  
  // Handle next month
  const handleNextMonth = useCallback(() => {
    setMonth(prevMonth => prevMonth.add(1, 'month'));
  }, []);
  
  // Handle previous year
  const handlePrevYear = useCallback(() => {
    setYear(prevYear => prevYear.subtract(1, 'year'));
  }, []);
  
  // Handle next year
  const handleNextYear = useCallback(() => {
    setYear(prevYear => prevYear.add(1, 'year'));
  }, []);

  const handleToggleChange = useCallback((_: React.MouseEvent<HTMLElement>, newValue: "monthly" | "yearly") => {
    if (newValue !== null) setAlignment(newValue);
  }, []);

  // Memoized date ranges
  const dateRanges = useMemo(() => {
    if (alignment === 'monthly') {
      return {
        startDate: month.startOf('month').format('YYYY-MM-DD'),
        endDate: month.endOf('month').format('YYYY-MM-DD')
      };
    } else if (fiscalYear) {
      const [fiscalStartDate, fiscalEndDate] = fiscalYear.split(' to ');
      return {
        startDate: fiscalStartDate,
        endDate: fiscalEndDate
      };
    }
    return { startDate: '', endDate: '' };
  }, [alignment, month, fiscalYear]);

  // Fetch Fiscal Year
  useEffect(() => {
    if (!year) return;
    
    async function fetchFiscalYear() {
      try {
        const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
        setFiscalYear(`${startDate} to ${endDate}`);
      } catch (error) {
        console.error("Error generating fiscal year:", error);
        setError("Failed to generate fiscal year");
      }
    }
    fetchFiscalYear();
  }, [year]);

  // Fetch Employee Data and Salaries
  useEffect(() => {
    async function fetchEmployeesWithSalaries() {
      if (!companyId) return;
      if (!dateRanges.startDate || !dateRanges.endDate) return;
  
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch salary data based on alignment
        let salaryResponse: any = { success: false, data: [] };
    
        if (alignment === "yearly" && fiscalYear) {
          salaryResponse = await fetchAllEmployeeTotalSalaryOfYear(
            companyId,
            dateRanges.startDate,
            dateRanges.endDate
          );
        } else if (alignment === "monthly") {
          salaryResponse = await fetchAllEmployeeMonthlySalary(
            companyId,
            month.year(),
            month.month() + 1
          );
        }
    
        if (!salaryResponse?.success) {
          console.warn("No salary data found or request failed");
        }
    
        // Process salary data
        const salaryMap = new Map();
    
        if (salaryResponse.data && Array.isArray(salaryResponse.data)) {
          salaryResponse.data.forEach((item: any) => {
            const employeeId = item.employeeId?.toLowerCase();
            if (!employeeId) return;
            
            const previousAmount = salaryMap.get(employeeId) || 0;
            
            let currentAmount = 0;
            if (item._sum?.amountPaid) {
              currentAmount = parseInt(item._sum.amountPaid) || 0;
            } else if (item.amountPaid) {
              currentAmount = parseInt(item.amountPaid) || 0;
            }
            
            salaryMap.set(employeeId, previousAmount + currentAmount);
          });
        }

        // Calculate Total Amount Paid for All Employees
        const totalPaid = Array.from(salaryMap.values()).reduce((acc, curr) => acc + curr, 0);
        setTotalAmountPaid(totalPaid);

        // Fetch Employees
        const response = await fetchAllEmployees();
        const data = response?.data;
        
        if (!data?.employees?.length) {
          console.warn("No employee data available!");
          setEmployees([]);
          setDepartmentTotals([]);
          setIsLoading(false);
          return;
        }
  
        // Merge Employees & Salaries
        const mergedData = data.employees.map((employee: any) => {
          const employeeId = employee.id?.toLowerCase();
          if (!employeeId) return employee;
          
          const amountPaid = salaryMap.get(employeeId) || 0;
  
          return {
            ...employee,
            users: employee.users ? `${employee.users.firstName || ''} ${employee.users.lastName || ''}`.trim() : "N/A",
            designations: employee.designations ? employee.designations.role : "N/A",
            departments: employee.departments ? employee.departments.name : "N/A",
            departmentColor: employee.departments ? employee.departments.color : "#F44336",
            amountPaid,
          };
        });
  
        setEmployees(mergedData);
  
        // Calculate Total Amount by Department
        const departmentMap = new Map<string, { total: number; color: string }>();
  
        mergedData.forEach((employee: any) => {
          const departmentName = employee.departments || "Unknown";
          const departmentColor = employee.departmentColor || "#54fb00";
          const amountPaid = employee.amountPaid || 0;
  
          if (departmentMap.has(departmentName)) {
            const current = departmentMap.get(departmentName);
            if (current) {
              departmentMap.set(departmentName, {
                total: current.total + amountPaid,
                color: current.color,
              });
            }
          } else {
            departmentMap.set(departmentName, { total: amountPaid, color: departmentColor });
          }
        });
  
        // Convert Map to Array for Chart Data
        const departmentTotalsArray = Array.from(departmentMap.entries()).map(([name, data]) => ({
          name,
          total: data.total,
          color: data.color,
        }));
  
        setDepartmentTotals(departmentTotalsArray);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load employee data");
      } finally {
        setIsLoading(false);
      }
    }
  
    fetchEmployeesWithSalaries();
  }, [companyId, alignment, fiscalYear, month, dateRanges]);
  
  // ApexChart Configuration - Memoized to prevent unnecessary recalculations
  const chartConfig = useMemo(() => {
    const options: any = {
      chart: {
        type: "bar",
        height: 350,
      },
      grid: {
        show: false 
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          endingShape: "rounded",
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
      },
      xaxis: {
        categories: departmentTotals.map(dept => dept.name),
        labels: {
          style: {
            colors: departmentTotals.map(dept => dept.color),
          },
        },
      },
      yaxis: {
        title: {
          text: "Total Amount",
        },
        labels: {
          formatter: (val: number) => `${formatNumber(val)}`,
        },
      },
      fill: {
        opacity: 1,
        colors: departmentTotals.map((dept) => dept.color),
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${formatNumber(val)}`,
        },
      },
    };
    
    const series = [
      {
        name: "Total Amount",
        data: departmentTotals.map(dept => ({
          x: dept.name,
          y: dept.total,
          fillColor: dept.color, 
        })),
      },
    ];
    
    return { options, series };
  }, [departmentTotals]);

  // Handle Edit Employee - Navigate to edit page
  const handleEditClick = useCallback((employeeId: string) => {
    if (!employeeId) return;
    navigate(`/employees/edit/${employeeId}`, { state: { employeeId } });
  }, [navigate]);

  // Handle Show Employee Details - Fetch employee-specific data and open modal
  const handleShowDetails = useCallback(async (employeeId: string) => {
    if (!employeeId || !dateRanges.startDate || !dateRanges.endDate) {
      console.warn("Missing required data for showing employee details");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSelectedEmployeeId(employeeId);
    
    try {
      // Find the selected employee in our local state
      const emp = employees.find(emp => emp.id === employeeId);
      if (!emp) {
        throw new Error("Selected employee not found");
      }
      
      setSelectedEmployee(emp);
      
      // Fetch employee-specific attendance stats
      const response = await fetchEmpAttendanceStatistics(
        employeeId,
        dateRanges.startDate,
        dateRanges.endDate
      );
      setEmployeeSpecificStats(response.data.empAttendanceStatistics);
      
      // Fetch additional employee data (leaves, holidays)
      const { data: { companyOverview } } = await fetchCompanyOverview();
      if (!companyOverview || !companyOverview[0]?.id) {
        throw new Error("Company overview data not available");
      }
      
      const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
      const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyOverview[0].id);
      
      const totalLeaves = await customLeaves(leaves);
      // const filteredLeaves = filterLeavesPublicHolidays(dateRanges.startDate, dateRanges.endDate);
      
      dispatch(saveLeaves(totalLeaves));
      dispatch(saveFilteredPublicHolidays(publicHolidays));
      
      // Open the modal once all data is loaded
      setOpenModal(true);
    } catch (error) {
      console.error("Error showing employee details:", error);
      setError("Failed to load employee details");
    } finally {
      setIsLoading(false);
    }
  }, [employees, dateRanges, dispatch]);

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
    setSelectedEmployee(null);
    // setEmployeeSpecificStats([]);
  }, []);

  // Memoized table columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    { accessorKey: "users", header: "Name", Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A" },
    { accessorKey: "designations", header: "Designation", Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A" },
    { accessorKey: "departments", header: "Department", Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A" },
    { accessorKey: "amountPaid", header: "Total Salary", Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue || 0)},
    { 
      accessorKey: "details", 
      header: "Details", 
      Cell: ({row}: any) => (
        <button 
          className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm' 
          onClick={() => handleShowDetails(row.original.id)}
          disabled={isLoading}
        >
          <KTIcon iconName='eye' className='fs-3' />
        </button>
      )
    }, 
    ...(isAdmin ? [{
      accessorKey: "actions",
      header: "Actions",
      Cell: ({ row }: any) => (
        <button 
          className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm' 
          onClick={() => handleEditClick(row.original.id)}
          disabled={isLoading}
        >
          <KTIcon iconName='pencil' className='fs-3' />
        </button>
      ),
    }] : []),
  ], [handleEditClick, handleShowDetails, isAdmin, isLoading]);



  return (
    <>
      <Modal 
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="salary-report-title"
        aria-describedby="salary-report-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 850,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
        {/* Close Button */}
        <button
          onClick={handleCloseModal}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <i className="fa fa-close fs-3"></i>
        </button>

        {/* Salary Report Content */}
        {alignment === 'yearly' ? (
          <SalaryReport
            stats={employeeSpecificStats}
            keyword={YEAR}
            date={fiscalYear}
            employee={selectedEmployee}
            year={year.format('YYYY')}
            fromAdmin={true}
            isYearly={true}
            hideSummarySection={true}
            showSensitiveData={true}
          />
        ) : (
          <SalaryReport
            stats={employeeSpecificStats}
            keyword={MONTH}
            date={month.format('MMM YYYY')}
            month={month.format('MM')}
            year={year.format('YYYY')}
            employee={selectedEmployee}
            fromAdmin={true}
            hideSummarySection={true}
            showSensitiveData={true}
          />
        )}
        </Box>
      </Modal>

      <h3 className="fw-bold fs-1 mb-5 font-barlow">Employees List</h3>

      {/* Toggle and Date Selection */}
      <div className="d-flex flex-md-row justify-content-lg-between flex-column align-items-lg-center mb-8 gap-5 gap-lg-0">
        <ToggleButtonGroup 
          value={alignment} 
          exclusive 
          onChange={handleToggleChange} 
          aria-label="View Selection"
          sx={{
            '& .MuiToggleButton-root': { 
              borderRadius: '20px', 
              borderColor: '#B0BEC5 !important', 
              color: '#000 !important', 
              // margin: '0 8px', 
              padding: '6px 16px', 
              borderWidth: '2px', 
              fontWeight: '600', 
              marginRight:"10px"
              
            },
            '& .Mui-selected': { 
              borderColor: '#9D4141 !important', 
              color: '#9D4141 !important' 
            },
            '& .MuiToggleButton-root:hover': { 
              borderColor: '#9D4141 !important', 
              color: '#9D4141 !important' 
            },
          }}
        >
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="yearly">Yearly</ToggleButton>
        </ToggleButtonGroup>
    
        {/* Month Selector */}
        {alignment === 'monthly' && (
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-sm p-0" 
              onClick={handlePrevMonth}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous Month" />
            </button>
            <span className="mx-2 my-5">{month.format('MMM, YYYY')}</span>
            <button 
              className="btn btn-sm p-0" 
              onClick={handleNextMonth}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next Month" />
            </button>
          </div>
        )}

        {/* Yearly Selector */}
        {alignment === 'yearly' && (
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-sm p-0" 
              onClick={handlePrevYear}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous Year" />
            </button>
            <span className="mx-2 my-5">{fiscalYear}</span>
            <button 
              className="btn btn-sm p-0" 
              onClick={handleNextYear}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next Year" />
            </button>
          </div>
        )}
      </div>

      {/* Total Amount Paid Card */}
      <div className="d-flex justify-content-center justify-content-lg-end mb-4">
        <Card className="card-stats mb-2 mb-lg-0" style={{ width: '100%', maxWidth: '300px' }}>
          <div className="card-body p-4 d-flex flex-column align-items-center justify-content-center">
            <h5 className="card-title">
              Total{alignment === 'yearly' ? ' Yearly' : ' Monthly'} Amount Paid
            </h5>
            <p className="card-text">
              {formatNumber(totalAmountPaid)}
            </p>
          </div>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-4">{error}</div>
      )}

      {/* Employee Table */}
      <PageTitle breadcrumbs={employeesBreadCrumb}></PageTitle>
      <PageHeadingTitle />
      
      
        <MaterialTable 
          columns={columns} 
          data={employees} 
          employeeId={employeeIdCurrent}
          tableName="Employees" 
        />

      {/* ApexChart for Yearly and Monthly View */}
      {!isLoading && departmentTotals.length > 0 && (
        <div className="mt-8 card p-4">
          <h4 className="fw-bold fs-3 mb-4">Total Expense by Department</h4>
          <ReactApexChart 
            options={chartConfig.options} 
            series={chartConfig.series} 
            type="bar" 
            height={350} 
          />
        </div>
      )}
    </>
  );
};

export default AllEmployeesData;