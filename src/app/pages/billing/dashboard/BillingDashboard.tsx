import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { KTIcon } from "@metronic/helpers";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/ds/ui/chart";
import { Progress } from "@/ds/ui/progress";
import { GlassCard, IconBox, TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal, getCurrencySymbol } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
  getBillingDashboard, type BillingDashboardData, type DashboardItem, type DashboardList, type ProformaState,
} from "@services/billingTrackers";
import { useBillingOrgId } from "../BillingLayout";
import { BillingPageHeader, BillingStatsCard } from "../components";
import type { Trio } from "../components/trackerKit";
import { PAYMENT_COMPONENT_LABEL } from "../project/projectBillingRules";

/**
 * The Billing Dashboard — the module on one page, for whoever runs billing.
 *
 *   1. The money in one line: contract → still to raise → billed → received → outstanding → overdue.
 *   2. The pipeline: where every proforma is, draft to invoiced.
 *   3. Billed against received, month by month.
 *   4. What needs someone today: overdue, falling due, invoices due, drafts waiting, TDS not deposited.
 *   5. The latest money in, and the projects owing the most.
 *
 * Every figure is the sum of rows the Proforma Tracker shows (the server builds this from the tracker's own rows), and
 * every tile, stage and list opens that tracker already filtered to exactly those rows.
 */

const PROFORMA_TRACKER_PATH = "/billing/proformas";
const tracker = (query: string) => `${PROFORMA_TRACKER_PATH}?${query}`;

/** Money in Indian short form for chart axes: 85K, 4.3L, 2.1Cr. */
const shortInr = (value: number) => {
  const symbol = getCurrencySymbol();
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${symbol}${(value / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `${symbol}${(value / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `${symbol}${Math.round(value / 1e3)}K`;
  return `${symbol}${Math.round(value)}`;
};
const monthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short" });
};

const PIPELINE: Record<ProformaState, { label: string; hint: string; trio: Trio; icon: string }> = {
  DRAFT: { label: "Draft", hint: "to issue", trio: TRIO.purple, icon: "pencil" },
  AWAITING: { label: "Awaiting payment", hint: "outstanding", trio: TRIO.cyan, icon: "time" },
  PARTIAL: { label: "Partially paid", hint: "outstanding", trio: TRIO.amber, icon: "chart-pie-simple" },
  PAID: { label: "Paid · invoice due", hint: "billed", trio: TRIO.green, icon: "check-circle" },
  INVOICED: { label: "Invoiced", hint: "billed", trio: TRIO.green, icon: "receipt-square" },
};

// Keys must match the <Bar dataKey> values below; the colours are the chart theme's CSS variables, so dark mode follows.
const trendConfig = {
  billed: { label: "Billed", color: "var(--chart-1)" },
  received: { label: "Received", color: "var(--chart-5)" },
} satisfies ChartConfig;

/** A titled card with an optional "open" link — every section of the page sits in one of these. */
const Section: React.FC<{
  title: string;
  icon: string;
  trio: Trio;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}> = ({ title, icon, trio, action, children }) => (
  <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 }, height: "100%", minWidth: 0 }}>
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
      <IconBox icon={icon} trio={trio} size={32} fs="fs-5" />
      <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5 }}>{title}</Typography>
      {action && (
        <Typography
          component="button"
          type="button"
          onClick={action.onClick}
          sx={{
            border: 0, bgcolor: "transparent", cursor: "pointer", p: 0,
            fontSize: 12.5, fontWeight: 700, color: "primary.main", "&:hover": { textDecoration: "underline" },
          }}
        >
          {action.label} →
        </Typography>
      )}
    </Stack>
    {children}
  </GlassCard>
);

/** One clickable line of a list: what, for whom, how much, and why it is here. */
const Line: React.FC<{
  title: React.ReactNode;
  sub: React.ReactNode;
  amount: number;
  note?: React.ReactNode;
  noteTone?: string;
  onClick: () => void;
}> = ({ title, sub, amount, note, noteTone, onClick }) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    onClick={onClick}
    sx={{
      px: 1, py: 0.8, borderRadius: "10px", cursor: "pointer",
      border: "1px solid", borderColor: "divider",
      "&:hover": { bgcolor: "action.hover" },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>{title}</Typography>
      <Typography noWrap sx={{ fontSize: 11.5, color: "text.secondary" }}>{sub}</Typography>
    </Box>
    <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatCurrencyDecimal(amount)}</Typography>
      {note && <Typography sx={{ fontSize: 11, fontWeight: 700, color: noteTone ?? "text.disabled" }}>{note}</Typography>}
    </Stack>
  </Stack>
);

const AllClear: React.FC<{ text: string }> = ({ text }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ py: 1.25, color: "success.main" }}>
    <KTIcon iconName="check-circle" className="fs-5 text-success" />
    <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{text}</Typography>
  </Stack>
);

const ListSkeleton: React.FC = () => (
  <Stack spacing={0.75}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={46} />)}</Stack>
);

const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const organizationId = useBillingOrgId();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-dashboard", organizationId],
    queryFn: () => getBillingDashboard({ organizationId }),
  });
  const go = (path: string) => () => navigate(path);
  // Undefined until the first load; each tile shows a dash until then, so the layout does not jump.
  const k = data?.kpis;

  /** Where an attention item opens: a draft in the editor, an issued one at its record, otherwise the project. */
  const openItem = (item: DashboardItem, toProject = false) => () => {
    if (toProject || !item.documentId) return navigate(`/project/${item.leadId}?tab=billing`);
    navigate(`/billing/documents/${item.documentId}${item.state === "DRAFT" ? "/edit" : ""}`);
  };

  // One card per attention list. The header amount opens the tracker with the same filter that built the list, so the
  // card and the tracker always show the same rows.
  const attentionCard = (
    key: keyof BillingDashboardData["attention"],
    title: string,
    icon: string,
    trio: Trio,
    query: string,
    clear: string,
    render: (item: DashboardItem) => React.ReactNode,
  ) => {
    const list: DashboardList | undefined = data?.attention[key];
    return (
      <Section
        title={list ? `${title} · ${list.count}` : title}
        icon={icon}
        trio={trio}
        action={list?.count ? { label: formatCurrencyDecimal(list.amount), onClick: go(tracker(query)) } : undefined}
      >
        {isLoading ? <ListSkeleton /> : !list?.items.length ? <AllClear text={clear} /> : (
          <Stack spacing={0.75}>{list.items.map((item) => <React.Fragment key={item.billId}>{render(item)}</React.Fragment>)}</Stack>
        )}
      </Section>
    );
  };

  const subOf = (item: DashboardItem) => `${item.projectName ?? item.projectNumber ?? "—"} · ${item.stageName}`;
  // Share of proformas per stage, by count (the stacked bar's widths). It is not a share of money.
  const pipelineTotal = (data?.pipeline ?? []).reduce((s, p) => s + p.count, 0);

  return (
    <Box sx={{ pb: 4 }}>
      <BillingPageHeader
        icon="chart-simple"
        title="Billing Dashboard"
        description={`Where the money is — raised, billed, collected and owed${data ? ` · as of ${formatDate(data.asOf)}` : ""}.`}
        trio={TRIO.purple}
      />

      {/* 1 · The money, in one line, in the order it moves. */}
      <Box
        sx={{
          display: "grid", gap: 1.25, mb: 2,
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" },
        }}
      >
        <BillingStatsCard
          label="Contract value" icon="briefcase" trio={TRIO.blue} loading={isLoading}
          value={k ? formatCurrencyDecimal(k.contractValue) : "—"}
          hint={k ? `${k.contractProjects} projects in billing` : undefined}
          onClick={go(PROFORMA_TRACKER_PATH)}
        />
        <BillingStatsCard
          label="Still to raise" icon="add-files" trio={TRIO.slate} loading={isLoading}
          value={k ? formatCurrencyDecimal(k.notRaised) : "—"}
          hint={k ? `${k.notRaisedProjects} projects not fully on proformas` : undefined}
          onClick={go(tracker("focus=NOT_RAISED"))}
        />
        <BillingStatsCard
          label="Billed" icon="document" trio={TRIO.purple} loading={isLoading}
          value={k ? formatCurrencyDecimal(k.billed) : "—"}
          hint={k ? `${k.billedCount} proformas issued` : undefined}
          onClick={go(tracker("view=proformas"))}
        />
        <BillingStatsCard
          label="Received" icon="wallet" trio={TRIO.green} loading={isLoading}
          value={k ? formatCurrencyDecimal(k.received) : "—"}
          hint={k ? `${formatCurrencyDecimal(k.receivedThisMonth)} this month${k.collectionRate != null ? ` · ${k.collectionRate}% collected` : ""}` : undefined}
          onClick={go(tracker("view=proformas"))}
        />
        <BillingStatsCard
          label="Outstanding" icon="time" trio={TRIO.amber} loading={isLoading}
          value={k ? formatCurrencyDecimal(k.outstanding) : "—"}
          hint={k ? `on ${k.outstandingCount} proformas` : undefined}
          onClick={go(tracker("view=proformas"))}
        />
        <BillingStatsCard
          label="Overdue" icon="information-5" trio={TRIO.rose} loading={isLoading}
          value={k ? formatCurrencyDecimal(k.overdue) : "—"}
          hint={k ? (k.overdueCount ? `${k.overdueCount} proformas past due` : "Nothing past due") : undefined}
          onClick={go(tracker("view=proformas&focus=OVERDUE"))}
        />
      </Box>

      {/* 2 · The pipeline   3 · The trend */}
      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: { xs: "1fr", lg: "1.15fr 1fr" } }}>
        <Section
          title="Proforma pipeline"
          icon="abstract-26"
          trio={TRIO.cyan}
          action={{ label: "Proformas", onClick: go(tracker("view=proformas")) }}
        >
          {isLoading ? <ListSkeleton /> : (
            <>
              {/* The share of proformas at each stage, as one bar. */}
              <Box sx={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", bgcolor: "action.hover", mb: 1.75 }}>
                {pipelineTotal > 0 && data?.pipeline.map((p) => p.count > 0 && (
                  <Box key={p.state} title={`${PIPELINE[p.state].label}: ${p.count}`}
                    sx={{ width: `${(p.count / pipelineTotal) * 100}%`, bgcolor: PIPELINE[p.state].trio.c }} />
                ))}
              </Box>
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(5, minmax(0, 1fr))" } }}>
                {data?.pipeline.map((p) => {
                  const meta = PIPELINE[p.state];
                  return (
                    <Box
                      key={p.state}
                      onClick={go(tracker(`view=proformas&focus=${p.state}`))}
                      sx={{
                        p: 1.25, borderRadius: "12px", cursor: "pointer", minWidth: 0,
                        bgcolor: meta.trio.bg, border: `1px solid ${meta.trio.bd}`,
                        transition: "transform .15s", "&:hover": { transform: "translateY(-2px)" },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.5 }}>
                        <KTIcon iconName={meta.icon} className="fs-6" />
                        <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: meta.trio.c, textTransform: "uppercase", letterSpacing: 0.3 }}>
                          {meta.label}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{p.count}</Typography>
                      <Typography noWrap sx={{ fontSize: 11.5, color: "text.secondary" }}>
                        {formatCurrencyDecimal(p.amount)} {meta.hint}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </Section>

        <Section title="Billed vs received · last 6 months" icon="chart-simple" trio={TRIO.blue}>
          {isLoading ? <Skeleton variant="rounded" height={210} /> : (
            <ChartContainer config={trendConfig} className="h-[210px] w-full" role="img" aria-label="Billed and received by month, last six months">
              <BarChart data={(data?.trend ?? []).map((t) => ({ ...t, label: monthLabel(t.month) }))} margin={{ left: 4, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={shortInr} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-3">
                    <span className="text-muted-foreground">{trendConfig[name as keyof typeof trendConfig]?.label ?? name}</span>
                    <span className="font-mono font-semibold">{formatCurrencyDecimal(Number(value))}</span>
                  </span>
                )} />} />
                <Bar dataKey="billed" fill="var(--color-billed)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          )}
        </Section>
      </Box>

      {/* 4 · What needs someone today. */}
      <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary", mb: 1 }}>
        Needs attention
      </Typography>
      <Box
        sx={{
          display: "grid", gap: 1.25, mb: 2,
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
        }}
      >
        {attentionCard("overdue", "Overdue", "information-5", TRIO.rose, "view=proformas&focus=OVERDUE", "Nothing is past due.", (item) => (
          <Line title={item.proformaNumber ?? "—"} sub={subOf(item)} amount={item.outstandingAmount}
            note={`${item.overdueDays} day${item.overdueDays === 1 ? "" : "s"} overdue`} noteTone="error.main" onClick={openItem(item)} />
        ))}
        {attentionCard("dueSoon", "Due in the next 14 days", "calendar", TRIO.amber, "view=proformas&focus=AWAITING", "Nothing falls due in the next two weeks.", (item) => (
          <Line title={item.proformaNumber ?? "—"} sub={subOf(item)} amount={item.outstandingAmount}
            note={item.dueDate ? `due ${formatDate(item.dueDate)}` : undefined} noteTone={TRIO.amber.c} onClick={openItem(item)} />
        ))}
        {attentionCard("invoiceDue", "Paid — tax invoice due", "receipt-square", TRIO.green, "view=proformas&focus=PAID", "Every paid proforma has its tax invoice.", (item) => (
          <Line title={item.proformaNumber ?? "—"} sub={subOf(item)} amount={item.totalAmount}
            note="raise invoice" noteTone={TRIO.green.c} onClick={openItem(item, true)} />
        ))}
        {attentionCard("drafts", "Drafts waiting to be issued", "pencil", TRIO.purple, "view=proformas&focus=DRAFT", "No proformas sitting in draft.", (item) => (
          <Line title={item.proformaNumber ?? "—"} sub={subOf(item)} amount={item.totalAmount}
            note={item.proformaDate ? `drafted ${formatDate(item.proformaDate)}` : undefined} onClick={openItem(item)} />
        ))}
        {attentionCard("tdsPending", "TDS not deposited", "bank", TRIO.slate, "view=proformas", "Every TDS deduction is deposited.", (item) => (
          <Line title={item.proformaNumber ?? "—"} sub={subOf(item)} amount={item.tdsAmount}
            note="certificate awaited" onClick={openItem(item, true)} />
        ))}
      </Box>

      {/* 5 · The latest money in   ·   who owes the most */}
      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
        <Section title="Recent payments" icon="wallet" trio={TRIO.green}>
          {isLoading ? <ListSkeleton /> : !data?.recentPayments.length ? <AllClear text="No payments recorded yet." /> : (
            <Stack spacing={0.75}>
              {data.recentPayments.map((p) => (
                <Line
                  key={p.id}
                  title={`${p.projectName ?? p.projectNumber ?? "—"}`}
                  sub={`${p.proformaNumber ?? "—"} · ${p.stageName}${p.component ? ` · ${PAYMENT_COMPONENT_LABEL[p.component as keyof typeof PAYMENT_COMPONENT_LABEL] ?? p.component}` : ""}`}
                  amount={p.amount}
                  note={`${formatDate(p.paymentDate)} · ${p.method}`}
                  noteTone="success.main"
                  onClick={go(`/project/${p.leadId}?tab=billing`)}
                />
              ))}
            </Stack>
          )}
        </Section>

        <Section title="Top outstanding projects" icon="chart-line-down" trio={TRIO.rose}
          action={{ label: "All projects", onClick: go(PROFORMA_TRACKER_PATH) }}>
          {isLoading ? <ListSkeleton /> : !data?.topOutstanding.length ? <AllClear text="No project owes anything right now." /> : (
            <Stack spacing={0.75}>
              {data.topOutstanding.map((p) => {
                const collected = p.issuedAmount > 0 ? Math.min(100, Math.round((p.receivedAmount / p.issuedAmount) * 100)) : 0;
                return (
                  <Box
                    key={p.leadId}
                    onClick={go(`/project/${p.leadId}?tab=billing`)}
                    sx={{
                      px: 1, py: 0.8, borderRadius: "10px", cursor: "pointer",
                      border: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>{p.projectName ?? p.projectNumber ?? "—"}</Typography>
                        <Typography noWrap sx={{ fontSize: 11.5, color: "text.secondary" }}>
                          {[p.projectNumber, p.clientName].filter(Boolean).join(" · ")}
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "error.main" }}>{formatCurrencyDecimal(p.outstandingAmount)}</Typography>
                        {p.overdueAmount > 0 && (
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "error.main" }}>{formatCurrencyDecimal(p.overdueAmount)} overdue</Typography>
                        )}
                      </Stack>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
                      <Box sx={{ flex: 1 }}><Progress value={collected} aria-label={`${collected}% of billed value collected`} /></Box>
                      <Typography sx={{ fontSize: 11, color: "text.secondary", flexShrink: 0 }}>{collected}% collected</Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Section>
      </Box>
    </Box>
  );
};

export default BillingDashboard;
