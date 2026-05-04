import TextInput from '@app/modules/common/inputs/TextInput';
import { CUSTOM_SALARY, DEDUCTIONS, GROSS_PAY, LEAVE_MANAGEMENT, SANDWICH_LEAVE_KEY } from '@constants/configurations-key';
import { HOLIDAYS, LATE_CHECKIN, MONTH, ON_LEAVE, Status, YEAR, LEAVE_MANAGEMENT_TYPE } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { IPayment } from '@models/employee';
import { Attendance } from '@models/employee';
import SalarySlipTemplate from '@pages/employee/salary/SalarySlipTemplate';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { fetchAppSettings } from '@redux/slices/appSettings';
import { saveLeaves, saveToggleChange } from '@redux/slices/attendanceStats';
import { Employee, saveHourlySalaryOfCurrentEmployee, saveHourlySalaryOfSelectedEmployee } from '@redux/slices/employee';
import { RootState, store } from '@redux/store';
import { fetchAllPublicHolidays, fetchCompanyOverview, fetchConfiguration, fetchSalaryDataForDateRangeMonthly } from '@services/company';
// import { createNewPayment, createUpdateGrossPayDeductions, deletePaymentById, fetchAllPayments, fetchEmpAttendanceStatistics, fetchEmployeeLeaves, fetchGrossPayDeductions, fetchReimbursementsForEmployee, sendSalarySlipToEmployee, updatePaymentById } from '@services/employee';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { createNewPayment, createUpdateGrossPayDeductions, deletePaymentById, fetchAllPayments, fetchEmpAttendanceStatistics, fetchEmployeeLeaves, fetchGrossPayDeductions, fetchReimbursementsForEmployee, sendSalarySlipToEmployee, updatePaymentById, getAllLeaveManagements } from '@services/employee';
import { uploadUserAsset } from '@services/uploader';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { salaryCalculations, donutaDataLabel, getWorkingDaysInMonth, multipleRadialBarData, totalCheckInCheckOutMinutes, getWorkingDaysInYear, getCountOfMonthsEmployeePresentOrOnLeaveInAYear, getTotalWeekendDaysInMonth, getTotalWeekendsInYear, formatNumber, formatStringINR, filterLeavesPublicHolidays, customLeaves, getTotalDaysInMonth, getTotalDaysInYear, getTotalWeekendsInYearFilteredByDOJOrCurrentYearDate, getTotalWeekendDaysInMonthFilteredByDOJOrCurrentMonthDate, SalaryCalculations, geAllDaysInAMonth, getAllDaysInAYear, salaryCalculationsForDays } from '@utils/statistics';
import dayjs, { Dayjs } from 'dayjs';
import { Form, Formik, FormikValues } from 'formik';
import { useEffect, useState } from 'react';
import { Card, Container, Row, Col, Button, Modal } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import {miscellaneousIcons} from '@metronic/assets/miscellaneousicons/index'
import { LeaveStatus } from '@constants/attendance';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import {getAllUnPaidLeavesForCurrentYear, getAllUnPaidLeavesCurrentMonth, getAllPaidLeavesCurrentMonth, getAllPaidLeaveOfYear, getAllPaidLeaveOfYearFilteredByStartAndEndDate} from '@utils/sandwhichConfiguration'
import DateInput from '@app/modules/common/inputs/DateInput';
import SalaryIncrementModal from '@app/modules/employee/salary/SalaryIncrementModal';

const grossPayDeductionsSchema = Yup.object({
    grossPayOthers: Yup.number().typeError("Gross Pay Others must be a valid number!").required().label('Gross Pay Others'),
    // advancedLoan: Yup.number().typeError("Advanced Loan must be a valid number!").required().label('Advanced Loan'),
    // foodExpenses: Yup.number().typeError("Food Expenses must be a valid number!").required().label('Food Expenses'),
    // retention: Yup.number().typeError("Retention must be a valid number!").required().label('Retention'),
    deductionsOthers: Yup.number().typeError("Deduction Others must be a valid number!").required().label('Deduction Others'),
});

const paymentSchema = Yup.object({
    amountPaid: Yup.number().typeError("Payment must be a valid number!").required().label('Payment')
});

type Allowance = {
    name: string;
    value: number;
    type: string;
};

type SalaryStructure = {
    [key: string]: Allowance;
};

const SalaryReport = ({ stats, keyword, date, employee, year, month = dayjs().format('MM'), fromAdmin = false, isYearly = false, hideSummarySection = false, showSensitiveData }: { stats: Attendance[], keyword: string, date: string, employee: Employee, year: string, month?: string, fromAdmin?: boolean, isYearly?: boolean, hideSummarySection?: boolean, showSensitiveData: boolean }) => {

    // Helper function to get effective end date considering employee exit date
    const getEffectiveEndDate = (isYearly: boolean, year: string, month: string, fiscalEndDate: string, dateOfExit?: string) => {
        let endDate = isYearly ? fiscalEndDate : dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
        const currentDate = dayjs().format('YYYY-MM-DD');
        
        if (dateOfExit) {
            const exitDate = dayjs(dateOfExit).format('YYYY-MM-DD');
            endDate = dayjs(endDate).isAfter(exitDate) ? exitDate : endDate;
        }
        
        return dayjs(endDate).isAfter(currentDate) ? currentDate : endDate;
    };

    const dispatch = useDispatch();
    const [totalWorkingHour, setTotalWorkingHour] = useState(0);
    const allowOverTime = employee?.allowOverTime || false;
    const toggleChange = store.getState().attendanceStats.toggleChange;
    const appSettingWrokingHours = useSelector((state: RootState) => state.appSettings.workingHours);    
    const appSettingsDeductionTime = useSelector((state: RootState) => state.appSettings.deductionTime);
    const [employeeReimbursements, setEmployeeReimbursements] = useState([]);
    const userId = employee.userId;
    const employeeId = employee?.id;    
    const dateOfJoining = dayjs(new Date(employee.dateOfJoining));
    const [startDateForDaysCount, setStartDateForDaysCount] = useState<Dayjs>()
    const [endDateOdDaysCount, setEndDateOdDaysCount] = useState<Dayjs>()
    const [lateAttendanceStats, setLateAttendanceStats] = useState<Attendance[]>([]);
    const [show, setShow] = useState(false);
    const [paymentShow, setPaymentShow] = useState(false);
    const [salaryIncrementShow, setSalaryIncrementShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [paymentId, setPaymentId] = useState('');
    // const [leaveDeduct, setLeaveDeduct] = useState(0);
    // what percent of daily salary to deduct on late checkin
    const [multiLateCheckinDeductionPercent, setMultiLateCheckinDeductionPercent] = useState(0);
    // how many late checkins to consider for deduction eg: 4
    const [multipleLateCheckinCountLimit, setMultipleLateCheckinCountLimit] = useState(0);
    const [sandwhichConfiguration, setsandwhichConfiguration] = useState<any>({});
    const [allowances, setAllowancesDeduct] = useState<SalaryStructure>({});
    const [deductionsRule, setDeductionsRule] = useState({});
    const [payments, setPayments] = useState<IPayment[]>([]);
    const [totalUnpaidLeaves, setTotalUnpaidLeaves] = useState(0);
    const [paidLeaves, setPaidLeaves] = useState(0);
    const [grossPayDeductions, setGrossPayDeductions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalWeekndsCount, setTotalWeekndsCount] = useState<number>(0);
    const [totalWeekendFilteredCount, setTotalWeekendfilteredCount] = useState(0)
    const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
    const [publicHolidaysFiltered, setPublicHolidaysFiltered] = useState([])
    const [totalDaysInMonth, setTotalDaysInMonth] = useState<number>(0);
    const [startDateOfMonthOrYear, setStartDateOfMonthOrYear] = useState("")
    const [totalGrossPayFixed, setTotalGrossPayFixed] = useState<SalaryCalculations[]>();
    const [basicSalary, setBasicSalary] = useState(0)
    const [totalWorkingDay, setTotalWorkingDay] = useState(0)
    const [fiscalStartDate, setFiscalStartDate] = useState('')
    const [fiscalEndDate, setFiscalEndDate] = useState('')
    const [totalGrossPayEarned, setTotalGrossPayEarned] = useState(0)
    const [totalGrossPayEarned2, setTotalGrossPayEarned2] = useState(0)
    const [leaveConfigurations, setLeaveConfigurations] = useState()
    const [totalDaysOfMonthOrYear, setTotalDaysOfMonthOrYear] = useState(0) // used for filtering variable pay based on the monthly working days
    const [totalListOfMonthsPresent, setTotalListOfMonthsPresent] = useState<Set<number>>(new Set())
    const [allDaysForMonthOrYear, setAllDaysForMonthOrYear] = useState(0) // used for filtering variable pay based on the monthly working days
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]); // State for day-wise shifts
    const [leaveEncashments, setLeaveEncashments] = useState<any[]>([]);
    const [totalEncashmentAmount, setTotalEncashmentAmount] = useState(0);
    // Initialize form states with proper typing
    const [totalFinalMonthlyWorkingHour, setTotalFinalMonthlyWorkingHour] = useState(0);
    // API response data state
    const [salaryApiData, setSalaryApiData] = useState<any>(null);
    const [apiGrossPayBreakdown, setApiGrossPayBreakdown] = useState<any>(null);
    const [apiDeductionBreakdown, setApiDeductionBreakdown] = useState<any>(null);

    const [initialState, setInitialState] = useState({
        grossPayOthers: 0.00,
        advancedLoan: 0.00,
        foodExpenses: 0.00,
        retention: 0.00,
        deductionsOthers: 0.00,
    });

    const [paymentInitialState, setPaymentInitialState] = useState({
        amountPaid: 0.00,
        paidAt: dayjs().format('YYYY-MM-DD'),
    });

    // async function fetchLeaveConfiguration() {
    //         const { data: { configuration } } = await fetchConfiguration('leave management');
    //         const jsonObject = JSON.parse(configuration.configuration);
    //         setConfiguration(jsonObject);
    //         setRuleId(configuration.id);
    // }

    useEffect(() => {
        if(!fiscalStartDate || !fiscalEndDate) return;

        let startDate = dayjs(fiscalStartDate).format('YYYY-MM-DD');
        let endDate = dayjs(fiscalEndDate).format('YYYY-MM-DD');
        let filteredEndDate = dayjs().format('YYYY-MM-DD');
        let filteredStartDate = dayjs().format('YYYY-MM-DD');

        if(dayjs(startDate).isAfter(dayjs(endDate))) {
            startDate = dayjs(endDate).format('YYYY-MM-DD');
        }

        if(!isYearly) {
            startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
            endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
            filteredEndDate = dayjs().isSameOrBefore(dayjs(endDate)) ? dayjs().format('YYYY-MM-DD') : dayjs(endDate).format('YYYY-MM-DD');
            filteredStartDate = dayjs(`${year}-${month}-01`).isSameOrBefore(dayjs(dateOfJoining)) ? dayjs(dateOfJoining).format('YYYY-MM-DD') : dayjs(`${year}-${month}-01`).format('YYYY-MM-DD');
        }
        else{
            filteredStartDate = dayjs(startDate).isSameOrBefore(dayjs(dateOfJoining)) ? dayjs(dateOfJoining).format('YYYY-MM-DD') : dayjs(startDate).format('YYYY-MM-DD');
            filteredEndDate = dayjs().isSameOrBefore(dayjs(endDate)) ? dayjs().format('YYYY-MM-DD') :dayjs(endDate).format('YYYY-MM-DD');
        }

        let daysCount = dayjs(filteredEndDate).diff(dayjs(filteredStartDate), 'day') + 1;
        if(daysCount<=0){
            daysCount = 0;
        }

        let monthsArray : Set<number> = new Set();
        let tempStartDate = dayjs(filteredStartDate);
        
        while(tempStartDate.isSameOrBefore(filteredEndDate)){
            monthsArray.add(new Date(tempStartDate.format('YYYY-MM-DD')).getMonth()+1);
            const tempDate = new Date(tempStartDate.format('YYYY-MM-DD'))
            tempStartDate = dayjs(tempDate.setMonth(tempDate.getMonth()+1));
        }
        setTotalListOfMonthsPresent(monthsArray);
 
        setTotalDaysOfMonthOrYear(daysCount);
        let totalOverAllDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
        setAllDaysForMonthOrYear(totalOverAllDays);

        // COMMENTED OUT - Fetch attendance statistics (now using API data)
        // async function fetchStats() {
        //     const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, startDate, endDate);            
        //     setLateAttendanceStats(empAttendanceStatistics);
        // };

        // fetchStats();
    }, [employeeId, fiscalStartDate, fiscalEndDate, isYearly, startDateOfMonthOrYear, month]);

    // COMMENTED OUT - Fetch day-wise shifts (now using API data)
    // useEffect(() => {
    //     async function loadDayWiseShifts() {
    //         try {
    //             const response = await fetchDayWiseShifts();
    //             setDayWiseShifts(response.data || []);
    //         } catch (error) {
    //             console.error("Error fetching day-wise shifts:", error);
    //             setDayWiseShifts([]); // Use empty array as fallback
    //         }
    //     }
    //     loadDayWiseShifts();
    // }, []);

    // const publicHolidays = donutaDataLabel(stats);
    // const publicHolidays = useSelector((state:RootState)=>state.attendanceStats.filteredPublicHolidays)

    // useEffect(()=>{
    //     let finalAmount = totalGrossPayEarned;
    //     console.log("totalGrossPayEarned:: ",totalGrossPayEarned);
    //     console.log("totalGrossPayFixed:: ",totalGrossPayFixed);
    //     totalGrossPayFixed?.map((fixed, index) => {
    //         if(fixed?.name.toLowerCase() != "basic salary"){
    //             (fixed?.earned).replace(/[₹,]/g, "")
    //             finalAmount += Number((fixed?.earned).replace(/[₹,]/g, ""))
    //         }
    //     })
    //     setTotalGrossPayEarned2(finalAmount);
    // },[totalGrossPayEarned, totalGrossPayFixed])
    
    const resolvedMonth = month === '0' ? dayjs().format('MM') : month;
    
    // Calculate salary components - Fallback calculations when API data is not available
    // NOTE: Using API data when available for monthly view, these calculations serve as fallback for yearly view or when API fails
    
    const monthlySalary = isYearly ? (basicSalary || 0) : (basicSalary / 12 || 0); // use yearly salary incase of the yearly toggle
    
    // const totalWorkingDay = (isYearly ? getWorkingDaysInYear(dayjs(year).format('YYYY')) : getWorkingDaysInMonth(dayjs().format('YYYY'), dayjs().format('MM')));
    
    // useEffect(()=>{
    //     if(!year || !month){
    //         return;
    //     }
    //     let allDays = 0;

    //     if(!isYearly){
    //         allDays = geAllDaysInAMonth(dayjs().format('YYYY'), dayjs(month).format('MM'));
    //         setTotalWorkingDay(allDays);
            
    //         return;
    //     }

    //     if(!fiscalEndDate || !fiscalStartDate) {
    //         return;
    //     }

    //     async function getYearlyCount() {
    //         allDays = getAllDaysInAYear(dayjs(fiscalStartDate), dayjs(fiscalEndDate));
    //         setTotalWorkingDay(allDays);
    //     }
    //     getYearlyCount();
    // },[isYearly, year, month, fiscalStartDate, fiscalEndDate])
    
    const holidays = publicHolidays.length || 0;
    const filteredHolidays = publicHolidaysFiltered.length || 0;
    const leavesTaken = paidLeaves + totalUnpaidLeaves;
    const paidLeavesTaken = paidLeaves;
    const unpaidLeavesTaken = totalUnpaidLeaves;
    
    // const holidays = leavesHolidaysMap.get(HOLIDAYS) || 0;
    
    const dailySalary = monthlySalary / totalWorkingDay;
    let hourlySalary = totalWorkingHour ? dailySalary / totalWorkingHour : 1;
    
    hourlySalary=Number(hourlySalary.toFixed(2))
    
    useEffect(()=>{
        if(fromAdmin){
            dispatch(saveHourlySalaryOfSelectedEmployee(hourlySalary));
        }else{
            dispatch(saveHourlySalaryOfCurrentEmployee(hourlySalary));
        }
    },[hourlySalary])

    const totalMonthlyWorkingHour = ((!isYearly ? totalDaysOfMonthOrYear : totalDaysInMonth) - filteredHolidays - totalWeekendFilteredCount - paidLeaves) * totalWorkingHour;
    const [deductionHours, deductionMinutes] = appSettingsDeductionTime.split(' ')[0].split(':');
    useEffect(() => {
        setTotalFinalMonthlyWorkingHour(totalMonthlyWorkingHour);
    }, [totalMonthlyWorkingHour]);
    
    const deductionTimeInMinutes = Number(deductionHours || 0) * 60 + Number(deductionMinutes || 0);
    // Calculate earnings - Fallback calculations for when API data is not available
    // NOTE: These calculations are used for yearly view or when monthly API data is unavailable
    
    const workingTime = Math.floor(totalCheckInCheckOutMinutes(stats, deductionTimeInMinutes, appSettingWrokingHours, true) / 60);
    
    let workingTimeInMinutes = totalCheckInCheckOutMinutes(stats, deductionTimeInMinutes, appSettingWrokingHours, true);
     
    const differenceTime = totalMonthlyWorkingHour - workingTime;

    const overTime = differenceTime < 0 ? Math.abs(differenceTime) : 0;
    workingTimeInMinutes = workingTimeInMinutes - overTime*60;
    const workingTimeEarned = ((workingTimeInMinutes) * (hourlySalary/60));
    // const workingTimeEarned = (workingTime * (hourlySalary));
    const remainingHours = (workingTimeInMinutes - workingTimeInMinutes % 60) / 60;
    const remainingMinutes = workingTimeInMinutes % 60;
    
    const overTimeEarned = overTime * hourlySalary;
    
    const remainingTime = differenceTime > 0 ? differenceTime : 0;
    const remainingTimeEarned = (remainingTime * hourlySalary);
    const holidaysEarned = ((filteredHolidays) * dailySalary);
    const leavesTakenEarned = ((paidLeavesTaken || 0) * dailySalary);

    const totalWeekendEarned = totalWeekendFilteredCount * dailySalary;
    // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
    // const totalReimbursementAmount = employeeReimbursements.reduce(
    //     (acc: number, reimbursement: any) => acc + Number(reimbursement?.amount || 0), 
    //     0
    // );

    // Calculate total gross pay using current state values
    let totalGrossPayEarnedFinal =
        workingTimeEarned  + holidaysEarned + leavesTakenEarned +
        (Number(grossPayDeductions[0]?.grossPayOthers) || 0) + totalWeekendEarned + totalEncashmentAmount
        // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
        // let totalGrossPayEarnedFinal =
        //     workingTimeEarned  + holidaysEarned + leavesTakenEarned +
        //     (Number(grossPayDeductions[0]?.grossPayOthers) || 0) + totalReimbursementAmount + totalWeekendEarned
    if(allowOverTime){
        totalGrossPayEarnedFinal += overTimeEarned;
    }

    useEffect(()=>{
        console.log("totalGrossPayEarnedFinal:: ",totalGrossPayEarnedFinal);
        setTotalGrossPayEarned(totalGrossPayEarnedFinal);
    },[totalGrossPayEarnedFinal, overTimeEarned])
    
   const grossPayVariable  = [
    ...(allowOverTime ? [{ name: 'Working Time', value: `${totalFinalMonthlyWorkingHour} hrs`, earned: `${formatNumber(totalMonthlyWorkingHour*(hourlySalary))}` }] : 
    [{ name: 'Working Time', value: `${workingTime} hrs`, earned: `${formatNumber(workingTime*(hourlySalary))}` }]),
    ...(allowOverTime ? [{ name: 'Over Time', value: `${workingTime} - ${totalMonthlyWorkingHour} = ${workingTime - totalMonthlyWorkingHour} hrs`, earned: `${formatNumber((workingTime - totalMonthlyWorkingHour)*hourlySalary)}` }] : []),
    { name: 'Remaining Time', value: `${remainingMinutes} Min`, earned: `${formatNumber(remainingMinutes*hourlySalary/60)}` },
    { name: 'Holidays', value: `${filteredHolidays} Days`, earned: `${formatNumber(holidaysEarned)}` },
    { name: 'Weekends', value: `${totalWeekendFilteredCount} Days`, earned: `${formatNumber(totalWeekendEarned)}` },
    { name: 'Paid Leaves', value: `${paidLeavesTaken} Days`, earned: `${formatNumber(leavesTakenEarned)}` },
    ...(leaveEncashments.length > 0 ? [{ name: 'Leave Encashment', value: `${leaveEncashments[0]?.leaveCount}`, earned: `${formatNumber(totalEncashmentAmount)}` }] : []),
    { name: 'Others', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.grossPayOthers || 0)}` },
    // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
    // ...(employeeReimbursements?.length > 0 ? [{
    //     name: 'Reimbursements',
    //     value: `${employeeReimbursements.length}`,
    //     earned: `${formatNumber(totalReimbursementAmount)}`
    // }] : [])
];
    
//    const grossPayVariable  = [
//     { name: 'Working Time', value: `${remainingHours} hrs ${remainingMinutes} mins`, earned: `${formatNumber(workingTimeEarned)}` },
//     ...(allowOverTime ? [{ name: 'Over Time', value: `${overTime} hrs`, earned: `${formatNumber(overTimeEarned)}` }] : []),
//     // { name: 'Remaining Time', value: `${remainingTime} hrs`, earned: `${formatNumber(remainingTimeEarned)}` },
//     { name: 'Holidays', value: `${filteredHolidays} Days`, earned: `${formatNumber(holidaysEarned)}` },
//     { name: 'Weekends', value: `${totalWeekendFilteredCount} Days`, earned: `${formatNumber(totalWeekendEarned)}` },
//     { name: 'Paid Leaves', value: `${paidLeavesTaken} Days`, earned: `${formatNumber(leavesTakenEarned)}` },
//     { name: 'Others', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.grossPayOthers || 0)}` },
//     ...(employeeReimbursements?.length > 0 ? [{
//         name: 'Reimbursements',
//         value: `${employeeReimbursements.length}`,
//         earned: `${formatNumber(totalReimbursementAmount)}`
//     }] : [])
// ];



    // --------------------gross pay fixed--------------

    const grossPayFixed = salaryCalculationsForDays(totalDaysOfMonthOrYear, allDaysForMonthOrYear, allowances, parseFloat(employee?.ctcInLpa)/12);
    let totalGrossPayFixedAmount = grossPayFixed.reduce((acc, grossPayFixed) => acc + parseFloat((grossPayFixed.earned).replace(/[₹,]/g, "")), 0);

    useEffect(() => {
        let grossPayFixed = salaryCalculationsForDays(totalDaysOfMonthOrYear, allDaysForMonthOrYear, allowances, parseFloat(employee?.ctcInLpa)/12);
        let finalGrossPayFixed = grossPayFixed.map((grossPayData) => {
            if(grossPayData?.name?.toLocaleLowerCase()=="basic salary"){
                return {
                    ...grossPayData,
                    earned: formatNumber(totalGrossPayEarned)
                }
            }
 
            return grossPayData
        })
        setTotalGrossPayFixed(finalGrossPayFixed);

      }, [allowances, employee?.ctcInLpa, totalGrossPayEarned]);
    
    // ------------------ Taxes ------------------------
    const countOfMonthsEmployeePresentInAYear = getCountOfMonthsEmployeePresentOrOnLeaveInAYear(stats);

    let taxes = salaryCalculationsForDays(totalDaysOfMonthOrYear, allDaysForMonthOrYear, deductionsRule, parseFloat(employee.ctcInLpa)/12, isYearly, countOfMonthsEmployeePresentInAYear, true, totalListOfMonthsPresent.size);

    
    const totalTaxes = taxes.reduce((acc, tax) => acc + parseFloat((tax.earned).replace(/[₹,]/g, "")), 0);
    
    // --------------------deductions------------------ 
    // NOTE: Fallback deductions calculations - Using API deductionBreakdown when available
    const lateAttendance = multipleRadialBarData(stats, dayWiseShifts).get(LATE_CHECKIN);
    
    // const lateAttendanceEarned = ((lateAttendance || 0) * leaveDeduct);
    const unPaidLeavesEarned = unpaidLeavesTaken * dailySalary;
    const amountToDeductForLateCheckinBasedOnPercentage = Math.floor(dailySalary * (multiLateCheckinDeductionPercent/100));
    const multipleLateCheckinEarned = parseInt(((Math.floor((lateAttendance||0)/multipleLateCheckinCountLimit)) * amountToDeductForLateCheckinBasedOnPercentage).toString());
    // setMultiLateCheckinDeductionPercent
    // setMultipleLateCheckinCountLimit
    const totalDeductionsEarned = 
        // lateAttendanceEarned + 
        multipleLateCheckinEarned + 
        (Number(grossPayDeductions[0]?.advancedLoan) || 0) + 
        (Number(grossPayDeductions[0]?.foodExpenses) || 0) + 
        (Number(grossPayDeductions[0]?.retention) || 0) + 
        (Number(grossPayDeductions[0]?.deductionsOthers) || 0) + 
        totalTaxes 
        // +  unPaidLeavesEarned
    
    const deductions = [
    {name:"Multiple Late Checkin", value: `${lateAttendance} Days`, earned: `${formatNumber(multipleLateCheckinEarned)}` },
    // { name: 'Late Attendance', value: `${lateAttendance} Days`, earned: `${formatNumber(lateAttendanceEarned)}` },
    // { name: 'Unpaid Leaves', value: `${totalUnpaidLeaves} Days`, earned: `${formatNumber(unPaidLeavesEarned)}` },
    // { name: 'Advanced Loan', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.advancedLoan || 0)}` },
    // { name: 'Food Expenses', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.foodExpenses || 0)}` },
    // { name: 'Retention', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.retention || 0)}` },
    // ...((lateAttendance || 0) >= multipleLateCheckinCountLimit ? [{name:"Multiple Late Checkin", value: `${lateAttendance} Days`, earned: `${formatNumber(multipleLateCheckinEarned)}` }] : []),
    { name: 'Others', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.deductionsOthers || 0)}` },
];

    // ------------------- Others ---------------

    const totalPayableDays = (workingTime / totalWorkingHour) + (overTime / totalWorkingHour) + (filteredHolidays || 0) + (paidLeavesTaken || 0) + (totalWeekendFilteredCount || 0);
    
    const netPayable = salaryApiData ? Math.round(Number(salaryApiData.netAmount.replace(/[₹,]/g, ''))) : Math.round(totalGrossPayEarned2 - totalDeductionsEarned);
    
    let totalPayment = payments.reduce((acc: number, payment: IPayment) => {
        const amount = Number(payment.amountPaid);
        return acc + amount;
    }, 0);

    const remainingPayment = netPayable - totalPayment;
    
    // Handler functions
    const handleClose = () => {
        setShow(false);
        setEditMode(false);
    }

    const handlePaymentClose = () => {
        setPaymentShow(false);
    }

    const handleSalaryIncrementClose = () => {
        setSalaryIncrementShow(false);
    }

    const handleSalaryIncrementOpen = () => {
        setSalaryIncrementShow(true);
    }

    const handleSalaryIncrementSuccess = () => {
        // Refresh salary data or any other necessary actions
        // You can call any data fetching functions here if needed
        dispatch(saveToggleChange(!toggleChange));
    }

    const handleEdit = () => {
        setShow(true);
    }

    const handlePaymentEdit = (payment?: IPayment) => {
        setPaymentShow(true);
        if (payment?.id !== undefined) {
            setEditMode(true);
            setPaymentId(payment.id);
            setPaymentInitialState({
                amountPaid: payment.amountPaid,
                paidAt: dayjs(payment.paidAt).format('YYYY-MM-DD')
            });
        } else {
            setPaymentInitialState({
                amountPaid: 0,
                paidAt: dayjs().format('YYYY-MM-DD')
            });
            setEditMode(false);
        }
    }

    const handlePaymentDelete = async (payment: IPayment) => {
        try {
            await deletePaymentById(payment.id);
            successConfirmation('Payment deleted successfully');
            fetchPayments();
            dispatch(saveToggleChange(!toggleChange));
        } catch (e) {
            errorConfirmation('Error Occured');
            console.log(e);
        }
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            const keys = Object.keys(values);
            keys.map((key) => {
                values[key] = parseInt(values[key]);
            });
 
            values['employeeId'] = employee.id;
            values['month'] = month;
            values['year'] = year;

            setLoading(true);
            console.log("valuescreateUpdateGrossPayDeductions:: ",values);
            
            await createUpdateGrossPayDeductions(values);
            setLoading(false);
            successConfirmation('Salary Report updated successfully');
            setShow(false);
            getGrossPayDeductions();
        } catch (e) {
            setLoading(false);
            errorConfirmation("Something Went Wrong. Try again after some time!");
            setShow(false);
        }
    }

    const handlePaymentSubmit = async (values: any, actions: FormikValues) => {
        const initialAmountPaid = paymentInitialState?.amountPaid;
        const initialPaidAt = paymentInitialState?.paidAt;

        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            values = {
                ...values,
                employeeId: employee.id,
                month,
                year,
                companyId,
                paidAt: dayjs(values.paidAt).format('YYYY-MM-DD'),
            };

            const newTotalPayment = (totalPayment + parseFloat(values.amountPaid)) - initialAmountPaid;

            if (newTotalPayment > netPayable) {
                errorConfirmation("Payment should be less than NET PAYABLE ");
                return;
            }

            setPaymentLoading(true);

            if (editMode) {
                await updatePaymentById(paymentId, values);
                setPaymentLoading(false);
                successConfirmation('Payment updated successfully');
                setPaymentShow(false);
                setEditMode(false);
                fetchPayments();
                dispatch(saveToggleChange(!toggleChange));
                return;
            }
            const payload = { ...values };
            await createNewPayment(payload);
            setPaymentLoading(false);
            successConfirmation('Payment created successfully');
            setPaymentShow(false);
            dispatch(saveToggleChange(!toggleChange));
            fetchPayments();
        } catch (err) {
            setPaymentLoading(false);
            errorConfirmation("Something Went Wrong. Try again after some time!");
            setPaymentShow(false);
        }
    }

    // Helper functions to transform API response data
    const transformGrossPayFixed = (fixed: any) => {
        if (!fixed) return [];
        return Object.entries(fixed).map(([name, data]: [string, any]) => ({
            name,
            value: `${data.value}${data.type === 'percentage' ? '%' : ''}`,
            earned: formatNumber(data.earned)
        }));
    };

    const transformGrossPayVariable = (variable: any) => {
        if (!variable) return [];
        return Object.entries(variable).map(([name, data]: [string, any]) => ({
            name,
            value: data.value,
            earned: formatNumber(data.earned)
        }));
    };

    const transformDeductionFixed = (fixed: any) => {
        if (!fixed) return [];
        return Object.entries(fixed).map(([name, data]: [string, any]) => ({
            name,
            value: `${data.value}${data.type === 'percentage' ? '%' : ''}`,
            earned: formatNumber(data.earned)
        }));
    };

    const transformDeductionVariable = (variable: any) => {
        if (!variable) return [];
        // Handle single object structure
        return [{
            name: 'Variable Deduction',
            value: variable.value,
            earned: formatNumber(variable.earned)
        }];
    };

    async function getStartDateOfMonthOrYearForCalculationOfLeavesHolidays(isYearly: boolean, month: string, year: string, dateOfJoining: string) {
        let startDateOfMonthOrYearForCalculation = dayjs().format('YYYY-MM-DD');
        if(isYearly){
            const res = await generateFiscalYearFromGivenYear(dayjs(year))
            startDateOfMonthOrYearForCalculation = dayjs(res?.startDate).format('YYYY-MM-DD');
        }
        else{
            startDateOfMonthOrYearForCalculation = dayjs(month).startOf('month').format('YYYY-MM-DD');
        }

        if(dayjs(dateOfJoining).isAfter(dayjs(startDateOfMonthOrYearForCalculation))){
            startDateOfMonthOrYearForCalculation = dayjs(dateOfJoining).format('YYYY-MM-DD');
        }
        else{
            startDateOfMonthOrYearForCalculation = dayjs(startDateOfMonthOrYearForCalculation).format('YYYY-MM-DD');
        }
        setStartDateOfMonthOrYear(startDateOfMonthOrYearForCalculation);
    }

    useEffect(()=>{
        if(!dateOfJoining || !month || !year) return;

        const monthStartDate = `${year}-${month}-01`
        
        getStartDateOfMonthOrYearForCalculationOfLeavesHolidays(isYearly, monthStartDate, year, dayjs(dateOfJoining).format('YYYY-MM-DD'));
        
    },[isYearly, dateOfJoining, year, month])

    useEffect(()=>{
        if(!year) return;
        async function generateFiscalYear() {
            const res = await generateFiscalYearFromGivenYear(dayjs(year));
            setFiscalStartDate(res?.startDate);
            setFiscalEndDate(res?.endDate);
        }
        generateFiscalYear();
    },[year])

    // Data fetching functions
    async function fetchLeaveConfiguration() {
        try {
            // Calculate month boundaries for configuration fetching
            const monthStart = `${year}-${month.padStart(2, '0')}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const monthEnd = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

            const [customConfiguration, grossPayConfiguration, deductionsConfiguration, sandwhichConfiguration, leaveConfiguration] = await Promise.all([
                fetchConfiguration(CUSTOM_SALARY, monthStart, monthEnd),
                fetchConfiguration(GROSS_PAY, monthStart, monthEnd),
                fetchConfiguration(DEDUCTIONS, monthStart, monthEnd),
                fetchConfiguration(SANDWICH_LEAVE_KEY, monthStart, monthEnd),
                fetchConfiguration(LEAVE_MANAGEMENT, monthStart, monthEnd)
            ]);

            const jsonObjectGrossPay = JSON.parse(grossPayConfiguration.data.configuration.configuration);
            const jsonObjectCustom = JSON.parse(customConfiguration.data.configuration.configuration);
            const jsonObjectDeductions = JSON.parse(deductionsConfiguration.data.configuration.configuration);
            console.log("jsonObjectGrossPay:: ",jsonObjectGrossPay);
            console.log("jsonObjectCustom:: ",jsonObjectCustom);
            console.log("jsonObjectDeductions:: ",jsonObjectDeductions);
            
            const jsonObjectSandwhich = JSON.parse(sandwhichConfiguration.data.configuration.configuration);
            const jsonObjectLeave = JSON.parse(leaveConfiguration.data.configuration.configuration);

            setAllowancesDeduct(jsonObjectGrossPay);
            setDeductionsRule(jsonObjectDeductions);
            // setLeaveDeduct(jsonObjectCustom["Late Checkin"].value || 0);
            setMultiLateCheckinDeductionPercent(Number(jsonObjectCustom["Late Checkin"].deduction_amount) || 0);
            setMultipleLateCheckinCountLimit(Number(jsonObjectCustom["Late Checkin"].period) || 0);
            
            setsandwhichConfiguration(jsonObjectSandwhich);
            setLeaveConfigurations(jsonObjectLeave);
            
        } catch (error) {
            console.error("Error fetching leave configuration:", error);
        }
    }

    async function fetchPayments() {
        if (!employee?.id) {
            console.warn('⚠️ [SalaryReport] Cannot fetch payments: Employee ID is missing');
            return;
        }
        
        try {
            const { data: { salaries } } = await fetchAllPayments(employee.id, month, year);
  
            setPayments(salaries);
        } catch (error) {
            console.error("Error fetching payments:", error);
        }
    }

    

    async function getGrossPayDeductions() {
        if (!employee?.id) {
            console.warn('⚠️ [SalaryReport] Cannot fetch gross pay deductions: Employee ID is missing');
            return;
        }
        
        try {
            const { data: { gpd } } = await fetchGrossPayDeductions(employee.id, month, year);

            if (gpd.length > 0) {
                setInitialState({
                    grossPayOthers: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.grossPayOthers), 0),
                    advancedLoan: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.advancedLoan), 0),
                    foodExpenses: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.foodExpenses), 0),
                    retention: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.retention), 0),
                    deductionsOthers: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.deductionsOthers), 0)
                });
            } else {
                setInitialState({
                    grossPayOthers: 0.00,
                    advancedLoan: 0.00,
                    foodExpenses: 0.00,
                    retention: 0.00,
                    deductionsOthers: 0.00
                });
            }

            setGrossPayDeductions(gpd);
        } catch (error) {
            console.error("Error fetching gross pay deductions:", error);
        }
    }

    async function fetchLeaveEncashments() {
        try {
            const response = await getAllLeaveManagements(employeeId);
            const allLeaveManagements = response.data.leaveManagements || [];

            // Filter only CASH type and approved (status === 1) for the current month/year
            const cashEncashments = allLeaveManagements.filter((lm: any) => {
                const isApproved = lm.status === 1;
                const isCash = lm.managementType === LEAVE_MANAGEMENT_TYPE.CASH;
                const createdDate = dayjs(lm.createdAt);

                if (isYearly) {
                    // For yearly view, check if it's in the fiscal year
                    return isApproved && isCash &&
                           createdDate.isBetween(fiscalStartDate, fiscalEndDate, null, '[]');
                } else {
                    // For monthly view, check if it's in the current month
                    return isApproved && isCash &&
                           createdDate.format('YYYY-MM') === `${year}-${month}`;
                }
            });

            setLeaveEncashments(cashEncashments);

            // Calculate total encashment amount
            const totalAmount = cashEncashments.reduce((acc: number, lm: any) => {
                return acc + (Number(lm.totalAmount) || 0);
            }, 0);

            setTotalEncashmentAmount(totalAmount);
        } catch (error) {
            console.error("Error fetching leave encashments:", error);
            setLeaveEncashments([]);
            setTotalEncashmentAmount(0);
        }
    }

    async function fetchLeavesAndReimbursements() {
        if (!year || !month || !employeeId || !startDateOfMonthOrYear || !fiscalEndDate) {
            console.error('Missing required parameters for fetching leaves', year, month, employeeId);
        return;
        }

        try {
            setIsLoading(true);

            // Create base date object once for consistency
            const baseDate = dayjs(`${year}-${month}-01`);
                if (!baseDate.isValid()) {
                    throw new Error(`Invalid date constructed from year: ${year}, month: ${month}`);
            }

            // Get effective end date considering employee exit date
            const effectiveEndDate = getEffectiveEndDate(isYearly, year, month, fiscalEndDate, employee?.dateOfExit || "");

            // Log the processing attempt

        // Prepare all promises 
            const unpaidLeavesPromise = isYearly
                ? getAllUnPaidLeavesForCurrentYear(baseDate, sandwhichConfiguration, fromAdmin, [employee], dayjs(startDateOfMonthOrYear))
                : getAllUnPaidLeavesCurrentMonth(baseDate, dayjs(startDateOfMonthOrYear), sandwhichConfiguration, fromAdmin, [employee]);

            const paidLeavesPromise = isYearly
                ? getAllPaidLeaveOfYearFilteredByStartAndEndDate(baseDate, sandwhichConfiguration, fromAdmin, [employee], dayjs(startDateOfMonthOrYear))
                : getAllPaidLeavesCurrentMonth(baseDate, dayjs(startDateOfMonthOrYear), sandwhichConfiguration, fromAdmin, [employee]);
 
            // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
            // const reimbursementsPromise = isYearly
            //     ? Promise.resolve([])
            //     : (
            //         async () => {
            //         const startDate = baseDate.startOf('month');
            //         const endDate = baseDate.endOf('month');

            //         try {
            //             const { data: { reimbursements } } = await fetchReimbursementsForEmployee(
            //                 employeeId, 
            //                 startDate.format('YYYY-MM-DD'),
            //                 endDate.format('YYYY-MM-DD')
            //             );
            //             return reimbursements?.filter((r: any) => r.status === Status.Approved) || [];
            //         } catch (error) {
            //             console.error("Error fetching reimbursements:", error);
            //             return [];
            //         } 
            //     })();

            // Execute all promises in parallel
            const [unpaidLeaves, paidLeavesResult] = await Promise.all([
                unpaidLeavesPromise,
                paidLeavesPromise,
                // reimbursementsPromise
            ]);

            // Apply additional filtering for employee exit date if needed
            // Note: The utility functions should handle date filtering internally,
            // but if additional filtering is needed based on exit date, it can be added here
            let filteredUnpaidLeaves = Number(unpaidLeaves) || 0;
            let filteredPaidLeaves = Number(paidLeavesResult) || 0;

            if (employee?.dateOfExit) {
                const exitDate = dayjs(employee.dateOfExit);
                // The leave calculation functions already consider date ranges,
                // but if they don't properly handle exit dates, additional filtering logic
                // could be implemented here based on the specific leave data structure
            }

            setTotalUnpaidLeaves(filteredUnpaidLeaves);
            setPaidLeaves(filteredPaidLeaves);
            // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
            // setEmployeeReimbursements(reimbursementsResult || []);
            dispatch(saveToggleChange(!toggleChange));

        } catch (error) {
            console.error("Leaves fetch error:", error);
            setTotalUnpaidLeaves(0);
            setPaidLeaves(0);
            // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
            // setEmployeeReimbursements([]);
            setIsLoading(false);
        } finally {
        setIsLoading(false);
        }
    }

    // Main data loading effect - loads configuration and payment data
    // NOTE: This loads essential data for payments, increments, email, download, and modify features
    // The new API provides gross pay and deduction breakdowns, but this still loads payment data and configurations
    useEffect(() => {
        let isMounted = true;
  
        const loadSalaryData = async () => {
        try {
            setIsLoading(true);

            // 1. Fetch leave configuration (sandwich settings) - Required for modify functionality
            await fetchLeaveConfiguration();
  
            // 2. Fetch global app settings (working hours, etc.) - Required for app functionality
            await dispatch(fetchAppSettings() as any);
  
            // 3. Fetch gross pay deductions (depends on app settings) - Essential for modify feature
            await getGrossPayDeductions();
  
            // 4. Fetch salary payments (independent) - Essential for payment features
            await fetchPayments();
  
            // 5. COMMENTED OUT - Fetch leaves and reimbursements (now using API data)
            // await fetchLeavesAndReimbursements();

            // 6. COMMENTED OUT - Fetch leave encashments (now using API data) 
            // await fetchLeaveEncashments();

        }   catch (error) {
                console.error('Error loading salary report data:', error);
            } finally {
                setIsLoading(false);
            }
        };
  
        // Only run if component is still mounted
        if (isMounted) {
            loadSalaryData();
        }

        return () => {
            // Cleanup to avoid setting state on unmounted component
            isMounted = false;
        };
    }, [employeeId, year, month, fromAdmin, dispatch, isYearly, startDateOfMonthOrYear, employee?.dateOfExit, fiscalEndDate]);

    // COMMENTED OUT - Fetch leave encashments when fiscal dates change (now using API data)
    // useEffect(() => {
    //     if (!fiscalStartDate || !fiscalEndDate || !employeeId) return;
    //     fetchLeaveEncashments();
    // }, [fiscalStartDate, fiscalEndDate, employeeId, year, month, isYearly]);

    useEffect(()=>{
        if(!employee?.ctcInLpa) {
            // console.log("ctc of employee not found");
            return
        };
        
        const data = allowances["Basic Salary"];
        const value = data?.value;
        const type = data?.type;
        const fixedctc = parseFloat(employee?.ctcInLpa);
        let finalSalary= 0;
        if(type?.toLocaleLowerCase()=="percentage"){
            finalSalary = fixedctc * (Number(value)/100);
            
            setBasicSalary(finalSalary);
        }else{
            finalSalary = Number(value);
            
            setBasicSalary(finalSalary);
        }
        
        setBasicSalary(finalSalary);
    },[allowances, employee, isYearly])

    // Update working hours when app settings change
    useEffect(() => {
        setTotalWorkingHour(appSettingWrokingHours);
    }, [appSettingWrokingHours]);
    
    // COMMENTED OUT - Update total weekends count (now using API data)
    // useEffect(() => {
    //     if(!startDateOfMonthOrYear || !fiscalEndDate) return;
    //     const fetchTotalWeekendsCount = async () => {
    //         // Get effective end date considering employee exit date
    //         const effectiveEndDate = getEffectiveEndDate(isYearly, year, month, fiscalEndDate, employee?.dateOfExit || "");
    //         
    //         const weekendsMonthlyUnfiltered = await getTotalWeekendDaysInMonth(year, Number(resolvedMonth) -1);
    //         const weekendsMonthly = await getTotalWeekendDaysInMonthFilteredByDOJOrCurrentMonthDate(year, Number(resolvedMonth) -1, dayjs(startDateOfMonthOrYear));            
    //         const weekendsYearlyUnfiltered = await getTotalWeekendsInYear(dayjs(year), isYearly);
    //         const totalWeekendsYearly = await getTotalWeekendsInYearFilteredByDOJOrCurrentYearDate(dayjs(year), isYearly, dayjs(startDateOfMonthOrYear));
    //         
    //         // Apply additional filtering for employee exit date
    //         let filteredWeekends;
    //         if (employee?.dateOfExit) {
    //             const exitDate = dayjs(employee.dateOfExit);
    //             const baseWeekends = isYearly ? totalWeekendsYearly : weekendsMonthly;
    //             
    //             // Calculate how many weekends fall after the exit date and subtract them
    //             let weekendsAfterExit = 0;
    //             const periodStart = dayjs(startDateOfMonthOrYear);
    //             const periodEnd = isYearly ? dayjs(fiscalEndDate) : dayjs(`${year}-${month}-01`).endOf('month');
    //             
    //             // If exit date is before the period start, no adjustment needed
    //             if (exitDate.isBefore(periodStart)) {
    //                 filteredWeekends = 0;
    //             } else if (exitDate.isAfter(periodEnd)) {
    //                 // If exit date is after the period end, no adjustment needed
    //                 filteredWeekends = baseWeekends;
    //             } else {
    //                 // Count weekends between exit date and period end
    //                 let currentDate = exitDate.add(1, 'day'); // Start counting from day after exit
    //                 while (currentDate.isSameOrBefore(periodEnd)) {
    //                     if (currentDate.day() === 0 || currentDate.day() === 6) { // Sunday = 0, Saturday = 6
    //                         weekendsAfterExit++;
    //                     }
    //                     currentDate = currentDate.add(1, 'day');
    //                 }
    //                 filteredWeekends = baseWeekends - weekendsAfterExit;
    //             }
    //             
    //             setTotalWeekendfilteredCount(Math.max(0, filteredWeekends));
    //         } else {
    //             setTotalWeekendfilteredCount(isYearly ? totalWeekendsYearly : weekendsMonthly);
    //         }
    //         
    //         setTotalWeekndsCount(isYearly ? weekendsYearlyUnfiltered : weekendsMonthlyUnfiltered);
    //     };
    //     fetchTotalWeekendsCount();

    // }, [year, resolvedMonth, startDateOfMonthOrYear, fiscalEndDate, employee?.dateOfExit]);
    

    // COMMENTED OUT - Fetch public holidays and company data (now using API data)
    // useEffect(()=>{
    //     if(!startDateOfMonthOrYear || !fiscalEndDate) return;
    //     
    //     const fetchalldata = async ()=>{
    //          const { data: { companyOverview } } = await fetchCompanyOverview();
    //          const { startDate, endDate } = await generateFiscalYearFromGivenYear(dayjs(year));
    //               if (!companyOverview || !companyOverview[0]?.id) {
    //                 throw new Error("Company overview data not available");
    //               }
    //               const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyOverview[0].id);
    //              
    //               // Get effective end date considering employee exit date
    //               const effectiveEndDate = getEffectiveEndDate(isYearly, year, month, fiscalEndDate, employee?.dateOfExit || "");
    //               
    //               //filter holiday for current month/year
    //               let filterPublicHolidays = isYearly ? publicHolidays.filter((date:any)=>{
    //                 return dayjs(date.date).isBetween(startDate, endDate) && !date?.isWeekend
    //               }) : publicHolidays.filter((date:any)=>{
    //                 return dayjs(date.date).format('MM') === month && !date?.isWeekend
    //               })
    //               console.log("filteredHolidaysBasedOnMonth:: ",filterPublicHolidays);
    //               
    //               // Consolidated filtering logic with effective end date
    //               const filteredbasedOnDateOfExit = filterPublicHolidays.filter((date:any)=>{
    //                 return dayjs(date.date).isSameOrAfter(startDateOfMonthOrYear) && 
    //                        dayjs(date.date).isSameOrBefore(effectiveEndDate) && 
    //                        !date?.isWeekend && 
    //                        (!date?.from || date?.from === '') && 
    //                        (!date?.to || date?.to === '')
    //               })
    //             
    //               setPublicHolidays(filterPublicHolidays)
    //               setPublicHolidaysFiltered(filteredbasedOnDateOfExit)
    //     }
    //     fetchalldata()
    // },[employeeId,month,isYearly,startDateOfMonthOrYear, employee, fiscalEndDate])


    // COMMENTED OUT - Get total count of days in a month (now using API data)
    // useEffect(()=>{
    //     const fetchTotalCount = async () => {
    //         const totalDaysInMonth = await getTotalDaysInMonth(year, Number(resolvedMonth) - 1); // month is 0 based index
    //         const totalDaysInYear = await getTotalDaysInYear(year);
    //         setTotalDaysInMonth( isYearly ? totalDaysInYear : totalDaysInMonth);
    //     }
    //     fetchTotalCount();
    // },[year,resolvedMonth,isYearly])

    // Fetch monthly salary data from new API endpoint
    useEffect(() => {
        const fetchMonthlySalaryData = async () => {
            if (!employeeId || !month || !year || isYearly) return; // Only for monthly view
            
            try {
                setIsLoading(true);
                const startDate = `${year}-${month.padStart(2, '0')}-01`;
                const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
                
                const response = await fetchSalaryDataForDateRangeMonthly({
                    employeeId,
                    startDate,
                    endDate
                });
                
                if (response?.message?.salaryData?.length > 0) {
                    const salaryData = response.message.salaryData[0];
                    setSalaryApiData(salaryData);
                    setApiGrossPayBreakdown(salaryData.grossPayBreakdown);
                    setApiDeductionBreakdown(salaryData.deductionBreakdown);
                } else {
                    setSalaryApiData(null);
                    setApiGrossPayBreakdown(null);
                    setApiDeductionBreakdown(null);
                }
            } catch (error) {
                console.error('Error fetching monthly salary data:', error);
                setSalaryApiData(null);
                setApiGrossPayBreakdown(null);
                setApiDeductionBreakdown(null);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchMonthlySalaryData();
    }, [employeeId, month, year, isYearly]);

    // Show loading state while data is being fetched
    if (isLoading) {
        return (
            <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Container>
        );
    }

    return (
        <>
        <style jsx>{`
            .sensitive-data-hidden {
                filter: blur(5px);
                user-select: none;
                transition: filter 0.3s ease;
            }
            
            .sensitive-data-visible {
                filter: none;
                transition: filter 0.3s ease;
            }
            
            .privacy-toggle {
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: background-color 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .privacy-toggle:hover {
                background-color: #f8f9fa;
            }
        `}</style>
        {!hideSummarySection &&(
            <Container fluid className="my-4 w-100 px-0">
                <Row className="g-4">
                    <Col md={6}>
                        <Card className="p-4 shadow-sm h-100 w-100">
                            <Card.Body>
                                <Card.Title className="fw-bold">{keyword == YEAR ? 'Year' : keyword == MONTH ? 'Month' : ''}</Card.Title>
                                <Row className="mt-3">
                                    <Col xs={6}><p>Payment Date</p></Col>
                                    <Col xs={6}><p className="text-end">{date}</p></Col>
                                </Row>
                                <Row>
                                    <Col xs={6}><p>Regime Opted</p></Col>
                                    <Col xs={6}><p className="text-end">New Regime</p></Col>
                                </Row>
                                <Row>
                                    <Col xs={6}><p>Payable Days</p></Col>
                                    <Col xs={6}><p className="text-end">{totalPayableDays}</p></Col>
                                </Row>
                                <hr />
                                <Row className="mt-2">
                                    <Col xs={6}><p>Net Payable</p></Col>
                                    <Col xs={6}>
                                        <p className={`text-end fw-bold ${netPayable < 0 ? 'text-danger' : 'text-success'} ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                            {formatNumber(netPayable)}
                                        </p>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col xs={6}>Remaining Payment</Col>
                                    <Col xs={6} className="text-end fw-bold ">
                                        <p className={`text-end fw-bold ${remainingPayment < 0 ? 'text-danger' : 'text-success'} ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                            {formatNumber(remainingPayment)}
                                        </p>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={6}>
                        <Card className="p-4 shadow-sm h-100 w-100">
                            <Card.Body>
                                <Card.Title className="fw-bold">Payment Details</Card.Title>
                                {payments.length > 0 ? payments.map((payment, index) => (
                                    <Row className="align-items-center mt-3" key={index}>
                                        <Col xs={1}>
                                            <span className="text-success fs-5">✔️</span>
                                        </Col>
                                        <Col>
                                            <p className="mb-0">{`Payment ${index + 1}`}</p>
                                            <p className="mb-0">{`Date - ${dayjs(payment.paidAt).format('DD-MM-YYYY')}`}</p>
                                        </Col>
                                        <Col className="text-end">
                                            <p className={`mb-0 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{payment.amountPaid}</p>
                                        </Col>
                                        {fromAdmin && (
                                            <button
                                                className="btn btn-icon btn-active-color-primary btn-sm pr-0"
                                                onClick={() => handlePaymentEdit(payment)}
                                                style={{ backgroundColor: 'transparent', border: 'none' }}>
                                                <KTIcon iconName="pencil" className="fs-3" />
                                            </button>
                                        )}
                                        {fromAdmin &&
                                            <button
                                                className="btn btn-icon btn-active-color-primary btn-sm pr-0"
                                                onClick={() => handlePaymentDelete(payment)}
                                                style={{ backgroundColor: 'transparent', border: 'none' }}>
                                                <KTIcon iconName="trash" className="fs-3" />
                                            </button>}
                                    </Row>
                                )) :
                                    <Row className="align-items-center mt-3">
                                        <Col xs={1}>
                                            <span className="text-success fs-5">❌</span>
                                        </Col>
                                        <Col>
                                            <p className="mb-0">No Payments</p>
                                        </Col>
                                        <Col className="text-end">
                                            <p className="mb-0">{date}</p>
                                        </Col>
                                    </Row>}
                            </Card.Body>

                            <div className="d-flex justify-content-end mt-4 gap-2">
                                {(fromAdmin && keyword == MONTH) &&
                                    <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} onClick={() => handlePaymentEdit()}>
                                        Add Payments
                                    </Button>}
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Container>)}
            <Container fluid className="my-4 w-100 px-0">
                
            </Container>
            <Container fluid className="my-4 w-100 px-0">
                <Card className="p-4 shadow-sm w-100">
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}} className='my-3 mx-1'>
                        <h4 className="fw-bold mb-4">Report</h4>
                        {/* <PDFDownloadLink document={
                            <SalarySlipTemplate
                                grossPayVariable={grossPayVariable}
                                totalGrossPayEarned={`${formatNumber(totalGrossPayEarned)}`}
                                grossPayFixed={grossPayFixed}
                                deductions={deductions}
                                totalDeductionsEarned={`${formatNumber(totalDeductionsEarned)}`}
                                taxes={taxes}
                                employee={employee}
                                finalAmount={formatNumber(Math.abs(totalGrossPayEarned - totalDeductionsEarned))}
                                totalPayableDays={totalPayableDays}
                                date={date}
                                paidLeaves={paidLeaves}
                                unpaidLeaves={totalUnpaidLeaves}
                            />
                        } fileName="salaryslip.pdf" className="me-2" >
                            <Button>
                                Download Report (Pdf)
                            </Button>
                        </PDFDownloadLink> */}
                        <div className="d-flex justify-content-end mb-4 md:justify-content-center">
                        <PDFDownloadLink document={
                            <SalarySlipTemplate
                                grossPayVariable={grossPayVariable}
                                totalGrossPayEarned={`${formatNumber(totalGrossPayEarned)}`}
                                grossPayFixed={grossPayFixed}
                                deductions={deductions}
                                totalDeductionsEarned={`${formatNumber(totalDeductionsEarned)}`}
                                taxes={taxes}
                                employee={employee}
                                finalAmount={formatNumber(Math.round(Math.abs(totalGrossPayEarned - totalDeductionsEarned)))}
                                totalPayableDays={totalPayableDays}
                                date={date}
                                paidLeaves={paidLeaves}
                                unpaidLeaves={0}
                            />
                        } fileName="salaryslip.pdf" className="me-2" >
                            <Button>
                                Download Report (Pdf)
                            </Button>
                        </PDFDownloadLink>

                        <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} onClick={ 
                            async ()=> {
                            setLoading(true);
                            const blob = await pdf(<SalarySlipTemplate
                                grossPayVariable={grossPayVariable}
                                totalGrossPayEarned={`${formatNumber(totalGrossPayEarned)}`}
                                grossPayFixed={grossPayFixed}
                                deductions={deductions}
                                totalDeductionsEarned={`${formatNumber(totalDeductionsEarned)}`}
                                taxes={taxes}
                                employee={employee}
                                finalAmount={formatNumber(Math.abs(totalGrossPayEarned - totalDeductionsEarned))}
                                totalPayableDays={totalPayableDays}
                                date={date}
                                paidLeaves={paidLeaves}
                                unpaidLeaves={0}
                            />).toBlob();
                            const form = new FormData();
                            const fileFinal = new File([blob], `${userId}-SalarySlip-${Date.now()}.pdf`, { type: 'application/pdf' });
                            form.append("file", fileFinal);
                            let fileUploadedUrl;
                            try {
                                const {
                                    data: { path },
                                } = await uploadUserAsset(form, userId, "salaryreport"); 
                                fileUploadedUrl = path;
                            } catch (error) {
                                console.error("Failed to upload file. Please try again.");
                            }
                            try {
                                const data = {
                                    path: fileUploadedUrl,
                                    employeeId : employee?.id
                                };
                                const res = await sendSalarySlipToEmployee(data);
                                if(res?.statusCode==200 && !res.hasError){
                                    successConfirmation("Salary slip sent successfully");
                                }
                                else{
                                    errorConfirmation("Failed to send salary slip. Please try again.");
                                }
                            } catch (error) {
                                console.error("Failed to send salary slip. Please try again.");
                                errorConfirmation("Failed to send salary slip. Please try again.");
                            }
                            setLoading(false);
                        }}
                        disabled={loading}
                        >
                            {loading ? "Please wait..." : "Email Salary Slip"}
                        </Button>

                        {(fromAdmin && keyword == MONTH && !hideSummarySection) &&
                            <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} className='ms-2' onClick={() => handleEdit()}>
                                Modify
                            </Button>
                        }

                        {(fromAdmin && keyword == MONTH && !hideSummarySection) &&
                            <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} className='ms-2' onClick={() => handleSalaryIncrementOpen()}>
                                Increment Salary
                            </Button>
                        }
                    </div>
                    </div>
                    <Row className="g-4">
                        <Col md={6} className='mb-4 mb-lg-0' >
                            <Card className="h-100 w-100 p-2" style={{ backgroundColor:'#EBF5EA' }}>
                                <Card.Body>
                                    <Card.Title className="fw-bold d-flex align-items-center">
                                        <div className="d-flex align-items-center">
                                            <img src={miscellaneousIcons.grossPayIcon} className="me-1" alt="" />
                                            {/* <span className="rounded-circle d-inline-block me-2" style={{ width: '20px', height: '20px', backgroundColor: '#E0F7F4' }}></span> */}
                                            <div className='p-2' style={{color:'#2FA433'}}>Gross Pay (A)</div>
                                        </div>
                                    </Card.Title>

                                    <h6 className="mt-4 fw-bold" style={{color:'#9D4141'}}>Variable</h6>
                                    <Row className="text-muted">
                                        <Col xs={5} sm={4} className="text-start">Name</Col>
                                        <Col xs={3} sm={3} className="text-center">Value</Col>
                                        <Col xs={4} sm={5} className="text-end">Earned</Col>
                                    </Row>
                                    <div className='mb-3'></div>
                                    {(apiGrossPayBreakdown ? transformGrossPayVariable(apiGrossPayBreakdown.variable) : grossPayVariable).map((variable, index) => (
                                        <Row key={index} className="mb-2">
                                            <Col xs={5} sm={4} className="text-start">
                                                <span>{variable.name}</span>
                                            </Col>
                                            <Col xs={3} sm={3} className="text-center">
                                                <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{variable.value}</span>
                                            </Col>
                                            <Col xs={4} sm={5} className="text-end">
                                                <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{variable.earned}</span>
                                            </Col>
                                        </Row>
                                    ))}

                                    <h6 className="mt-6 fw-bold">Fixed</h6>
                                    <p className="text-muted small">Exclusive of below total</p>
                                    <Row className="text-muted">
                                        <Col xs={5} sm={4} className="text-start">Name</Col>
                                        <Col xs={3} sm={3} className="text-center">Value</Col>
                                        <Col xs={4} sm={5} className="text-end">Earned</Col>
                                    </Row>
                                    <div className='mb-3'></div>
                                    {(apiGrossPayBreakdown ? transformGrossPayFixed(apiGrossPayBreakdown.fixed) : totalGrossPayFixed)?.map((fixed, index) => {
                                        
                                        if(fixed?.name.toLowerCase() == "basic salary"){
                                            return (
                                                <Row key={index} className="mb-2">
                                                    <Col xs={5} sm={4} className="text-start">
                                                        <span>{fixed.name}</span>
                                                    </Col>
                                                    <Col xs={3} sm={3} className="text-center">
                                                        <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{fixed.value}</span>
                                                    </Col>
                                                    <Col xs={4} sm={5} className="text-end">
                                                        <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{apiGrossPayBreakdown ? fixed.earned : formatStringINR(totalGrossPayEarned.toString())}</span>
                                                    </Col>
                                                </Row>
                                            )
                                        }
                                        return (
                                            <Row key={index} className="mb-2">
                                                <Col xs={5} sm={4} className="text-start">
                                                    <span>{fixed.name}</span>
                                                </Col>
                                                <Col xs={3} sm={3} className="text-center">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{fixed.value}</span>
                                                </Col>
                                                <Col xs={4} sm={5} className="text-end">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{apiGrossPayBreakdown ? fixed.earned : formatStringINR(fixed.earned)}</span>
                                                </Col>
                                            </Row>
                                        )
                                    })}

                                    <Row className="mt-5 fw-bold">
                                        <Col className='mt-5 fs-6'>Total Gross Pay Amount</Col>
                                        <Col className={`text-end text-success mt-5 fs-6 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>+{salaryApiData ? formatNumber(salaryApiData.totalGrossPayAmount.replace(/[₹,]/g, '')) : formatNumber(totalGrossPayEarned2)}</Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={6} >
                            <Card className="h-100 w-100 p-2" style={{backgroundColor:'#F5EAEB'}}>
                                <Card.Body>
                                    <Card.Title className="fw-bold d-flex align-items-center">
                                        <div className="d-flex align-items-center">
                                            <img src={miscellaneousIcons.deductionIcon} alt='icon' className='me-1'/>
                                            {/* <span className="rounded-circle d-inline-block me-2" style={{ width: '20px', height: '20px', backgroundColor: '#FDE8E8' }}></span> */}
                                            <div className='p-2' style={{color:'#9D4141'}}> Deductions (B) </div>
                                        </div>
                                    </Card.Title>
                                    <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",height:"90%"}}>
                                        <div>
                                        <h6 className="mt-6 fw-bold" style={{color:'#9D4141'}}>Variable</h6>
                                        <Row className="text-muted ">
                                            <Col xs={5} sm={4} className="text-start">Name / Type</Col>
                                            <Col xs={3} sm={3} className="text-center">Value</Col>
                                            <Col xs={4} sm={5} className="text-end">Deducted Amount</Col>
                                        </Row>
                                        <div className='mb-3'></div>
                                        {(apiDeductionBreakdown ? transformDeductionVariable(apiDeductionBreakdown.variable) : deductions).map((deduction, index) => (
                                            <Row key={index} className="mb-2">
                                                <Col xs={5} sm={4} className="text-start">
                                                    <span>{deduction.name}</span>
                                                </Col>
                                                <Col xs={3} sm={3} className="text-center">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{deduction.value}</span>
                                                </Col>
                                                <Col xs={4} sm={5} className="text-end">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{apiDeductionBreakdown ? deduction.earned : formatStringINR(deduction.earned)}</span>
                                                </Col>
                                            </Row>
                                        ))}

                                        <h6 className="mt-6 fw-bold">Fixed</h6>
                                        <Row className="text-muted ">
                                            <Col xs={5} sm={4} className="text-start">Name / Type</Col>
                                            <Col xs={3} sm={3} className="text-center">Value</Col>
                                            <Col xs={4} sm={5} className="text-end">Earned</Col>
                                        </Row>
                                        <div className='mb-3'></div>
                                        {(apiDeductionBreakdown ? transformDeductionFixed(apiDeductionBreakdown.fixed) : taxes).map((tax, index) => (
                                            <Row key={index} className="mb-2">
                                                <Col xs={5} sm={4} className="text-start">
                                                    <span>{tax.name}</span>
                                                </Col>
                                                <Col xs={3} sm={3} className="text-center">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{tax.value}</span>
                                                </Col>
                                                <Col xs={4} sm={5} className="text-end">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{apiDeductionBreakdown ? tax.earned : tax.earned}</span>
                                                </Col>
                                            </Row>
                                        ))}
                                        </div>
                                        <Row className="mt-9 pt-9 fw-bold">
                                            <Col className='mt-9 pt-9 fs-6'>Total Deducted Amount</Col>
                                            <Col className={`text-end text-danger mt-9 pt-9 fs-6 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>-{salaryApiData ? formatNumber(salaryApiData.totalDeductedAmount.replace(/[₹,]/g, '')) : formatNumber(totalDeductionsEarned)}</Col>
                                        </Row>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                    <div className="d-flex justify-content-end mt-4 md:justify-content-center">
                        <p style={{marginRight: '5px'}}>Net Payable this month </p>
                        <p style={{color:'#8998AB', marginRight: '5px'}}>Gross pay(A) - Deductions(B): </p>
                        <span className={`text-end fw-bold ${remainingPayment < 0 ? 'text-danger' : 'text-success'} ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}> {salaryApiData ? formatNumber(Math.round(Math.abs(Number(salaryApiData.netAmount.replace(/[₹,]/g, ''))))) : formatNumber(Math.round(Math.abs(totalGrossPayEarned2 - totalDeductionsEarned)))}</span>
                    </div>
                    {/* <div className="d-flex justify-content-end mt-4 md:justify-content-center">
                        <PDFDownloadLink document={
                            <SalarySlipTemplate
                                grossPayVariable={grossPayVariable}
                                totalGrossPayEarned={`${formatNumber(totalGrossPayEarned)}`}
                                grossPayFixed={grossPayFixed}
                                deductions={deductions}
                                totalDeductionsEarned={`${formatNumber(totalDeductionsEarned)}`}
                                taxes={taxes}
                                employee={employee}
                                finalAmount={formatNumber(Math.abs(totalGrossPayEarned - totalDeductionsEarned))}
                                totalPayableDays={totalPayableDays}
                                date={date}
                                paidLeaves={paidLeaves}
                                unpaidLeaves={totalUnpaidLeaves}
                            />
                        } fileName="salaryslip.pdf" className="me-2" >
                            <Button>
                                Download Report (Pdf)
                            </Button>
                        </PDFDownloadLink>

                        <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} onClick={ 
                            async ()=> {
                            setLoading(true);
                            const blob = await pdf(<SalarySlipTemplate
                                grossPayVariable={grossPayVariable}
                                totalGrossPayEarned={`${formatNumber(totalGrossPayEarned)}`}
                                grossPayFixed={grossPayFixed}
                                deductions={deductions}
                                totalDeductionsEarned={`${formatNumber(totalDeductionsEarned)}`}
                                taxes={taxes}
                                employee={employee}
                                finalAmount={formatNumber(Math.abs(totalGrossPayEarned - totalDeductionsEarned))}
                                totalPayableDays={totalPayableDays}
                                date={date}
                                paidLeaves={paidLeaves}
                                unpaidLeaves={totalUnpaidLeaves}
                            />).toBlob();
                            const form = new FormData();
                            const fileFinal = new File([blob], `${userId}-SalarySlip-${Date.now()}.pdf`, { type: 'application/pdf' });
                            form.append("file", fileFinal);
                            let fileUploadedUrl;
                            try {
                                const {
                                    data: { path },
                                } = await uploadUserAsset(form, userId, "salaryreport"); 
                                fileUploadedUrl = path;
                            } catch (error) {
                                console.error("Failed to upload file. Please try again.");
                            }
                            try {
                                const data = {
                                    path: fileUploadedUrl,
                                    employeeId : employee?.id
                                };
                                const res = await sendSalarySlipToEmployee(data);
                                if(res?.statusCode==200 && !res.hasError){
                                    successConfirmation("Salary slip sent successfully");
                                }
                                else{
                                    errorConfirmation("Failed to send salary slip. Please try again.");
                                }
                            } catch (error) {
                                console.error("Failed to send salary slip. Please try again.");
                                errorConfirmation("Failed to send salary slip. Please try again.");
                            }
                            setLoading(false);
                        }}
                        disabled={loading}
                        >
                            {loading ? "Please wait..." : "Email Salary Slip"}
                        </Button>

                        {(fromAdmin && keyword == MONTH && !hideSummarySection) &&
                            <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} className='ms-2' onClick={() => handleEdit()}>
                                Modify
                            </Button>
                        }
                    </div> */}
                    <div>
                    </div>
                </Card>
            </Container>

            <Modal show={paymentShow} onHide={handlePaymentClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Payments</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={paymentInitialState} onSubmit={handlePaymentSubmit} validationSchema={paymentSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form' placeholder={undefined}>
                                    <div className="col-lg" >
                                        <TextInput
                                            isRequired={true}
                                            label="Payment"
                                            margin="mb-7"
                                            formikField="amountPaid" />
                                    </div>
                                    <div className="col-lg mb-7" >
                                        <DateInput
                                            isRequired={true}
                                            inputLabel="Payment Date"
                                            formikField="paidAt"
                                            formikProps={formikProps}
                                            placeHolder="Payment Date"
                                        />
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center">
                                        <Row className='pr-5'>
                                            Remaining Payment <span className={showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}>
                                                {(formatNumber(Math.round(remainingPayment)))}
                                            </span>
                                        </Row>
                                        <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={paymentLoading || !formikProps.isValid}>
                                            {!paymentLoading && 'Save Changes'}
                                            {paymentLoading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Modify Salary Report</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={grossPayDeductionsSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form' placeholder={undefined}>
                                    <Modal.Title className='mb-6'>
                                        Gross Pay
                                    </Modal.Title>

                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Others"
                                            margin="mb-7"
                                            formikField="grossPayOthers" />
                                    </div>

                                    <Modal.Title className='mb-6'>Deductions</Modal.Title>

                                    <div className="row">
                                        {/* <div className="col-lg-6 mb-7" >
                                            <TextInput
                                                isRequired={true}
                                                label="Advanced Loan"
                                                margin="mb-7"
                                                formikField="advancedLoan" />
                                        </div> */}
{/* 
                                        <div className="col-lg-6 mb-7" >
                                            <TextInput
                                                isRequired={true}
                                                label="Food Expenses"
                                                margin="mb-7"
                                                formikField="foodExpenses" />
                                        </div>

                                        <div className="col-lg-6 mb-sm-7 mb-md-7 mb-7">
                                            <TextInput
                                                isRequired={true}
                                                label="Retention"
                                                margin="mb-7"
                                                formikField="retention" />
                                        </div> */}

                                        <div className="col-lg-12 mb-sm-0 mb-md-0 mb-7">
                                            <TextInput
                                                isRequired={true}
                                                label="Others"
                                                margin="mb-7"
                                                formikField="deductionsOthers" />
                                        </div>
                                    </div>

                                    <div className='d-flex justify-content-end'>
                                        <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >
            <SalaryIncrementModal
                show={salaryIncrementShow}
                onHide={handleSalaryIncrementClose}
                employee={employee}
                onSuccess={handleSalaryIncrementSuccess}
                fromAdmin={fromAdmin}
            />
        </>
    );
}

export default SalaryReport;
