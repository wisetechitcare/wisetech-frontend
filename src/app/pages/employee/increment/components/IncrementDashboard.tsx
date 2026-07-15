import React, { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LayersIcon from '@mui/icons-material/Layers';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { IncrementRecord, YearlyAnalytics, AllTimeAnalytics } from '@services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import AddEditIncrementDialog from '@app/modules/employee/salary/AddEditIncrementDialog';
import { IncrementMode, UseIncrementDataResult } from '../useIncrementData';
import IncrementKPISection, { KPICardConfig } from './IncrementKPISection';
import IncrementGrowthChart from './IncrementGrowthChart';
import IncrementTimeline from './IncrementTimeline';
import IncrementTable from './IncrementTable';
import IncrementDetailDialog from './IncrementDetailDialog';
import IncrementInsights from './IncrementInsights';
import CareerJourneyHero from './CareerJourneyHero';
import GrowthPerYearBreakdown from './GrowthPerYearBreakdown';
import YearSummaryPanel from './YearSummaryPanel';
import { EmptyState } from './widgets';

interface IncrementDashboardProps {
    mode: IncrementMode;
    /** Fiscal start year, e.g. '2026' for FY 2026-27. */
    year: string;
    fromAdmin: boolean;
    showSensitiveData: boolean;
    data: UseIncrementDataResult;
    employeeId?: string;
    employeeName: string;
    joiningDate?: string;
}

function buildYearlyCards(analytics: YearlyAnalytics, showSensitiveData: boolean): KPICardConfig[] {
    return [
        {
            label: 'Year Increment',
            value: analytics.yearIncrementAmount > 0
                ? `+${formatCurrencyRounded(analytics.yearIncrementAmount)}`
                : '—',
            icon: <TrendingUpIcon />,
            tone: 'success',
            footer: analytics.yearIncrementAmount > 0 ? 'Salary raised' : 'No raise this year',
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
            tone: 'indigo',
            footer: analytics.yearIncrementPercentage > 15
                ? 'Strong growth'
                : analytics.yearIncrementPercentage > 0
                    ? 'Moderate growth'
                    : 'No growth',
            footerTone: analytics.yearIncrementPercentage > 15
                ? 'success'
                : analytics.yearIncrementPercentage > 0
                    ? 'cyan'
                    : 'neutral',
        },
        {
            label: 'Revisions',
            value: String(analytics.revisionCount),
            icon: <EventRepeatIcon />,
            tone: 'warning',
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
            footerTone: 'cyan',
            isSensitive: true,
            showSensitiveData,
        },
    ];
}

function buildAllTimeCards(analytics: AllTimeAnalytics, showSensitiveData: boolean): KPICardConfig[] {
    return [
        {
            label: 'Total Revisions',
            value: String(analytics.totalRevisions),
            icon: <LayersIcon />,
            tone: 'warning',
            footer: `${analytics.yearsWithRevisions} year${analytics.yearsWithRevisions !== 1 ? 's' : ''} of records`,
            footerTone: 'warning',
        },
        {
            label: 'Years w/ Revisions',
            value: String(analytics.yearsWithRevisions),
            icon: <WorkHistoryIcon />,
            tone: 'cyan',
            footer: 'Distinct calendar years',
            footerTone: 'cyan',
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
            tone: 'brand',
            footer: analytics.lastRevisionDate
                ? `${dayjs().diff(dayjs(analytics.lastRevisionDate), 'month')}m ago`
                : '—',
            footerTone: 'neutral',
        },
    ];
}

const IncrementDashboard = ({
    mode,
    year,
    fromAdmin,
    showSensitiveData,
    data,
    employeeId,
    employeeName,
    joiningDate,
}: IncrementDashboardProps) => {
    const { loading, error, history, yearRecords, yearly, allTime, refetch } = data;

    const [selectedRecord, setSelectedRecord] = useState<IncrementRecord | null>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [yearFilter, setYearFilter] = useState<string>('all');

    const isYearly = mode === 'yearly';

    const availableYears = Array.from(
        new Set(history.map(r => dayjs(r.effectiveDate).format('YYYY')))
    ).sort((a, b) => Number(b) - Number(a));

    const tableRecords = isYearly
        ? yearRecords
        : yearFilter === 'all'
            ? history
            : history.filter(r => dayjs(r.effectiveDate).format('YYYY') === yearFilter);

    const cards = isYearly
        ? (yearly ? buildYearlyCards(yearly, showSensitiveData) : [])
        : (allTime ? buildAllTimeCards(allTime, showSensitiveData) : []);

    const hasActivity = isYearly
        ? (yearly?.startingSalaryForYear ?? 0) > 0 || yearRecords.length > 0
        : history.length > 0;

    const handleView = (r: IncrementRecord) => { setSelectedRecord(r); setShowDetailDialog(true); };
    const handleEdit = (r: IncrementRecord) => { setSelectedRecord(r); setShowEditDialog(true); };

    if (error) {
        return (
            <Paper elevation={0} sx={{ borderRadius: `${T.radius.lg}px`, border: `1px solid ${T.color.line}`, mb: 2 }}>
                <EmptyState
                    icon={<ErrorOutlineIcon sx={{ fontSize: 22, color: T.color.danger }} />}
                    title="Could not load increment data"
                    subtitle="Something went wrong while fetching salary history. Please try again."
                />
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {!isYearly && allTime && (
                <CareerJourneyHero
                    analytics={allTime}
                    joiningDate={joiningDate}
                    showSensitiveData={showSensitiveData}
                    loading={loading}
                />
            )}

            <IncrementKPISection cards={cards} loading={loading} skeletonCount={4} columns={4} />

            {/* No-data state */}
            {!loading && !hasActivity && (
                <Paper elevation={0} sx={{ borderRadius: `${T.radius.lg}px`, border: `1px solid ${T.color.line}`, bgcolor: T.color.surface, mb: 2 }}>
                    <EmptyState
                        title={isYearly ? `No salary data for ${year}` : 'No increment history found'}
                        subtitle={isYearly
                            ? `No active salary records were found for this employee in ${year}.`
                            : 'This employee has not received any salary revisions yet.'}
                    />
                </Paper>
            )}

            {/* Chart + side panel */}
            {(loading || hasActivity) && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 1.5, mb: 1.5 }}>
                    <IncrementGrowthChart
                        data={isYearly ? yearly?.graphData : allTime?.graphData}
                        loading={loading}
                        showSensitiveData={showSensitiveData}
                        title={isYearly ? `${year} Monthly Progression` : 'Career Salary Progression'}
                        subtitle={isYearly ? 'Salary at each month of the year' : 'Year-over-year compensation growth'}
                        chartType={isYearly ? 'step' : 'smooth'}
                        accentColor={isYearly ? T.color.accent : T.color.indigo}
                        height={200}
                    />
                    {isYearly && yearly && (
                        <YearSummaryPanel
                            analytics={yearly}
                            year={year}
                            showSensitiveData={showSensitiveData}
                            loading={loading}
                        />
                    )}
                    {!isYearly && allTime && history.length > 0 && (
                        <GrowthPerYearBreakdown
                            records={history}
                            analytics={allTime}
                            showSensitiveData={showSensitiveData}
                            loading={loading}
                        />
                    )}
                </Box>
            )}

            {/* Yearly insights sit full-width between chart and table */}
            {isYearly && (loading || hasActivity) && (
                <IncrementInsights mode="yearly" yearly={yearly} year={year} loading={loading} />
            )}

            {/* Table + timeline (+ all-time insights) */}
            {!loading && hasActivity && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: isYearly ? '7fr 3fr' : '3fr 2fr' }, gap: 1.5 }}>
                    <Box>
                        {!isYearly && availableYears.length > 1 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                <Typography sx={{ color: T.color.inkSoft, fontSize: '0.75rem', fontWeight: 700 }}>
                                    Filter year:
                                </Typography>
                                {['all', ...availableYears].map(yr => (
                                    <Box
                                        key={yr}
                                        onClick={() => setYearFilter(yr)}
                                        sx={{
                                            px: 1.25, py: 0.35,
                                            borderRadius: `${T.radius.pill}px`,
                                            fontSize: '0.75rem', fontWeight: 700,
                                            cursor: 'pointer',
                                            bgcolor: yearFilter === yr ? T.color.accent : T.color.panel,
                                            color: yearFilter === yr ? '#fff' : T.color.inkSoft,
                                            border: `1px solid ${yearFilter === yr ? T.color.accent : T.color.line}`,
                                            transition: 'all 0.12s',
                                            userSelect: 'none',
                                            '&:hover': { bgcolor: yearFilter === yr ? T.color.accent : T.color.panelAlt },
                                        }}
                                    >
                                        {yr === 'all' ? 'All' : yr}
                                    </Box>
                                ))}
                            </Box>
                        )}
                        <IncrementTable
                            data={tableRecords}
                            loading={loading}
                            showSensitiveData={showSensitiveData}
                            fromAdmin={fromAdmin}
                            onView={handleView}
                            onEdit={fromAdmin ? handleEdit : undefined}
                        />
                    </Box>

                    <Box>
                        {!isYearly && (
                            <Box sx={{ mb: 1.5 }}>
                                <IncrementInsights mode="alltime" allTime={allTime} loading={loading} />
                            </Box>
                        )}
                        <IncrementTimeline
                            data={isYearly ? yearRecords : history}
                            loading={loading}
                            showSensitiveData={showSensitiveData}
                            chronological={!isYearly}
                            showFirstAsJoining={!isYearly}
                            title={isYearly ? `${year} Revisions` : 'Career Timeline'}
                            subtitle={isYearly ? 'Changes made this year' : 'Salary journey from first record'}
                        />
                    </Box>
                </Box>
            )}

            <IncrementDetailDialog
                open={showDetailDialog}
                onClose={() => setShowDetailDialog(false)}
                record={selectedRecord}
                employeeName={employeeName}
            />

            {fromAdmin && employeeId && (
                <AddEditIncrementDialog
                    open={showEditDialog}
                    onClose={() => setShowEditDialog(false)}
                    employeeId={employeeId}
                    employeeName={employeeName}
                    record={selectedRecord}
                    history={history}
                    onSuccess={refetch}
                />
            )}
        </Box>
    );
};

export default IncrementDashboard;
