import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Briefcase, CalendarDays, Clock } from 'lucide-react'
import { Badge } from './badge'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { IconBox } from '@/ds/patterns/icon-box'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardLink, CardTitle } from './card'

/**
 * THE one surface. Every card-shaped thing in the app renders this — stat tiles, record and navigation
 * tiles, selectable options, record sections, the table frame — so radius, ring, hover, focus, selected
 * and disabled look the same everywhere. Patterns (Stat Card, Entity Card, Choice Cards…) are content
 * layouts on it, not new cards. Replaces the live `GlassCard`, `GlassSurface`, `DetailCard` frame, `NavCard`
 * and Bootstrap `.card`. (Hover Preview is a popover, not a card.)
 */
const meta = {
  title: 'Components/Card',
  component: Card,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

/** Header with an action, content and a footer. */
export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Leave balance</h2>
        </CardTitle>
        <CardDescription>Leave year April 2026 – March 2027</CardDescription>
        <CardAction>
          <Badge variant="success" dot>On track</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Annual</dt>
            <dd className="tabular text-xl font-semibold">12</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sick</dt>
            <dd className="tabular text-xl font-semibold">6.5</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Comp-off</dt>
            <dd className="tabular text-xl font-semibold">1</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Apply leave</Button>
        <Button size="sm" variant="ghost">View history</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Leave balance' })).toBeInTheDocument()
  },
}

/** Small: tighter spacing for dense grids. */
export const Small: Story = {
  render: () => (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Probation review due</h2>
        </CardTitle>
        <CardDescription>Ishaan Verma · 12 November</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button size="sm" variant="outline">Start review</Button>
      </CardFooter>
    </Card>
  ),
}

/**
 * The benchmark (Stat Card's design) — every card's default look: tone glow, accent bar on hover, spring lift,
 * icon pop and wiggle. Decoration on every tile, clickable or not. Hover one to see it.
 */
export const Tile: Story = {
  decorators: [(Story) => <div className="w-[min(1000px,calc(100vw-2rem))]"><Story /></div>],
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(['brand', 'green', 'purple'] as const).map((tone, i) => (
        <Card key={tone} variant="tile" tone={tone}>
          <CardHeader>
            <CardTitle><h2>{['Leave balance', 'Attendance', 'Recruitment'][i]}</h2></CardTitle>
            <CardDescription>{['12 days available', '212 present today', '9 open roles'][i]}</CardDescription>
            <CardAction>
              <IconBox tone={tone} size="lg" icon={[<CalendarDays key="c" />, <Clock key="k" />, <Briefcase key="b" />][i]} />
            </CardAction>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const tiles = canvasElement.querySelectorAll('[data-slot="card"][data-variant="tile"]')
    await expect(tiles).toHaveLength(3)
    await expect(tiles[0].querySelector('[data-slot="card-glow"]')).toHaveAttribute('aria-hidden', 'true')
  },
}

/** Tile states: interactive (whole card is one link), selected (a checked control inside), disabled. */
export const TileStates: Story = {
  decorators: [(Story) => <div className="w-[min(1000px,calc(100vw-2rem))]"><Story /></div>],
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card variant="tile" interactive>
        <CardHeader>
          <CardTitle><h2><CardLink href="#interactive">Interactive</CardLink></h2></CardTitle>
          <CardDescription>The whole card is one link.</CardDescription>
        </CardHeader>
      </Card>
      <label htmlFor="card-selected" className="block">
        <Card variant="tile" interactive>
          <CardHeader>
            <CardTitle><h2>Selected</h2></CardTitle>
            <CardDescription>A checked control inside draws the ring.</CardDescription>
            <CardAction>
              <Checkbox id="card-selected" defaultChecked aria-label="Selected" />
            </CardAction>
          </CardHeader>
        </Card>
      </label>
      <Card variant="tile" interactive aria-disabled>
        <CardHeader>
          <CardTitle><h2>Disabled</h2></CardTitle>
          <CardDescription>Visible, not clickable; say why.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Interactive' })).toHaveAttribute('href', '#interactive')
    await expect(canvas.getByRole('checkbox', { name: 'Selected' })).toBeChecked()
  },
}

/** Panel: the same surface with no glow or motion — only for a frame around a table (Data Table). */
export const Panel: Story = {
  render: () => (
    <Card variant="panel">
      <CardHeader>
        <CardTitle><h2>Table frame</h2></CardTitle>
        <CardDescription>A frame around a table stays still: lifting it would fight scrolling and row hover.</CardDescription>
      </CardHeader>
    </Card>
  ),
}
