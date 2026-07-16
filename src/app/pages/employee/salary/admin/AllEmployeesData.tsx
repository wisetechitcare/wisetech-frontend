import { resolveActiveOrgId } from '@utils/activeOrg';
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchAllEmployees, fetchEmpAttendanceStatistics } from "@services/employee";
import { fetchCompanyOverview } from "@services/company";
import { fetchAllEmployeeTotalSalaryOfYear, fetchAllEmployeeMonthlySalary } from "@services/employee";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { formatFiscalYearLabel } from "@utils/fiscalYearHelper";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { PageTitle } from "@metronic/layout/core";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
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
import SalaryPeriodToolbar from "../components/SalaryPeriodToolbar";

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
  const [totalNetPayable, setTotalNetPayable] = useState(0);
  const [totalTdsPayable, setTotalTdsPayable] = useState(0);
  const [totalTdsPaid, setTotalTdsPaid] = useState(0);
  const [hasProfessionalFeesData, setHasProfessionalFeesData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
  
  const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
  
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
        let netPayableSum = 0;
        let salaryPaidSum = 0;
        let tdsPayableSum = 0;
        let tdsPaidSum = 0;
        let hasProfessionalFees = false;
    
        if (salaryResponse.data && Array.isArray(salaryResponse.data)) {
          salaryResponse.data.forEach((item: any) => {
            const employeeId = item.employeeId?.toLowerCase();
            if (!employeeId) return;
            
            const previousAmount = salaryMap.get(employeeId) || 0;
            
            let currentAmount = 0;
            if (item._sum?.amountPaid) {
              currentAmount = Number(item._sum.amountPaid) || 0;
            } else if (item.amountPaid) {
              currentAmount = Number(item.amountPaid) || 0;
            }
            
            salaryMap.set(employeeId, previousAmount + currentAmount);

            // Independent totals
            salaryPaidSum += currentAmount;
            netPayableSum += Number(item.finalNetSalary || 0);
            tdsPaidSum += Number(item.governmentPaid || 0);

            // Extract Professional Fees for TDS Payable
            let breakdown: any = null;
            try {
              breakdown = typeof item.payrollBreakdownJson === 'string'
                ? JSON.parse(item.payrollBreakdownJson)
                : item.payrollBreakdownJson;
            } catch (e) {
              breakdown = null;
            }

            const professionalFeesItem = breakdown?.deductionBreakdown?.fixed?.['Professional Fees'];
            const profFees = Number(professionalFeesItem?.earned ?? professionalFeesItem?.value ?? professionalFeesItem ?? 0);
            if (professionalFeesItem?.isActive !== false && profFees > 0) {
              hasProfessionalFees = true;
            }
            tdsPayableSum += profFees;
          });
        }
    
        setTotalAmountPaid(salaryPaidSum);
        setTotalNetPayable(netPayableSum);
        setTotalTdsPayable(tdsPayableSum);
        setTotalTdsPaid(tdsPaidSum);
        setHasProfessionalFeesData(hasProfessionalFees);

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
  }, [companyId, alignment, fiscalYear, month, dateRanges, toggleChange]);
  
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
      if (!companyOverview || !(resolveActiveOrgId(companyOverview) ?? '')) {
        throw new Error("Company overview data not available");
      }
      
      const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
      const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', (resolveActiveOrgId(companyOverview) ?? ''));
      
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
    { accessorKey: "users", header: "Name", Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A", Footer: "Total" },
    { accessorKey: "designations", header: "Designation", Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A" },
    { accessorKey: "departments", header: "Department", Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A" },
    {
      accessorKey: "amountPaid",
      header: "Total Salary",
      Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue || 0),
      Footer: () => formatNumber(totalAmountPaid)
    },
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
  ], [handleEditClick, handleShowDetails, isAdmin, isLoading, totalAmountPaid]);



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
      <SalaryPeriodToolbar
        alignment={alignment}
        options={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Yearly', value: 'yearly' },
        ]}
        onAlignmentChange={(value) => setAlignment(value as "monthly" | "yearly")}
        periodLabel={alignment === 'monthly' ? month.format('MMM YYYY') : formatFiscalYearLabel(fiscalYear)}
        onPrevious={alignment === 'monthly' ? handlePrevMonth : handlePrevYear}
        onNext={alignment === 'monthly' ? handleNextMonth : handleNextYear}
        disablePrevious={isLoading}
        disableNext={isLoading}
      />

      {/* Summary Cards */}
      <div className="row g-5 mb-8">
        <div className="col-xl-4 col-md-6">
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white' }}>
            <div className="card-body p-6">
              <div className="d-flex flex-column">
                <span className="fw-bold fs-7 text-uppercase opacity-75 mb-2">Net Salary Payable</span>
                <span className="fs-2hx fw-bold">{formatNumber(totalNetPayable)}</span>
                <div className="mt-4 pt-4 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
                  <span className="fs-7 opacity-75">Target disbursement for {month.format('MMM YYYY')}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-xl-4 col-md-6">
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
            <div className="card-body p-6">
              <div className="d-flex flex-column">
                <span className="fw-bold fs-7 text-uppercase opacity-75 mb-2">Salary Paid</span>
                <span className="fs-2hx fw-bold">{formatNumber(totalAmountPaid)}</span>
                <div className="mt-4 pt-4 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
                  <span className="fs-7 opacity-75">Processed payments</span>
                  <span className="badge badge-light-success fs-8 fw-bold">
                    {totalNetPayable > 0 ? Math.round((totalAmountPaid / totalNetPayable) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-xl-4 col-md-6">
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #EB3349 0%, #F45C43 100%)', color: 'white' }}>
            <div className="card-body p-6">
              <div className="d-flex flex-column">
                <span className="fw-bold fs-7 text-uppercase opacity-75 mb-2">Salary Pending</span>
                <span className="fs-2hx fw-bold">{formatNumber(Math.max(0, totalNetPayable - totalAmountPaid))}</span>
                <div className="mt-4 pt-4 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
                  <span className="fs-7 opacity-75">Outstanding balance</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {hasProfessionalFeesData && (
          <>
            {/* Professional Fees Section */}
            <div className="col-xl-6 col-md-6">
              <Card className="shadow-sm border-0" style={{ backgroundColor: '#f8f9fa', borderLeft: '5px solid #007bff' }}>
                <div className="card-body p-5">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="text-muted mb-1 fs-7 fw-bold text-uppercase">Tax Deducted at Source (TDS) Payable</h5>
                      <span className="fs-1 fw-bold text-dark">{formatNumber(totalTdsPayable)}</span>
                    </div>
                    <div className="symbol symbol-50px">
                      <div className="symbol-label bg-light-primary">
                        <KTIcon iconName="percentage" className="fs-1 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="col-xl-6 col-md-6">
              <Card className="shadow-sm border-0" style={{ backgroundColor: '#f8f9fa', borderLeft: '5px solid #28a745' }}>
                <div className="card-body p-5">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="text-muted mb-1 fs-7 fw-bold text-uppercase">Tax Deducted at Source (TDS) Paid</h5>
                      <span className="fs-1 fw-bold text-dark">{formatNumber(totalTdsPaid)}</span>
                    </div>
                    <div className="symbol symbol-50px">
                      <div className="symbol-label bg-light-success">
                        <KTIcon iconName="check-circle" className="fs-1 text-success" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
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
          showColumnFooter={true}
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
