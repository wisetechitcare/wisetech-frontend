import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography, Tooltip, CircularProgress } from "@mui/material";
import {
    AutoGrid, ListHeader, GlassCard, StatTile, ToneChip, Eyebrow, TRIO, SegmentedControl,
    type Trio, type SemanticTone,
} from "@app/modules/common/components/ui";
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
        <Stack direction="row" alignItems="center" spacing={1.25}>
            <Typography noWrap title={label} sx={{ fontSize: 12.5, fontWeight: 600, width: { xs: 96, sm: 132 }, flexShrink: 0, color: "text.secondary" }}>
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

const CardTitle = ({ title, hint }: { title: string; hint?: string }) => (
    <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>{hint}</Typography>}
    </Box>
);

const EmptyHint = ({ text }: { text: string }) => (
    <Typography sx={{ fontSize: 12.5, color: "text.disabled", py: 1.5 }}>{text}</Typography>
);

/**
 * Presets rather than a date picker: a one-recruiter team asks "how did the last quarter
 * go", not "show me 14 Feb to 3 Mar". Two clicks beats two calendar dialogs, and the server
 * echoes back the window it applied so the header can never lie about what is on screen.
 */
const RANGES = [
    { key: "30", label: "30 days", days: 30 },
    { key: "90", label: "90 days", days: 90 },
    { key: "365", label: "12 months", days: 365 },
    { key: "all", label: "All time", days: null as number | null },
] as const;

/** Dwell time and backlog for one stage. Colour follows the admin-set stage identity. */
const StageHealthRow = ({ name, color, avgDays, samples, openCount, oldestOpenDays }: {
    name: string; color?: string | null; avgDays: number | null; samples: number; openCount: number; oldestOpenDays: number | null;
}) => (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: color || FALLBACK_BAR, flexShrink: 0 }} />
        <Typography noWrap title={name} sx={{ fontSize: 12.5, fontWeight: 600, width: { xs: 96, sm: 150 }, flexShrink: 0 }}>{name}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", flex: 1, minWidth: 0 }}>
            {avgDays == null
                ? "no completed moves yet"
                : `${avgDays}d average${samples < 3 ? ` (only ${samples} move${samples === 1 ? "" : "s"})` : ""}`}
        </Typography>
        {openCount > 0 && (
            <Tooltip arrow placement="top" title={`${openCount} waiting here now · longest ${oldestOpenDays}d`}>
                {/* The oldest waiter is the actionable number: a stage averaging 2 days with
                    someone sitting 40 days is a specific person being forgotten. */}
                <span><ToneChip dense tone={(oldestOpenDays ?? 0) >= 14 ? "danger" : "neutral"} label={`${openCount} waiting · ${oldestOpenDays}d`} /></span>
            </Tooltip>
        )}
    </Stack>
);

const RecruitmentOverview = () => {
    const [rangeKey, setRangeKey] = useState<string>("all");
    const range = useMemo(() => {
        const preset = RANGES.find((r) => r.key === rangeKey);
        if (!preset?.days) return {};
        return { from: new Date(Date.now() - preset.days * 86_400_000).toISOString() };
    }, [rangeKey]);

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.recruitment.overview(range),
        queryFn: () => getRecruitmentOverview(range),
    });

    if (isLoading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={30} /></Stack>;
    if (!data) return <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>No overview data yet.</Box>;

    const { kpis, funnel, candidatesBySource, requisitionsByStatus, offersByAcceptance, stageDurations, timeToHire } = data;
    const funnelMax = Math.max(1, ...funnel.map((f) => f.count));
    const sourceMax = Math.max(1, ...candidatesBySource.map((s) => s.count));
    const conversion = kpis.totalApplications > 0 ? Math.round((kpis.hires / kpis.totalApplications) * 100) : 0;

    const kpiTiles: Array<{ label: string; value: number | string; trio: Trio; icon: string }> = [
        { label: "Open requisitions", value: kpis.openRequisitions, trio: TRIO.blue, icon: "questionnaire-tablet" },
        { label: "Active candidates", value: kpis.activeCandidates, trio: TRIO.purple, icon: "profile-circle" },
        { label: "Interviews scheduled", value: kpis.interviewsScheduled, trio: TRIO.cyan, icon: "message-text-2" },
        { label: "Offers outstanding", value: kpis.offersOutstanding, trio: TRIO.amber, icon: "dollar" },
        { label: "Hires", value: kpis.hires, trio: TRIO.green, icon: "user-tick" },
        // Median, not mean: one long-running role drags an average away from reality.
        { label: "Median time-to-hire", value: timeToHire.medianDays == null ? "—" : `${timeToHire.medianDays}d`, trio: TRIO.slate, icon: "chart-simple" },
    ];

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title="Recruitment Overview"
                subtitle={rangeKey === "all" ? "All time." : `Applications received in the last ${RANGES.find((r) => r.key === rangeKey)?.label}.`}
                actions={
                    <SegmentedControl
                        value={rangeKey}
                        onChange={setRangeKey}
                        ariaLabel="Reporting period"
                        options={RANGES.map((r) => ({ value: r.key, label: r.label }))}
                    />
                }
            />

            <AutoGrid min={200} sx={{ mb: 2 }}>
                {kpiTiles.map((t) => <StatTile key={t.label} label={t.label} value={t.value} trio={t.trio} icon={t.icon} />)}
            </AutoGrid>

            <GlassCard preset="section" sx={{ mb: 2 }}>
                <CardTitle title="Pipeline funnel" hint={`${kpis.totalApplications} applications · ${conversion}% hired · ${kpis.publishedPostings} live postings`} />
                {funnel.length === 0 ? (
                    <EmptyHint text="No pipeline stages configured yet — add them in the Configure tab." />
                ) : (
                    <Stack spacing={1}>
                        {funnel.map((f) => <BarRow key={f.id} label={f.name} count={f.count} max={funnelMax} color={f.color} />)}
                    </Stack>
                )}
            </GlassCard>

            <GlassCard preset="section" sx={{ mb: 2 }}>
                <CardTitle
                    title="Stage health"
                    hint={
                        timeToHire.count > 0
                            ? `${timeToHire.count} hires · median ${timeToHire.medianDays}d · 9 in 10 within ${timeToHire.p90Days}d · mean ${timeToHire.avgDays}d`
                            : "How long candidates sit at each step, and who is waiting now"
                    }
                />
                {stageDurations.length === 0 ? (
                    <EmptyHint text="No stage movement recorded yet." />
                ) : (
                    <Stack spacing={0.25}>
                        {stageDurations.map((d) => (
                            <StageHealthRow
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
                    <CardTitle title="Candidates by source" hint="Volume tells you which channel is loudest; the hire rate tells you which works" />
                    {candidatesBySource.length === 0 ? (
                        <EmptyHint text="No sourced candidates yet." />
                    ) : (
                        <Stack spacing={1}>
                            {candidatesBySource.map((s) => (
                                <Box key={s.id}>
                                    <BarRow label={s.name} count={s.count} max={sourceMax} color={s.color} />
                                    {s.hires > 0 && (
                                        <Typography sx={{ fontSize: 11.5, color: "text.secondary", pl: { xs: 12.5, sm: 17 }, mt: -0.25 }}>
                                            {s.hires} hired · {s.hireRatePct}% of applicants
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Stack>
                    )}
                </GlassCard>

                <GlassCard preset="section">
                    <CardTitle title="Requisitions & offers" hint="Approval and offer status" />
                    <Stack spacing={2}>
                        <Box>
                            <Eyebrow sx={{ mb: 0.75 }}>Requisitions</Eyebrow>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                <ToneChip tone="warning" label={`Pending ${requisitionsByStatus.pending}`} />
                                <ToneChip tone="success" label={`Approved ${requisitionsByStatus.approved}`} />
                                <ToneChip tone="danger" label={`Rejected ${requisitionsByStatus.rejected}`} />
                            </Stack>
                        </Box>
                        <Box>
                            <Eyebrow sx={{ mb: 0.75 }}>Offers</Eyebrow>
                            {offersByAcceptance.length === 0 ? (
                                <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>No offers yet.</Typography>
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
