import { HOLIDAYS } from '@constants/statistics';
import { Attendance, IPayment } from '@models/employee';
import { RootState, store } from '@redux/store';
import { fetchAllPayments } from '@services/employee';
import { getAvatar } from '@utils/avatar';
import { getWorkingDaysInMonth, donutaDataLabel, formatNumber } from '@utils/statistics';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Card, Container, Row, Col, Image } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import PrivacyToggle from '@app/modules/common/components/PrivacyToggle';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';

type Gender = 0 | 1 | 2;

interface EmployeeDetailsCardProps {
    fromAdmin?: boolean;
    stats: Attendance[];
    showSensitiveData: boolean;
    onToggleSensitiveData: () => void;
    monthlyApiData?: IMonthlyApiResponse | null;
}

const EmployeeDetailsCard = ({ fromAdmin = false, stats, showSensitiveData, onToggleSensitiveData, monthlyApiData }: EmployeeDetailsCardProps) => {
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const [totalWorkingHour, setTotalWorkingHour] = useState(0);
    const appSettingWrokingHours = useSelector((state: RootState) => state.appSettings.workingHours);
    const employee = useSelector((state: RootState) => fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee);
    console.log("Employee:: ",employee);
    
    const avatar = getAvatar(employee.avatar || '', employee.gender as unknown as Gender);
    let monthlySalary;
    // let hourlySalary = useSelector((state: RootState) => fromAdmin ? (state.employee?.selectedEmployee?.hourlySalary || 0) : (state.employee.currentEmployee?.hourlySalary || 0));
    let hourlySalary;
    // const hourlySalary = fromAdmin ? useSelector((state: RootState) => state.employee.selectedEmployee.hourlySalary || 0):  useSelector((state: RootState) => state.employee.currentEmployee.hourlySalary || 0);

    // const leavesHolidaysMap = donutaDataLabel(stats);
    const leavesHolidaysMap = useSelector((state:RootState)=>state.attendanceStats.filteredPublicHolidays)
    const totalWorkingDay = getWorkingDaysInMonth(dayjs().format('YYYY'), dayjs().format('MM')) - (leavesHolidaysMap.length || 0);
    const totalMonthInDay = dayjs().daysInMonth();

    const [totalPaidAmount, setTotalAmountPaid] = useState(0);
    
    // Extract API data for additional information
    const apiSalaryData = monthlyApiData?.salaryData?.[0];
    console.log("apiSalaryDataForCurrMonth:: ", apiSalaryData);

    let annualCTC;
    if(apiSalaryData?.employeeCardDeatils?.annualCTC){
        annualCTC = parseFloat(apiSalaryData?.employeeCardDeatils?.annualCTC?.toFixed(2));
    }
    // if(!annualCTC){
    //     annualCTC = 0;
    // }
    if(apiSalaryData?.employeeCardDeatils?.monthlySalary){
        monthlySalary = parseFloat(apiSalaryData?.employeeCardDeatils?.monthlySalary?.toFixed(2));
    }
    if(apiSalaryData?.employeeCardDeatils?.hourlySalary){
        hourlySalary = parseFloat(apiSalaryData?.employeeCardDeatils?.hourlySalary?.toFixed(2));
    }
    
    let monthlyPaidAmount;
    if(apiSalaryData?.employeeCardDeatils?.monthlyPaid){
        monthlyPaidAmount = parseFloat(apiSalaryData?.employeeCardDeatils?.monthlyPaid?.toFixed(2));
    }else{
        monthlyPaidAmount = 0;
    }
 
 
    // let totalPaidamount;
    // if(apiSalaryData?.paidAmount){
    //     totalPaidamount = apiSalaryData?.paidAmount;
    // }
    async function fetchPayments() {
        const { data: { salaries } } = await fetchAllPayments(employee.id);
        
        const totalPaidAmount = salaries.reduce((acc: number, salary: IPayment) => Number(salary.amountPaid) + acc, 0);
        setTotalAmountPaid(totalPaidAmount);
    }

    useEffect(() => {
        fetchPayments();
    }, [employee, toggleChange]);

    useEffect(()=>{
        setTotalWorkingHour(appSettingWrokingHours);
    },[appSettingWrokingHours])
    
    return (
        <div className="sticky-responsive">
            <style jsx>{`
                .sticky-responsive {
                    position: static;
                    background-color: white;
                    padding: 10px;
                }
                
                @media (min-width: 992px) {
                    .sticky-responsive {
                        position: sticky;
                        top: 125px;
                        z-index: 50;
                    }
                }
                
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
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold fs-1 mb-0 font-barlow">Employee Details</h3>
                <PrivacyToggle 
                    isVisible={showSensitiveData}
                    onToggle={onToggleSensitiveData}
                    color="#666"
                />
            </div>
            <Container fluid className="my-4 px-0 mt-6 ">
                <Card className="p-4 shadow-sm w-100">
                    <Row className="align-items-center mb-4">
                        <Col md={3} className="d-flex align-items-center">
                            <Image
                                src={avatar}
                                roundedCircle
                                width="60"
                                height="60"
                                alt="Profile"
                                className="me-3"
                            />
                            <div className="d-flex flex-column">
                                <div className="d-flex align-items-center gap-2">
                                    <h5 className="mb-1">{employee?.users?.firstName + " " + employee?.users?.lastName}</h5>
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            backgroundColor: 'white',
                                            color: employee?.isActive ? '#3ECD45' : '#8A8A8A',
                                            border: employee?.isActive ? '2px solid #3ECD45' : '2px solid #8A8A8A',
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: employee?.isActive ? '#3ECD45' : '#8A8A8A',
                                                marginRight: '6px',
                                            }}
                                        />
                                        {employee?.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <small className="text-muted">{employee?.employeeCode}</small>
                            </div>
                        </Col>
                        <Col md={3}>
                            <h6 className="mb-1">Date of Joining</h6>
                            <p className="mb-0">{employee?.dateOfJoining ? dayjs(employee?.dateOfJoining?.toString()).format('DD MMMM YYYY') : '-'}</p>
                        </Col>
                        <Col md={3}>
                            <h6 className="mb-1">Designation</h6>
                            <p className="mb-0">{employee?.designations?.role || '-'}</p>
                        </Col>
                        <Col md={3}>
                            <h6 className="mb-1">Department</h6>
                            <p className="mb-0">{employee?.departments?.name || '-'}</p>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={3}>
                            <h6 className="mb-1">Annual Salary (CTC)</h6>
                            <p className={`mb-0 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                {annualCTC ? formatNumber(annualCTC) : '-'}
                            </p>
                        </Col>
                        <Col md={3}>
                            <h6 className="mb-1">Monthly Salary</h6>
                            <p className={`mb-0 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                {formatNumber(typeof(monthlySalary) === 'number' && monthlySalary >= 0 ? monthlySalary : '-')}
                            </p>
                        </Col>
                        <Col md={3}>
                            <h6 className="mb-1">Basic Hourly Salary</h6>
                            <p className={`mb-0 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                {formatNumber(typeof(hourlySalary) === 'number' && hourlySalary >= 0 ? hourlySalary : '-')}
                            </p>
                        </Col>
                        <Col md={3}>
                            <h6 className="mb-1">
                                {apiSalaryData ? 'Monthly Paid Amount' : 'Total Paid Amount'}
                            </h6>
                            <p className={`mb-0 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                {formatNumber(
                                    monthlyPaidAmount && monthlyPaidAmount > 0 ? (typeof monthlyPaidAmount === 'number' && monthlyPaidAmount >= 0 ? monthlyPaidAmount : '0') : '0'
                                )}
                            </p>
                        </Col>
                    </Row>
                </Card>
            </Container>
        </div>
    );
};

export default EmployeeDetailsCard;