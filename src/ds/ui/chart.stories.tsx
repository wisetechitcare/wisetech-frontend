import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from './chart'

/**
 * Charts on Recharts with shadcn's container: the one chart engine for v2, replacing the live app's
 * four chart libraries (`Graphs`, ApexCharts, Nivo…).
 *
 * `config` names each series and gives it a colour. Use a theme variable — a `--chart-*` token so it
 * follows theme and tenant brand, or a semantic one (`var(--success)` …) where the series MEANS that
 * status and should match the badge beside it. The container republishes each as `--color-<key>`, and
 * marks reference those, never a hex: that is what keeps a chart right in dark mode.
 */
const meta = {
  title: 'Components/Chart',
  component: ChartContainer,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div className="w-[min(640px,calc(100vw-2rem))]"><Story /></div>],
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

// ─── HR series (chart tokens: colour carries no meaning, only separation) ─────────────────────

const HEADCOUNT = [
  { month: 'May', joined: 9, left: 3 },
  { month: 'Jun', joined: 12, left: 4 },
  { month: 'Jul', joined: 7, left: 6 },
  { month: 'Aug', joined: 14, left: 2 },
  { month: 'Sep', joined: 10, left: 5 },
  { month: 'Oct', joined: 11, left: 3 },
]

const PRESENCE = [
  { day: 'Mon', present: 231, remote: 12 },
  { day: 'Tue', present: 226, remote: 15 },
  { day: 'Wed', present: 219, remote: 18 },
  { day: 'Thu', present: 228, remote: 13 },
  { day: 'Fri', present: 212, remote: 22 },
]

const hiresConfig = {
  joined: { label: 'Joined', color: 'var(--chart-1)' },
  left: { label: 'Left', color: 'var(--chart-4)' },
} satisfies ChartConfig

const presenceConfig = {
  present: { label: 'In office', color: 'var(--chart-1)' },
  remote: { label: 'Remote', color: 'var(--chart-2)' },
} satisfies ChartConfig

// ─── Reimbursement series (semantic tokens: the colour IS the status) ─────────────────────────

const trendConfig = {
  approved: { label: 'Approved', color: 'var(--success)' },
  pending: { label: 'Awaiting', color: 'var(--warning)' },
  rejected: { label: 'Rejected', color: 'var(--destructive)' },
  paid: { label: 'Paid out', color: 'var(--info)' },
} satisfies ChartConfig

const trend = [
  { label: 'Jul', approved: 12000, pending: 2000, rejected: 0, paid: 9000 },
  { label: 'Aug', approved: 18000, pending: 4000, rejected: 1500, paid: 15000 },
  { label: 'Sep', approved: 9000, pending: 6500, rejected: 0, paid: 9000 },
  { label: 'Oct', approved: 21000, pending: 1200, rejected: 2400, paid: 12000 },
]

const statusConfig = {
  paid: { label: 'Paid', color: 'var(--success)' },
  awaitingPayment: { label: 'Awaiting Payment', color: 'var(--info)' },
  awaitingApproval: { label: 'Awaiting Approval', color: 'var(--warning)' },
  rejected: { label: 'Rejected', color: 'var(--destructive)' },
} satisfies ChartConfig

const status = [
  { key: 'paid', value: 42000 },
  { key: 'awaitingPayment', value: 18000 },
  { key: 'awaitingApproval', value: 9500 },
  { key: 'rejected', value: 3100 },
]

/** Trend over time: joiners vs leavers. */
export const AreaTrend: Story = {
  args: { config: hiresConfig, children: <></> },
  render: () => (
    <ChartContainer config={hiresConfig} className="h-64 w-full max-w-2xl" role="img" aria-label="Joiners and leavers, May to October">
      <AreaChart data={HEADCOUNT} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area dataKey="joined" type="monotone" fill="var(--color-joined)" fillOpacity={0.25} stroke="var(--color-joined)" />
        <Area dataKey="left" type="monotone" fill="var(--color-left)" fillOpacity={0.25} stroke="var(--color-left)" />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: /Joiners and leavers/ })).toBeInTheDocument()
  },
}

/** Comparison by category: stacked bars. */
export const StackedBars: Story = {
  args: { config: presenceConfig, children: <></> },
  render: () => (
    <ChartContainer config={presenceConfig} className="h-64 w-full max-w-2xl" role="img" aria-label="Attendance this week by day">
      <BarChart data={PRESENCE}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="present" stackId="a" fill="var(--color-present)" radius={[0, 0, 4, 4]} />
        <Bar dataKey="remote" stackId="a" fill="var(--color-remote)" radius={[4, 4, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  ),
}

/** Stacked bars with a line riding above: the reimbursement trend. Hover for the tooltip. */
export const StackedWithLine: Story = {
  args: { config: trendConfig, children: <></> },
  render: () => (
    <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
      <ComposedChart data={trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={48} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="approved" stackId="s" fill="var(--color-approved)" maxBarSize={38} />
        <Bar dataKey="pending" stackId="s" fill="var(--color-pending)" maxBarSize={38} />
        <Bar dataKey="rejected" stackId="s" fill="var(--color-rejected)" maxBarSize={38} radius={[5, 5, 0, 0]} />
        <Line dataKey="paid" stroke="var(--color-paid)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--color-paid)' }} />
      </ComposedChart>
    </ChartContainer>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Awaiting')).toBeInTheDocument()
  },
}

/** A donut: one Cell per slice, each filled from its config key. */
export const Donut: Story = {
  args: { config: statusConfig, children: <></> },
  render: () => (
    <ChartContainer config={statusConfig} className="mx-auto aspect-square h-56">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
        <Pie data={status} dataKey="value" nameKey="key" innerRadius={52} outerRadius={80} paddingAngle={3} cornerRadius={4}>
          {status.map((s) => <Cell key={s.key} fill={`var(--color-${s.key})`} stroke="none" />)}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="key" />} />
      </PieChart>
    </ChartContainer>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Awaiting Payment')).toBeInTheDocument()
  },
}

/** The minimum: one series, default tooltip. */
export const SimpleBars: Story = {
  args: { config: { spend: { label: 'Spend', color: 'var(--primary)' } }, children: <></> },
  render: (args) => (
    <ChartContainer config={args.config} className="aspect-auto h-48 w-full">
      <BarChart data={trend.map((t) => ({ label: t.label, spend: t.approved }))}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
}
