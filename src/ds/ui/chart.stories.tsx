import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from './chart'

/**
 * shadcn's Recharts wrapper. `config` names each series and gives it a colour — use theme variables
 * (`var(--success)` …) so a series means the same thing as the matching badge and is right in dark
 * mode. The container publishes each as `--color-<key>`; marks reference those, never a hex.
 */
const meta = {
  title: 'Components/Chart',
  component: ChartContainer,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div className="w-[min(640px,calc(100vw-2rem))]"><Story /></div>],
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

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

const statusConfig = {
  paid: { label: 'Paid', color: 'var(--success)' },
  awaitingPayment: { label: 'Awaiting payment', color: 'var(--info)' },
  awaitingApproval: { label: 'Awaiting approval', color: 'var(--warning)' },
  rejected: { label: 'Rejected', color: 'var(--destructive)' },
} satisfies ChartConfig

const status = [
  { key: 'paid', value: 42000 },
  { key: 'awaitingPayment', value: 18000 },
  { key: 'awaitingApproval', value: 9500 },
  { key: 'rejected', value: 3100 },
]

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
    await expect(canvas.getByText('Awaiting payment')).toBeInTheDocument()
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
