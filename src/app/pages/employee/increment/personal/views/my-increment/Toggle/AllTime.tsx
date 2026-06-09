import React, { useEffect, useState } from 'react';
import { Dayjs } from 'dayjs';
import { Box, Paper, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import {
    incrementService,
    IncrementRecord,
    AllTimeAnalytics,
} from '../../../../../../../../services/incrementService';
import IncrementKPISection, { KPICardConfig } from '../components/IncrementKPISection';
import IncrementGrowthChart from '../components/IncrementGrowthChart';
import IncrementTimeline from '../components/IncrementTimeline';
import IncrementTable from '../components/IncrementTable';
import SmartInsightsCard from '../components/SmartInsightsCard';
import IncrementDetailDialog from '../components/IncrementDetailDialog';
import AddEditIncrementDialog from '../components/AddEditIncrementDialog';
import CareerJourneyHero from '../components/CareerJourneyHero';
import GrowthPerYearBreakdown from '../components/GrowthPerYearBreakdown';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LayersIcon from '@mui/icons-material/Layers';
import { formatCurrencyRounded } from '@utils/currency';
import dayjs from 'dayjs';

const AllTime = ({
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
    const [analytics, setAnalytics] = useState<AllTimeAnalytics | null>(null);
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<IncrementRecord | null>(null);

    const employeeName = employee
        ? `${employee.users?.firstName || ''} ${employee.users?.lastName || ''}`.trim()
        : '';

    const loadData = async () => {
        if (!employee?.id) return;
        setLoading(true);
        try {
            const hist = await incrementService.fetchIncrementHistory(employee.id);
            setRecords(hist);
            const an = await incrementService.fetchAllTimeAnalytics(employee.id);
            setAnalytics(an);
        } catch (err) {
            console.error('Failed to load all-time increment data', err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [employee?.id]);

    const availableYears = Array.from(
        new Set(records.map(r => dayjs(r.effectiveDate).format('YYYY')))
    ).sort((a, b) => Number(b) - Number(a));

    const filteredRecords = yearFilter === 'all'
        ? records
        : records.filter(r => dayjs(r.effectiveDate).format('YYYY') === yearFilter);

    const buildCards = (): KPICardConfig[] => {
        if (!analytics) return [];
        return [
            {
                label: 'Total Revisions',
                value: String(analytics.totalRevisions),
                icon: <LayersIcon />,
                tone: 'orange',
                footer: `${analytics.yearsWithRevisions} year${analytics.yearsWithRevisions !== 1 ? 's' : ''} of records`,
                footerTone: 'warning',
            },
            {
                label: 'Years w/ Revisions',
                value: String(analytics.yearsWithRevisions),
                icon: <WorkHistoryIcon />,
                tone: 'cyan',
                footer: 'Distinct calendar years',
                footerTone: 'info',
            },
            {
                label: 'Highest Increment',
                value: analytics.highestSingleIncrementAmount > 0
                    ? `+${formatCurrencyRounded(analytics.highestSingleIncrementAmount)}`
                    : '—',
                subValue: analytics.highestSingleIncrementPercentage > 0
                    ? `+${analytics.highestSingleIncrementPercentage}% in one revision`
                    : undefined,
                icon: <EmojiEventsIcon />,
                tone: 'indigo',
                footer: 'Largest single raise',
                footerTone: 'neutral',
                isSensitive: true,
                showSensitiveData,
            },
            {
                label: 'Last Revision',
                value: analytics.lastRevisionDate
                    ? dayjs(analytics.lastRevisionDate).format('MMM YYYY')
                    : '—',
                icon: <EventAvailableIcon />,
                tone: 'orange',
                footer: analytics.lastRevisionDate
                    ? `${dayjs().diff(dayjs(analytics.lastRevisionDate), 'month')}m ago`
                    : '—',
                footerTone: 'neutral',
            },
        ];
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {/* ── Career Hero ── */}
            <CareerJourneyHero
                analytics={analytics!}
                joiningDate={employee?.dateOfJoining ? String(employee.dateOfJoining) : undefined}
                showSensitiveData={showSensitiveData}
                loading={loading || !analytics}
            />

            {/* ── 4 KPI Cards (non-duplicating stats only) ── */}
            <IncrementKPISection
                cards={buildCards()}
                loading={loading}
                skeletonCount={4}
                columns={4}
            />

            {/* ── No history state ── */}
            {!loading && records.length === 0 && (
                <Paper
                    elevation={0}
                    sx={{ p: 5, textAlign: 'center', borderRadius: '16px', border: '1px solid #e9eef5', bgcolor: '#fbfdff', mb: 2 }}
                >
                    <Typography sx={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, mb: 0.75 }}>
                        No increment history found
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.88rem' }}>
                        This employee has not received any salary revisions yet.
                    </Typography>
                </Paper>
            )}

            {/* ── Career Growth Chart + Year-by-Year Breakdown ── */}
            {(loading || records.length > 0) && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 1.5, mb: 1.5 }}>
                    <IncrementGrowthChart
                        data={analytics?.graphData}
                        loading={loading}
                        showSensitiveData={showSensitiveData}
                        title="Career Salary Progression"
                        subtitle="Year-over-year compensation growth"
                        chartType="smooth"
                        accentColor="#7c3aed"
                        height={200}
                    />
                    {analytics && records.length > 0 && (
                        <GrowthPerYearBreakdown
                            records={records}
                            analytics={analytics}
                            showSensitiveData={showSensitiveData}
                            loading={loading}
                        />
                    )}
                    {loading && (
                        <Box sx={{ borderRadius: '16px', border: '1px solid #e9eef5', bgcolor: '#fafbfc', height: 280 }} />
                    )}
                </Box>
            )}

            {/* ── Full Audit Table + Insights + Career Timeline ── */}
            {!loading && records.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 1.5 }}>
                    {/* Left: Table with year filter */}
                    <Box>
                        {availableYears.length > 1 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                <Typography sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                                    Filter year:
                                </Typography>
                                {['all', ...availableYears].map(yr => (
                                    <Box
                                        key={yr}
                                        onClick={() => setYearFilter(yr)}
                                        sx={{
                                            px: 1.25, py: 0.35,
                                            borderRadius: '20px',
                                            fontSize: '0.75rem', fontWeight: 700,
                                            cursor: 'pointer',
                                            bgcolor: yearFilter === yr ? '#AA393D' : '#f1f5f9',
                                            color: yearFilter === yr ? '#fff' : '#475569',
                                            border: `1px solid ${yearFilter === yr ? '#AA393D' : '#e2e8f0'}`,
                                            transition: 'all 0.12s',
                                            userSelect: 'none',
                                            '&:hover': { bgcolor: yearFilter === yr ? '#8b2b2e' : '#e2e8f0' },
                                        }}
                                    >
                                        {yr === 'all' ? 'All' : yr}
                                    </Box>
                                ))}
                            </Box>
                        )}
                        <IncrementTable
                            data={filteredRecords}
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
                    </Box>

                    {/* Right: Insights + Career Timeline */}
                    <Box>
                        <SmartInsightsCard analytics={analytics} loading={loading} />
                        <IncrementTimeline
                            data={records}
                            loading={loading}
                            showSensitiveData={showSensitiveData}
                            chronological={true}
                            showFirstAsJoining={true}
                            title="Career Timeline"
                            subtitle="Salary journey from first record"
                        />
                    </Box>
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
                employeeId={employee?.id}
                currentSalary={analytics?.currentSalary || 0}
                onSubmit={async payload => {
                    if (selectedRecord) {
                        await incrementService.updateIncrement(employee.id, selectedRecord.id, payload);
                    }
                    setShowEditDialog(false);
                    loadData();
                }}
            />
        </Box>
    );
};

export default AllTime;
