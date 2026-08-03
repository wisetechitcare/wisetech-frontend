import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography, Tooltip, CircularProgress } from "@mui/material";
import {
    AutoGrid, ListHeader, GlassCard, StatTile, ToneChip, Eyebrow, TRIO,
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

const RecruitmentOverview = () => {
    const { data, isLoading } = useQuery({ queryKey: queryKeys.recruitment.overview(), queryFn: getRecruitmentOverview });

    if (isLoading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={30} /></Stack>;
    if (!data) return <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>No overview data yet.</Box>;

    const { kpis, funnel, candidatesBySource, requisitionsByStatus, offersByAcceptance } = data;
    const funnelMax = Math.max(1, ...funnel.map((f) => f.count));
    const sourceMax = Math.max(1, ...candidatesBySource.map((s) => s.count));
    const conversion = kpis.totalApplications > 0 ? Math.round((kpis.hires / kpis.totalApplications) * 100) : 0;

    const kpiTiles: Array<{ label: string; value: number | string; trio: Trio; icon: string }> = [
        { label: "Open requisitions", value: kpis.openRequisitions, trio: TRIO.blue, icon: "questionnaire-tablet" },
        { label: "Active candidates", value: kpis.activeCandidates, trio: TRIO.purple, icon: "profile-circle" },
        { label: "Interviews scheduled", value: kpis.interviewsScheduled, trio: TRIO.cyan, icon: "message-text-2" },
        { label: "Offers outstanding", value: kpis.offersOutstanding, trio: TRIO.amber, icon: "dollar" },
        { label: "Hires", value: kpis.hires, trio: TRIO.green, icon: "user-tick" },
        { label: "Avg time-to-hire", value: kpis.avgTimeToHireDays == null ? "—" : `${kpis.avgTimeToHireDays}d`, trio: TRIO.slate, icon: "chart-simple" },
    ];

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader title="Recruitment Overview" subtitle="Live hiring funnel, pipeline health, and sourcing at a glance." />

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

            <AutoGrid min={340}>
                <GlassCard preset="section">
                    <CardTitle title="Candidates by source" hint="Where applicants come from" />
                    {candidatesBySource.length === 0 ? (
                        <EmptyHint text="No sourced candidates yet." />
                    ) : (
                        <Stack spacing={1}>
                            {candidatesBySource.map((s) => <BarRow key={s.id} label={s.name} count={s.count} max={sourceMax} color={s.color} />)}
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
