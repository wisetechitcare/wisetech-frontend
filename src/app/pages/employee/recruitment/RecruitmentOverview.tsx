import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography, Tooltip, CircularProgress } from "@mui/material";
import {
    AutoGrid, ListHeader, GlassCard, StatTile, ToneChip, Eyebrow, TRIO, SectionHead,
    type Trio, type SemanticTone,
} from "@app/modules/common/components/ui";
import PeriodFilter, { type PeriodRange } from "@app/modules/common/components/PeriodFilter";
import { queryKeys } from "@/lib/queryKeys";
import { getRecruitmentOverview } from "@services/recruitment";

const FALLBACK_BAR = "#94A3B8";
const OFFER_TONE: Record<string, SemanticTone> = { ACCEPTED: "success", PENDING: "warning", DECLINED: "danger", EXPIRED: "brand" };
const titleCase = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** Horizontal magnitude bar. Fill uses the config (admin-set) identity colour; all
 *  text stays in ink tokens so the chart reads correctly in light AND dark mode. */
const BarRow = ({ label, count, max, color }: { label: string; count: number; max: number; color?: string | null }) => {
    const pct = max > 0 && count > 0 ? Math.max(5, Math.round((count / max) * 100)) : 0;
    return (
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
            <Typography noWrap title={label} sx={{ fontSize: 12.5, fontWeight: 600, width: { xs: 88, sm: 132 }, flexShrink: 0, color: "text.secondary" }}>
                {label}
            </Typography>
            <Tooltip title={`${count}`} arrow placement="top">
                <Box sx={{ flex: 1, minWidth: 0, height: 20, borderRadius: 999, bgcolor: "action.hover", overflow: "hidden" }}>
                    <Box sx={{ width: `${pct}%`, height: "100%", borderRadius: 999, bgcolor: color || FALLBACK_BAR, transition: "width .5s cubic-bezier(0.4,0,0.2,1)" }} />
                </Box>
            </Tooltip>
            <Typography sx={{ fontSize: 13, fontWeight: 700, width: 30, textAlign: "right", flexShrink: 0 }}>{count}</Typography>
        </Stack>
    );
};

/** Card lead-in. Delegates to the kit's SectionHead so every title is capitalised by the
 *  same rule as the rest of the app rather than by hand. */
const CardTitle = ({ title, hint, tone, icon }: { title: string; hint?: string; tone: Trio; icon: string }) => (
    <Box sx={{ mb: 1.5 }}>
        <SectionHead tone={tone} icon={icon} title={title} desc={hint} />
    </Box>
);

const EmptyHint = ({ text }: { text: string }) => (
    <Typography sx={{ fontSize: 12.5, color: "text.disabled", py: 1.5 }}>{text}</Typography>
);

const dayWord = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/**
 * One step of the hiring process: how long it usually takes, and who is waiting there now.
 * Written for a reader who does not think in averages — "usually takes 3 days" rather than
 * "3d avg", and the small-sample caveat spelled out instead of a sample count.
 */
const StageRow = ({ name, color, avgDays, samples, openCount, oldestOpenDays }: {
    name: string; color?: string | null; avgDays: number | null; samples: number; openCount: number; oldestOpenDays: number | null;
}) => (
    <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ py: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: color || FALLBACK_BAR, flexShrink: 0 }} />
        <Typography noWrap title={name} sx={{ fontSize: 12.5, fontWeight: 600, width: { xs: 96, sm: 150 }, flexShrink: 0 }}>{name}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", flex: 1, minWidth: 0 }}>
            {avgDays == null
                ? "No one has moved past this step yet"
                : samples < 3
                  ? `Usually takes ${dayWord(avgDays)} — but only ${samples === 1 ? "1 person has" : `${samples} people have`} gone through so far`
                  : `Usually takes ${dayWord(avgDays)}`}
        </Typography>
        {openCount > 0 && (
            <Tooltip
                arrow
                placement="top"
                title={`${openCount === 1 ? "1 person is" : `${openCount} people are`} waiting here. The one waiting longest has been here ${dayWord(oldestOpenDays ?? 0)}.`}
            >
                {/* The longest wait is the number worth acting on: a step that usually takes
                    2 days with someone sitting 40 days is one person being forgotten, and no
                    average will ever show that. */}
                <span>
                    <ToneChip
                        dense
                        tone={(oldestOpenDays ?? 0) >= 14 ? "danger" : "neutral"}
                        label={`${openCount} waiting · longest ${dayWord(oldestOpenDays ?? 0)}`}
                    />
                </span>
            </Tooltip>
        )}
    </Stack>
);

const RecruitmentOverview = () => {
    // The shared PeriodFilter (Daily / Weekly / Monthly / Yearly / All Time) is the same
    // control Attendance uses, so the period vocabulary is identical across the app.
    // "All Time" emits no start/end, which the API reads as no window.
    const [period, setPeriod] = useState<{ from?: string; to?: string; label: string }>({ label: "All Time" });
    const onPeriodChange = useCallback((r: PeriodRange) => {
        setPeriod({
            from: r.start?.toISOString(),
            to: r.end?.toISOString(),
            label: r.label || "All Time",
        });
    }, []);
    const range = { from: period.from, to: period.to };

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.recruitment.overview(range),
        queryFn: () => getRecruitmentOverview(range),
    });

    if (isLoading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={30} /></Stack>;
    if (!data) return <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>Nothing to show yet.</Box>;

    const { kpis, funnel, candidatesBySource, requisitionsByStatus, offersByAcceptance, stageDurations, timeToHire } = data;
    const funnelMax = Math.max(1, ...funnel.map((f) => f.count));
    const sourceMax = Math.max(1, ...candidatesBySource.map((s) => s.count));
    const conversion = kpis.totalApplications > 0 ? Math.round((kpis.hires / kpis.totalApplications) * 100) : 0;

    const kpiTiles: Array<{ label: string; value: number | string; trio: Trio; icon: string }> = [
        { label: "Open Roles", value: kpis.openRequisitions, trio: TRIO.blue, icon: "questionnaire-tablet" },
        { label: "In Process", value: kpis.activeCandidates, trio: TRIO.purple, icon: "profile-circle" },
        { label: "Interviews", value: kpis.interviewsScheduled, trio: TRIO.cyan, icon: "message-text-2" },
        { label: "Offers Out", value: kpis.offersOutstanding, trio: TRIO.amber, icon: "dollar" },
        { label: "Hired", value: kpis.hires, trio: TRIO.green, icon: "user-tick" },
        // The median, not the average: one long-running role drags an average away from
        // reality, so "typical" is both the plainer word and the accurate one.
        { label: "Time to Hire", value: timeToHire.medianDays == null ? "—" : dayWord(timeToHire.medianDays), trio: TRIO.slate, icon: "chart-simple" },
    ];

    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title="Recruitment Overview"
                subtitle={`How hiring is going — showing ${period.label}.`}
                actions={
                    <PeriodFilter
                        initialMode="allyear"
                        allowedModes={["daily", "weekly", "monthly", "yearly", "allyear"]}
                        storageKey="recruitment:overview:period"
                        // Compact labels: this control sits in a header that also carries a
                        // title, and its own docblock recommends compact where width is tight.
                        dateStyle="compact"
                        navMinWidth={150}
                        onChange={onPeriodChange}
                    />
                }
            />

            <AutoGrid
                min={200}
                sx={{
                    mb: 2,
                    gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
                    },
                }}
            >
                {kpiTiles.map((t) => <StatTile key={t.label} label={t.label} value={t.value} trio={t.trio} icon={t.icon} />)}
            </AutoGrid>

            <GlassCard preset="section" sx={{ mb: 2 }}>
                <CardTitle
                    tone={TRIO.blue}
                    icon="chart-simple"
                    title="Where Applicants Are"
                    hint={`${kpis.totalApplications} people applied · ${conversion} in every 100 were hired · ${kpis.publishedPostings} jobs live on the careers page`}
                />
                {funnel.length === 0 ? (
                    <EmptyHint text="No hiring steps set up yet. Add them in the Configure tab." />
                ) : (
                    <Stack spacing={1}>
                        {funnel.map((f) => <BarRow key={f.id} label={f.name} count={f.count} max={funnelMax} color={f.color} />)}
                    </Stack>
                )}
            </GlassCard>

            <GlassCard preset="section" sx={{ mb: 2 }}>
                <CardTitle
                    tone={TRIO.amber}
                    icon="time"
                    title="How Long Each Step Takes"
                    hint={
                        timeToHire.count > 0
                            ? `Across ${timeToHire.count === 1 ? "1 hire" : `${timeToHire.count} hires`}, most people were hired within ${dayWord(timeToHire.medianDays ?? 0)}, and 9 out of 10 within ${dayWord(timeToHire.p90Days ?? 0)}.`
                            : "How long people usually wait at each step, and who is waiting right now."
                    }
                />
                {stageDurations.length === 0 ? (
                    <EmptyHint text="Nobody has moved between steps yet, so there is nothing to measure." />
                ) : (
                    <Stack spacing={0.25}>
                        {stageDurations.map((d) => (
                            <StageRow
                                key={d.statusId}
                                name={d.name}
                                color={d.color}
                                avgDays={d.avgDays}
                                samples={d.samples}
                                openCount={d.openCount}
                                oldestOpenDays={d.oldestOpenDays}
                            />
                        ))}
                    </Stack>
                )}
            </GlassCard>

            <AutoGrid min={340}>
                <GlassCard preset="section">
                    <CardTitle
                        tone={TRIO.purple}
                        icon="entity"
                        title="Where Candidates Come From"
                        hint="The bar shows how many applied. The line underneath shows how many were actually hired — that is the number worth spending on."
                    />
                    {candidatesBySource.length === 0 ? (
                        <EmptyHint text="No applicants yet." />
                    ) : (
                        <Stack spacing={1}>
                            {candidatesBySource.map((s) => (
                                <Box key={s.id}>
                                    <BarRow label={s.name} count={s.count} max={sourceMax} color={s.color} />
                                    {s.hires > 0 && (
                                        <Typography sx={{ fontSize: 11.5, color: "text.secondary", pl: { xs: 12.5, sm: 17 }, mt: -0.25 }}>
                                            {s.hires} hired — {s.hireRatePct} in every 100 who applied
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Stack>
                    )}
                </GlassCard>

                <GlassCard preset="section">
                    <CardTitle
                        tone={TRIO.green}
                        icon="check-circle"
                        title="Approvals & Offers"
                        hint="Roles waiting for sign-off, and how candidates have replied to their offers."
                    />
                    <Stack spacing={2}>
                        <Box>
                            <Eyebrow sx={{ mb: 0.75 }}>Role Requests</Eyebrow>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                <ToneChip tone="warning" label={`Waiting for Approval ${requisitionsByStatus.pending}`} />
                                <ToneChip tone="success" label={`Approved ${requisitionsByStatus.approved}`} />
                                <ToneChip tone="danger" label={`Turned Down ${requisitionsByStatus.rejected}`} />
                            </Stack>
                        </Box>
                        <Box>
                            <Eyebrow sx={{ mb: 0.75 }}>Offers</Eyebrow>
                            {offersByAcceptance.length === 0 ? (
                                <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>No offers sent yet.</Typography>
                            ) : (
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                    {offersByAcceptance.map((o) => <ToneChip key={o.status} tone={OFFER_TONE[o.status] ?? "brand"} label={`${titleCase(o.status)} ${o.count}`} />)}
                                </Stack>
                            )}
                        </Box>
                    </Stack>
                </GlassCard>
            </AutoGrid>
        </Box>
    );
};

export default RecruitmentOverview;
