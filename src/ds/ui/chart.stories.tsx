import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './chart'

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

/**
 * Charts on Recharts with shadcn's container: colours come from the `--chart-*` tokens (so they follow
 * theme and tenant brand), with a themed tooltip and legend. The one chart engine for v2 — replaces the
 * live app's four chart libraries (`Graphs`, ApexCharts, Nivo…).
 */
const meta = {
  title: 'Components/Chart',
  component: ChartContainer,
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

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
