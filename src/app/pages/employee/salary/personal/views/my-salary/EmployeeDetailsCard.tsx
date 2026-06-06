import { Attendance, IPayment } from '@models/employee';
import { RootState } from '@redux/store';
import { fetchAllPayments } from '@services/employee';
import { getAvatar } from '@utils/avatar';
import { formatCurrencyDecimal, formatCurrencyRounded } from '@utils/currency';
import dayjs from 'dayjs';
import {
    Avatar,
    Box,
    Chip,
    Paper,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import CurrencyRupeeOutlinedIcon from '@mui/icons-material/CurrencyRupeeOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { ReactNode, useEffect, useState } from 'react';
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

type MetricTone = 'blue' | 'purple' | 'cyan' | 'orange' | 'green' | 'rose' | 'amber' | 'violet';

interface EmployeeMetricCardProps {
    label: string;
    value: string;
    icon: ReactNode;
    tone: MetricTone;
    isSensitive?: boolean;
    showSensitiveData?: boolean;
}

const metricToneMap: Record<MetricTone, { color: string; background: string; border: string }> = {
    blue: { color: '#2563eb', background: '#eff6ff', border: '#dbeafe' },
    purple: { color: '#7c3aed', background: '#f5f3ff', border: '#ede9fe' },
    cyan: { color: '#0891b2', background: '#ecfeff', border: '#cffafe' },
    orange: { color: '#ea580c', background: '#fff7ed', border: '#ffedd5' },
    green: { color: '#16a34a', background: '#f0fdf4', border: '#dcfce7' },
    rose: { color: '#e11d48', background: '#fff1f2', border: '#ffe4e6' },
    amber: { color: '#d97706', background: '#fffbeb', border: '#fef3c7' },
    violet: { color: '#6d28d9', background: '#f5f3ff', border: '#ede9fe' },
};

const EmployeeMetricCard = ({ label, value, icon, tone, isSensitive, showSensitiveData = true }: EmployeeMetricCardProps) => {
    const palette = metricToneMap[tone];
    const blur = isSensitive && !showSensitiveData;
    const valueStyle = blur ? { filter: 'blur(6px)', userSelect: 'none' } : {};

    return (
        <Paper
            elevation={0}
            sx={{
                height: { xs: 76, md: 80 },
                p: { xs: '12px 13px', md: '13px 14px' },
                borderRadius: '16px',
                background: 'linear-gradient(180deg, #ffffff 0%, #fcfdff 100%)',
                border: '1px solid #e9eef5',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 16px rgba(15, 23, 42, 0.035)',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'stretch',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04), 0 14px 22px rgba(15, 23, 42, 0.055)',
                    borderColor: palette.border,
                },
            }}
        >
            <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        flex: '0 0 38px',
                        borderRadius: '11px',
                        display: 'grid',
                        placeItems: 'center',
                        color: palette.color,
                        backgroundColor: palette.background,
                        border: `1px solid ${palette.border}`,
                    }}
                >
                    {icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            color: '#64748b',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            lineHeight: 1.2,
                            mb: 0.35,
                            letterSpacing: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {label}
                    </Typography>
                    
                    <Typography
                        sx={{
                            color: '#0f172a',
                            fontSize: { xs: '0.9rem', md: '0.96rem' },
                            fontWeight: 800,
                            lineHeight: 1.25,
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '38px',
                            ...valueStyle,
                        }}
                    >
                        {typeof value === 'string'
                            ? value.split('\n').map((line, index) => (
                                <span key={index}>
                                    {line}
                                    <br />
                                </span>
                            ))
                            : value}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
};

// Updated EmployeeProfileCard matching your new mockup
interface EmployeeProfileCardProps {
    avatar: string;
    name: string;
    employeeCode?: string;
    isActive?: boolean;
    hasProfessionalFees?: boolean;
    email?: string;
    phone?: string;
    location?: string;
}

const ProfileMetaChip = ({
    icon,
    label,
}: {
    icon: ReactNode;
    label: string;
}) => (
    <Box
        sx={{
            minWidth: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.7,
            px: 1,
            py: 0.75,
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e8eef5',
        }}
    >
        <Box sx={{ color: '#64748b', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            {icon}
        </Box>
        <Typography
            sx={{
                minWidth: 0,
                color: '#475569',
                fontSize: '0.73rem',
                fontWeight: 600,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}
        >
            {label}
        </Typography>
    </Box>
);

const EmployeeProfileCard = ({
    avatar,
    name,
    employeeCode,
    isActive,
    hasProfessionalFees,
    email,
    phone,
    location
}: EmployeeProfileCardProps) => (
    <Paper
        elevation={0}
        sx={{
            height: '100%',
            p: { xs: 1.5, md: 1.75 },
            borderRadius: '16px',
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
            border: '1px solid #e9eef5',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 16px rgba(15, 23, 42, 0.035)',
            display: 'flex',
            flexDirection: 'column',
        }}
    >
        <Stack direction="row" spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 1 }}>
            <Avatar
                src={avatar}
                alt={name}
                sx={{
                    width: { xs: 68, md: 74 },
                    height: { xs: 68, md: 74 },
                    borderRadius: '16px',
                    boxShadow: '0 6px 12px rgba(15, 23, 42, 0.08)',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    flex: '0 0 auto',
                    '& .MuiAvatar-img': {
                        objectFit: 'fill',
                    }
                }}
            />

            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} mb={0.45}>
                    <Box sx={{ minWidth: 0 }}>
                        <Tooltip title={name} arrow placement="top">
                            <Typography
                                sx={{
                                    color: '#0f172a',
                                    fontSize: { xs: '1.05rem', md: '1.14rem' },
                                    fontWeight: 800,
                                    lineHeight: 1.15,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {name}
                            </Typography>
                        </Tooltip>
                        <Typography sx={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700, mt: 0.35 }}>
                            {employeeCode || '-'}
                        </Typography>
                    </Box>
                </Stack>

                <Typography sx={{ color: '#334155', fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {phone || '-'}
                </Typography>

                <Box sx={{ mt: 0.75 }}>
                    <Chip 
                        label={hasProfessionalFees ? "CONTRACT BASED" : "SALARY BASED"} 
                        size="small"
                        sx={{ 
                            height: '22px', 
                            fontSize: '0.65rem', 
                            fontWeight: 800, 
                            letterSpacing: '0.5px',
                            backgroundColor: hasProfessionalFees ? '#f5f3ff' : '#f0fdf4',
                            color: hasProfessionalFees ? '#7c3aed' : '#16a34a',
                            border: `1px solid ${hasProfessionalFees ? '#ede9fe' : '#dcfce7'}`,
                            '& .MuiChip-label': { px: 1 }
                        }} 
                    />
                </Box>
            </Box>
        </Stack>

        <Box
            sx={{
                mt: 1.4,
                pt: 1.25,
                borderTop: '1px solid #edf2f7',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: '1fr' },
                gap: 0.85,
            }}
        >
            {email && <ProfileMetaChip icon={<EmailOutlinedIcon sx={{ fontSize: '14px' }} />} label={email} />}
            {location && <ProfileMetaChip icon={<LocationOnOutlinedIcon sx={{ fontSize: '14px' }} />} label={location} />}
        </Box>
    </Paper>
);

const EmployeeDetailsSkeleton = () => (
    <Paper elevation={0} sx={{ p: 1.5, borderRadius: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
            <Skeleton variant="rounded" width="100%" height={212} sx={{ maxWidth: { lg: 290 }, borderRadius: '16px' }} />
            <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} variant="rounded" height={76} sx={{ borderRadius: '16px' }} />
                ))}
            </Box>
        </Stack>
    </Paper>
);

const EmployeeDetailsCard = ({ fromAdmin = false, stats, showSensitiveData, onToggleSensitiveData, monthlyApiData }: EmployeeDetailsCardProps) => {
    void stats;
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const employee = useSelector((state: RootState) => fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee);

    const avatar = getAvatar(employee?.avatar || '', employee?.gender as unknown as Gender);
    let monthlySalary: number | undefined;
    let hourlySalary: number | undefined;

    const [totalPaidAmount, setTotalAmountPaid] = useState(0);
    const apiSalaryData = monthlyApiData?.salaryData?.[0];

    const hasProfessionalFees = !!employee?.professionalFeesEnabled;

    // Truncate helper: floor to 2 decimal places (avoids rounding 666.666 → 666.67)
    const trunc2 = (n: number) => Math.floor(n * 100) / 100;

    let annualCTC: number | undefined;
    if (apiSalaryData?.employeeCardDeatils?.annualCTC) {
        annualCTC = trunc2(apiSalaryData.employeeCardDeatils.annualCTC);
    }
    if (apiSalaryData?.employeeCardDeatils?.monthlySalary) {
        monthlySalary = trunc2(apiSalaryData.employeeCardDeatils.monthlySalary);
    }
    if (apiSalaryData?.employeeCardDeatils?.hourlySalary) {
        hourlySalary = trunc2(apiSalaryData.employeeCardDeatils.hourlySalary);
    }

    let monthlyPaidAmount: number;
    if (apiSalaryData?.employeeCardDeatils?.monthlyPaid) {
        monthlyPaidAmount = trunc2(apiSalaryData.employeeCardDeatils.monthlyPaid);
    } else {
        monthlyPaidAmount = 0;
    }

    const apiDailySalary = apiSalaryData?.employeeCardDeatils?.dailySalary;

    const dailySalary = typeof apiDailySalary === 'number' && apiDailySalary >= 0
        ? trunc2(apiDailySalary)
        : typeof monthlySalary === 'number' && monthlySalary >= 0
            ? trunc2(monthlySalary / 30)
            : typeof hourlySalary === 'number' && hourlySalary >= 0
                ? trunc2(hourlySalary * 8)
                : undefined;

    async function fetchPayments() {
        if (!employee?.id) {
            console.warn('⚠️ [EmployeeDetailsCard] Cannot fetch payments: Employee ID is missing');
            return;
        }
        const { data: { salaries } } = await fetchAllPayments(employee.id);
        const totalPaidAmount = salaries.reduce((acc: number, salary: IPayment) => Number(salary.amountPaid) + acc, 0);
        setTotalAmountPaid(totalPaidAmount);
    }

    useEffect(() => {
        fetchPayments();
    }, [employee, toggleChange]);

    const formatSalaryValue = (value: number | undefined, fallback = '-') => (
        typeof value === 'number' && value >= 0 ? formatCurrencyDecimal(value) : fallback
    );
    const totalExperience = employee?.dateOfJoining
        ? (() => {
            const joiningDate = dayjs(employee.dateOfJoining);
            const now = dayjs();

            const years = now.diff(joiningDate, 'year');
            const months = now.diff(joiningDate.add(years, 'year'), 'month');

            if (years === 0) {
                return `${months} Month${months !== 1 ? 's' : ''}`;
            }

            if (months === 0) {
                return `${years} Year${years !== 1 ? 's' : ''}`;
            }

            return `${years} Year${years !== 1 ? 's' : ''} ${months} Month${months !== 1 ? 's' : ''}`;
        })()
        : '-';
    const employeeName = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.trim() || 'Employee';
    const paidAmountValue = apiSalaryData
        ? formatSalaryValue(monthlyPaidAmount, formatCurrencyDecimal(0))
        : formatCurrencyDecimal(totalPaidAmount || 0);

    const metricItems: EmployeeMetricCardProps[] = [
        {
            label: 'Date of Joining',
            value: employee?.dateOfJoining ? dayjs(employee?.dateOfJoining?.toString()).format('DD MMM YYYY') : '-',
            icon: <CalendarMonthOutlinedIcon fontSize="small" />, 
            tone: 'blue',
        },
        {
            label: 'Total Experience',
            value: totalExperience,
            icon: <AccessTimeOutlinedIcon fontSize="small" />, 
            tone: 'cyan',
        },
        {
            label: 'Role',
            value: employee?.designations?.role || '-',
            icon: <WorkOutlineOutlinedIcon fontSize="small" />, 
            tone: 'purple',
        },
        {
            label: 'Department',
            value: employee?.departments?.name || '-',
            icon: <ApartmentOutlinedIcon fontSize="small" />, 
            tone: 'purple',
        },
        {
            label: 'Annual Salary (CTC)',
            value: typeof annualCTC === 'number' && annualCTC >= 0 ? formatCurrencyRounded(annualCTC) : '-',
            icon: <SavingsOutlinedIcon fontSize="small" />, 
            tone: 'orange',
            isSensitive: true,
            showSensitiveData,
        },
        {
            label: 'Monthly Salary',
            value: typeof monthlySalary === 'number' && monthlySalary >= 0 ? formatCurrencyRounded(monthlySalary) : '-',
            icon: <CurrencyRupeeOutlinedIcon fontSize="small" />, 
            tone: 'green',
            isSensitive: true,
            showSensitiveData,
        },
        {
            label: 'Daily Salary',
            value: formatSalaryValue(dailySalary),
            icon: <WbSunnyOutlinedIcon fontSize="small" />, 
            tone: 'amber',
            isSensitive: true,
            showSensitiveData,
        },
        {
            label: 'Hourly Salary',
            value: formatSalaryValue(hourlySalary),
            icon: <AccessTimeOutlinedIcon fontSize="small" />, 
            tone: 'rose',
            isSensitive: true,
            showSensitiveData,
        },
    ];

    return (
        <Box className="employee-details-card" sx={{ width: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                <Typography className="font-barlow" sx={{ color: '#0f172a', fontSize: { xs: 20, md: 22 }, fontWeight: 800, lineHeight: 1.2 }}>
                    Employee Details
                </Typography>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        transition: 'background-color 200ms',
                        '&:hover': {
                            backgroundColor: '#e2e8f0',
                        },
                        '& .privacy-toggle': {
                            width: 34,
                            height: 34,
                            cursor: 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '50%',
                        }
                    }}
                >
                    <PrivacyToggle
                        isVisible={showSensitiveData}
                        onToggle={onToggleSensitiveData}
                        color="#64748b"
                    />
                </Box>
            </Stack>

            {!employee ? (
                <EmployeeDetailsSkeleton />
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        width: '100%',
                        p: { xs: 1, md: 1.25 },
                        borderRadius: '20px',
                        background: 'linear-gradient(180deg, #fbfdff 0%, #f8fbff 100%)',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                    }}
                >
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: '1fr',
                                lg: '280px minmax(0, 1fr)',
                            },
                            gap: 1.25,
                            alignItems: 'start',
                        }}
                    >
                        <EmployeeProfileCard
                            avatar={avatar}
                            name={employeeName}
                            employeeCode={employee?.employeeCode}
                            isActive={employee?.isActive}
                            hasProfessionalFees={hasProfessionalFees}
                            email={employee?.companyEmailId || undefined}
                            phone={employee?.companyPhoneNumber || undefined}
                            location={employee?.workLocation || undefined}
                        />
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'repeat(2, minmax(0, 1fr))',
                                    lg: 'repeat(2, minmax(0, 1fr))',
                                    xl: 'repeat(4, minmax(0, 1fr))',
                                },
                                gap: 1.25,
                                gridAutoRows: { xs: '76px', md: '80px' },
                                alignContent: 'start',
                                alignItems: 'stretch',
                            }}
                        >
                            {metricItems.map((metric) => (
                                <EmployeeMetricCard key={metric.label} {...metric} />
                            ))}
                        </Box>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default EmployeeDetailsCard;
