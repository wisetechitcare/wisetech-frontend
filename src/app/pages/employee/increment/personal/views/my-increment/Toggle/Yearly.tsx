import React, { useEffect, useState } from 'react';
import { Dayjs } from 'dayjs';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import {
    incrementService,
    IncrementRecord,
    YearlyAnalytics,
} from '../../../../../../../../services/incrementService';
import IncrementKPISection, { KPICardConfig } from '../components/IncrementKPISection';
import IncrementGrowthChart from '../components/IncrementGrowthChart';
import IncrementTimeline from '../components/IncrementTimeline';
import IncrementTable from '../components/IncrementTable';
import IncrementDetailDialog from '../components/IncrementDetailDialog';
import AddEditIncrementDialog from '../components/AddEditIncrementDialog';
import YearlySmartInsights from '../components/YearlySmartInsights';
import YearSummaryPanel from '../components/YearSummaryPanel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AddIcon from '@mui/icons-material/Add';
import { formatCurrencyRounded } from '@utils/currency';
import dayjs from 'dayjs';

const Yearly = ({
    year,
    fromAdmin = false,
    showSensitiveData = false,
}: {
    year: Dayjs;
    fromAdmin?: boolean;
    showSensitiveData?: boolean;
}) => {
    const employee = useSelector((state: RootState) =>
        fromAdmin ? state.employee?.selectedEmployee : state.employee?.currentEmployee
    );

    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<IncrementRecord[]>([]);
    const [analytics, setAnalytics] = useState<YearlyAnalytics | null>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<IncrementRecord | null>(null);

    const employeeName = employee
        ? `${employee.users?.firstName || ''} ${employee.users?.lastName || ''}`.trim()
        : '';
    const yr = year.format('YYYY');

    const loadData = async () => {
        if (!employee?.id) return;
        setLoading(true);
        try {
            const hist = await incrementService.fetchIncrementHistory(employee.id);
            const yearRecords = hist.filter(r => dayjs(r.effectiveDate).format('YYYY') === yr);
            setRecords(yearRecords);
            const an = await incrementService.fetchYearlyAnalytics(employee.id, yr);
            setAnalytics(an);
        } catch (err) {
            console.error('Failed to load yearly increment data', err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [employee?.id, yr]);

    const buildCards = (): KPICardConfig[] => {
        if (!analytics) return [];
        return [
            {
                label: 'Starting Salary',
                value: analytics.startingSalaryForYear > 0
                    ? formatCurrencyRounded(analytics.startingSalaryForYear)
                    : '—',
                icon: <AccountBalanceWalletIcon />,
                tone: 'blue',
                footer: 'Jan 1 carry-in',
                footerTone: 'neutral',
                isSensitive: true,
                showSensitiveData,
            },
            {
                label: 'Year-End Salary',
                value: analytics.currentSalaryForYear > 0
                    ? formatCurrencyRounded(analytics.currentSalaryForYear)
                    : '—',
                icon: <AccountBalanceWalletIcon />,
                tone: 'rose',
                footer: `Dec 31, ${yr}`,
                footerTone: 'neutral',
                isSensitive: true,
                showSensitiveData,
            },
            {
                label: 'Year Increment',
                value: analytics.yearIncrementAmount > 0
                    ? `+${formatCurrencyRounded(analytics.yearIncrementAmount)}`
                    : '—',
                icon: <TrendingUpIcon />,
                tone: 'green',
                footer: analytics.yearIncrementAmount > 0 ? 'Salary raised' : 'No raise',
                footerTone: analytics.yearIncrementAmount > 0 ? 'success' : 'neutral',
                isSensitive: true,
                showSensitiveData,
            },
            {
                label: 'Growth %',
                value: analytics.yearIncrementPercentage > 0
                    ? `+${analytics.yearIncrementPercentage}%`
                    : '—',
                icon: <AssessmentIcon />,
                tone: 'purple',
                footer: analytics.yearIncrementPercentage > 15
                    ? 'Strong growth'
                    : analytics.yearIncrementPercentage > 0
                        ? 'Moderate growth'
                        : 'No growth',
                footerTone: analytics.yearIncrementPercentage > 15
                    ? 'success'
                    : analytics.yearIncrementPercentage > 0
                        ? 'info'
                        : 'neutral',
            },
            {
                label: 'Revisions',
                value: String(analytics.revisionCount),
                icon: <EventRepeatIcon />,
                tone: 'orange',
                footer: analytics.revisionCount > 0
                    ? `Last: ${analytics.lastRevisionMonth ?? '—'}`
                    : 'None this year',
                footerTone: analytics.revisionCount > 0 ? 'warning' : 'neutral',
            },
            {
                label: 'Avg Monthly',
                value: analytics.avgMonthlySalary > 0
                    ? formatCurrencyRounded(analytics.avgMonthlySalary)
                    : '—',
                icon: <ShowChartIcon />,
                tone: 'cyan',
                footer: 'Average over 12 months',
                footerTone: 'info',
                isSensitive: true,
                showSensitiveData,
            },
        ];
    };

    const hasActivity = !loading && ((analytics?.startingSalaryForYear ?? 0) > 0 || records.length > 0);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1.5, gap: 0 }}>
            {/* Section label */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography sx={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>
                        {yr} Salary Analysis
                    </Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mt: 0.2 }}>
                        Year-specific revision activity and salary progression
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => { setSelectedRecord(null); setShowEditDialog(true); }}
                    sx={{
                        bgcolor: '#AA393D',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        boxShadow: 'none',
                        flexShrink: 0,
                        '&:hover': { bgcolor: '#8b2b2e', boxShadow: 'none' },
                    }}
                >
                    Add Increment
                </Button>
            </Box>

            {/* ── SECTION 1: KPI Cards ── */}
            <IncrementKPISection
                cards={buildCards()}
                loading={loading}
                skeletonCount={6}
                columns={6}
            />

            {/* ── SECTION 2: Chart + Year Summary panel ── */}
            {(loading || hasActivity) && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 1.5, mb: 1.5 }}>
                    <IncrementGrowthChart
                        data={analytics?.graphData}
                        loading={loading}
                        showSensitiveData={showSensitiveData}
                        title={`${yr} Monthly Progression`}
                        subtitle="Salary at each month of the year"
                        chartType="step"
                        accentColor="#AA393D"
                        height={200}
                    />
                    {analytics && (
                        <YearSummaryPanel
                            analytics={analytics}
                            year={yr}
                            showSensitiveData={showSensitiveData}
                            loading={loading}
                        />
                    )}
                    {loading && !analytics && (
                        <Box sx={{ borderRadius: '16px', border: '1px solid #e9eef5', height: 280, bgcolor: '#fafbfc' }} />
                    )}
                </Box>
            )}

            {/* ── SECTION 3: Smart Insights ── */}
            <YearlySmartInsights analytics={analytics} year={yr} loading={loading} />

            {/* ── No data state ── */}
            {!loading && !hasActivity && (
                <Paper
                    elevation={0}
                    sx={{ p: 5, textAlign: 'center', borderRadius: '16px', border: '1px solid #e9eef5', bgcolor: '#fbfdff', mb: 2 }}
                >
                    <Typography sx={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, mb: 0.75 }}>
                        No salary data for {yr}
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.88rem' }}>
                        No active salary records were found for this employee in {yr}.
                    </Typography>
                </Paper>
            )}

            {/* ── SECTION 4: Revision Table + Timeline ── */}
            {hasActivity && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 3fr' }, gap: 1.5 }}>
                    <IncrementTable
                        data={records}
                        loading={loading}
                        showSensitiveData={showSensitiveData}
                        fromAdmin={fromAdmin}
                        onView={r => { setSelectedRecord(r); setShowDetailDialog(true); }}
                        onEdit={r => { setSelectedRecord(r); setShowEditDialog(true); }}
                        onDelete={async r => {
                            if (window.confirm('Delete this increment?')) {
                                await incrementService.deleteIncrement(employee.id, r.id);
                                loadData();
                            }
                        }}
                    />
                    {records.length > 0 && (
                        <IncrementTimeline
                            data={records}
                            loading={loading}
                            showSensitiveData={showSensitiveData}
                            title={`${yr} Revisions`}
                            subtitle="Changes made this year"
                        />
                    )}
                </Box>
            )}

            <IncrementDetailDialog
                show={showDetailDialog}
                onHide={() => setShowDetailDialog(false)}
                record={selectedRecord}
                employeeName={employeeName}
            />
            <AddEditIncrementDialog
                show={showEditDialog}
                onHide={() => setShowEditDialog(false)}
                record={selectedRecord}
                employeeName={employeeName}
                currentSalary={analytics?.currentSalaryForYear || 0}
                onSubmit={async payload => {
                    if (selectedRecord) {
                        await incrementService.updateIncrement(employee.id, selectedRecord.id, payload);
                    } else {
                        await incrementService.createIncrement(employee.id, payload);
                    }
                    setShowEditDialog(false);
                    loadData();
                }}
            />
        </Box>
    );
};

export default Yearly;
