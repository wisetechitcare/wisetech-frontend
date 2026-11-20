import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CircleCheck } from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Button } from "@/ds/ui/button";
import { DynamicIcon } from "@/ds/ui/dynamic-icon";
import { Skeleton } from "@/ds/ui/skeleton";
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
    <div className="mb-3 flex flex-row items-center gap-2.5">
      <IconBox icon={icon} trio={trio} size={32} fs="fs-5" />
      <p className="min-w-0 flex-1 text-[14.5px] font-bold">{title}</p>
      {action && (
        // A real button: it acts on this page rather than navigating, so `link` is the right
        // Button variant and the browser gets the correct element either way.
        <Button variant="link" size="sm" onClick={action.onClick}>
          {action.label} →
        </Button>
      )}
    </div>
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
  // A whole row that acts is a button, not a clickable div: it gets the tab stop, Enter and Space free.
  <button
    type="button"
    onClick={onClick}
    className="flex w-full cursor-pointer flex-row items-center gap-2 rounded-[10px] border border-border px-2 py-1.5 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-bold">{title}</p>
      <p className="truncate text-[11.5px] text-muted-foreground">{sub}</p>
    </div>
    <div className="flex shrink-0 flex-col items-end">
      <p className="text-[13px] font-bold">{formatCurrencyDecimal(amount)}</p>
      {note && (() => {
        // `success` / `danger` are kit status tokens (so they follow light, dark and tenant brand);
        // anything else is a literal colour, which is how a category hue still works. They used to be
        // MUI theme paths ("success.main"), which only resolved inside an `sx`.
        const colour = noteTone === "success" ? "var(--success)" : noteTone === "danger" ? "var(--destructive)" : noteTone;
        return (
          <p
            className={cn("text-[11px] font-bold", colour ? "text-(--note-tone)" : "text-muted-foreground")}
            style={colour ? ({ "--note-tone": colour } as React.CSSProperties) : undefined}
          >
            {note}
          </p>
        );
      })()}
    </div>
  </button>
);

const AllClear: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-row items-center gap-1.5 py-2.5">
    <CircleCheck aria-hidden className="text-success" />
    <p className="text-[12.5px] text-muted-foreground">{text}</p>
  </div>
);

const ListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-1.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[46px] rounded-xl" />)}</div>
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
          <div className="flex flex-col gap-1.5">{list.items.map((item) => <React.Fragment key={item.billId}>{render(item)}</React.Fragment>)}</div>
        )}
      </Section>
    );
  };

  const subOf = (item: DashboardItem) => `${item.projectName ?? item.projectNumber ?? "—"} · ${item.stageName}`;
  // Share of proformas per stage, by count (the stacked bar's widths). It is not a share of money.
  const pipelineTotal = (data?.pipeline ?? []).reduce((s, p) => s + p.count, 0);

  return (
    <div className="pb-8">
      <BillingPageHeader
        icon="chart-simple"
        title="Billing Dashboard"
        description={`Where the money is — raised, billed, collected and owed${data ? ` · as of ${formatDate(data.asOf)}` : ""}.`}
        trio={TRIO.purple}
      />

      {/* 1 · The money, in one line, in the order it moves. */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
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
      </div>

      {/* 2 · The pipeline   3 · The trend */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 lg:grid-cols-[1.15fr_1fr]">
        <Section
          title="Proforma pipeline"
          icon="abstract-26"
          trio={TRIO.cyan}
          action={{ label: "Proformas", onClick: go(tracker("view=proformas")) }}
        >
          {isLoading ? <ListSkeleton /> : (
            <>
              {/* The share of proformas at each stage, as one bar. Each segment's width and colour are
                  computed per stage, so both ride CSS variables. */}
              <div className="mb-3.5 flex h-2.5 overflow-hidden rounded-full bg-accent">
                {pipelineTotal > 0 && data?.pipeline.map((p) => p.count > 0 && (
                  <div
                    key={p.state}
                    title={`${PIPELINE[p.state].label}: ${p.count}`}
                    className="w-(--seg-w) bg-(--seg-bg)"
                    style={{ "--seg-w": `${(p.count / pipelineTotal) * 100}%`, "--seg-bg": PIPELINE[p.state].trio.c } as React.CSSProperties}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {data?.pipeline.map((p) => {
                  const meta = PIPELINE[p.state];
                  return (
                    // A stage tile navigates, so it is a button rather than a clickable div.
                    <button
                      key={p.state}
                      type="button"
                      onClick={go(tracker(`view=proformas&focus=${p.state}`))}
                      className="min-w-0 cursor-pointer rounded-xl border border-(--stage-bd) bg-(--stage-bg) p-2.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      style={{ "--stage-bg": meta.trio.bg, "--stage-bd": meta.trio.bd, "--stage-fg": meta.trio.c } as React.CSSProperties}
                    >
                      <span className="mb-1 flex flex-row items-center gap-1.5">
                        {/* The stage's icon name is data from PIPELINE, so DynamicIcon resolves it. */}
                        <DynamicIcon name={meta.icon} className="size-3.5" />
                        <span className="heading-case truncate text-[11px] font-bold tracking-[0.3px] text-(--stage-fg)">
                          {meta.label}
                        </span>
                      </span>
                      <span className="block text-[22px] leading-tight font-extrabold">{p.count}</span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">
                        {formatCurrencyDecimal(p.amount)} {meta.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Section>

        <Section title="Billed vs received · last 6 months" icon="chart-simple" trio={TRIO.blue}>
          {isLoading ? <Skeleton className="h-[210px] rounded-xl" /> : (
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
      </div>

      {/* 4 · What needs someone today. A structural heading, so `heading-case` carries the uppercase. */}
      <p className="heading-case mb-2 text-xs font-extrabold tracking-[0.6px] text-muted-foreground">
        Needs attention
      </p>
      <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {attentionCard("overdue", "Overdue", "information-5", TRIO.rose, "view=proformas&focus=OVERDUE", "Nothing is past due.", (item) => (
          <Line title={item.proformaNumber ?? "—"} sub={subOf(item)} amount={item.outstandingAmount}
            note={`${item.overdueDays} day${item.overdueDays === 1 ? "" : "s"} overdue`} noteTone="danger" onClick={openItem(item)} />
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
      </div>

      {/* 5 · The latest money in   ·   who owes the most */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <Section title="Recent payments" icon="wallet" trio={TRIO.green}>
          {isLoading ? <ListSkeleton /> : !data?.recentPayments.length ? <AllClear text="No payments recorded yet." /> : (
            <div className="flex flex-col gap-1.5">
              {data.recentPayments.map((p) => (
                <Line
                  key={p.id}
                  title={`${p.projectName ?? p.projectNumber ?? "—"}`}
                  sub={`${p.proformaNumber ?? "—"} · ${p.stageName}${p.component ? ` · ${PAYMENT_COMPONENT_LABEL[p.component as keyof typeof PAYMENT_COMPONENT_LABEL] ?? p.component}` : ""}`}
                  amount={p.amount}
                  note={`${formatDate(p.paymentDate)} · ${p.method}`}
                  noteTone="success"
                  onClick={go(`/project/${p.leadId}?tab=billing`)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Top outstanding projects" icon="chart-line-down" trio={TRIO.rose}
          action={{ label: "All projects", onClick: go(PROFORMA_TRACKER_PATH) }}>
          {isLoading ? <ListSkeleton /> : !data?.topOutstanding.length ? <AllClear text="No project owes anything right now." /> : (
            <div className="flex flex-col gap-1.5">
              {data.topOutstanding.map((p) => {
                const collected = p.issuedAmount > 0 ? Math.min(100, Math.round((p.receivedAmount / p.issuedAmount) * 100)) : 0;
                return (
                  // Navigates, so it is a button — the tab stop and Enter/Space come free.
                  <button
                    key={p.leadId}
                    type="button"
                    onClick={go(`/project/${p.leadId}?tab=billing`)}
                    className="w-full cursor-pointer rounded-[10px] border border-border px-2 py-1.5 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex flex-row items-center gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold">{p.projectName ?? p.projectNumber ?? "—"}</span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          {[p.projectNumber, p.clientName].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="text-[13px] font-bold text-destructive">{formatCurrencyDecimal(p.outstandingAmount)}</span>
                        {p.overdueAmount > 0 && (
                          <span className="text-[11px] font-bold text-destructive">{formatCurrencyDecimal(p.overdueAmount)} overdue</span>
                        )}
                      </span>
                    </span>
                    <span className="mt-1.5 flex flex-row items-center gap-2">
                      <span className="flex-1"><Progress value={collected} aria-label={`${collected}% of billed value collected`} /></span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{collected}% collected</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};

export default BillingDashboard;
