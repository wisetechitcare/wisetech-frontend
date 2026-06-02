import { Box, Paper, Stack, Typography } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';

interface YearlyOverviewCardProps {
    title?: string;
    fiscalYear: string;
    fiscalMonth: string;
    payableDays: string;
    workingDays: string;
    attendance: string;
    leavePercentage: string;
    netPayable: string;
    netPayableLabel?: string;
}

const YearlyOverviewCard = (props: YearlyOverviewCardProps) => {
    const infoRows = [
        { label: 'Fiscal Year', value: props.fiscalYear, icon: <CalendarMonthOutlinedIcon fontSize="small" />, color: '#2563eb' },
        { label: 'Fiscal Month', value: props.fiscalMonth, icon: <DateRangeOutlinedIcon fontSize="small" />, color: '#8b5cf6' },
        { label: 'Working Days', value: props.workingDays, icon: <BusinessCenterOutlinedIcon fontSize="small" />, color: '#0891b2' },
        { label: 'Payable Days', value: props.payableDays, icon: <EventAvailableOutlinedIcon fontSize="small" />, color: '#16a34a' },
        { label: 'Attendance', value: props.attendance, icon: <PersonOutlineOutlinedIcon fontSize="small" />, color: '#d97706' },
        { label: 'Leave Percentage', value: props.leavePercentage, icon: <EventBusyOutlinedIcon fontSize="small" />, color: '#ef4444' },
    ];

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.75,
                borderRadius: '16px',
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 20px rgba(15, 23, 42, 0.045)',
                border: '1px solid #e5edf6',
            }}
        >
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0f172a', mb: 1.25 }}>
                {props.title || 'Yearly Overview'}
            </Typography>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1,
                }}
            >
                {infoRows.map((item) => (
                    <Stack
                        key={item.label}
                        direction="row"
                        spacing={1}
                        sx={{
                            minHeight: 60,
                            p: 1,
                            borderRadius: '12px',
                            backgroundColor: 'rgba(248, 250, 252, 0.88)',
                            border: '1px solid rgba(226, 232, 240, 0.72)',
                            minWidth: 0,
                            alignItems: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '10px',
                                display: 'grid',
                                placeItems: 'center',
                                color: item.color,
                                backgroundColor: `${item.color}14`,
                                flex: '0 0 auto',
                            }}
                        >
                            {item.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', lineHeight: 1.15 }}>
                                {item.label}
                            </Typography>
                            <Typography
                                sx={{
                                    mt: 0.15,
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {item.value}
                            </Typography>
                        </Box>
                    </Stack>
                ))}
            </Box>

            <Box
                sx={{
                    mt: 1.1,
                    p: 1.25,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #eefbf3 0%, #ffffff 100%)',
                    border: '1px solid #d8f0df',
                }}
            >
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>
                    {props.netPayableLabel || 'Net Payable This Year'}
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: 22, fontWeight: 800, color: '#15803d', lineHeight: 1.1 }}>
                    {props.netPayable}
                </Typography>
            </Box>
        </Paper>
    );
};

export default YearlyOverviewCard;
