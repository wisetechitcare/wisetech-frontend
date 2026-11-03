import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

/**
 * The one surface for grouped content — dashboard widgets, record sections, list tiles. Replaces the
 * live kit's `GlassCard`, `GlassSurface`, `DetailCard` frame and Bootstrap `.card`. The work canvas is
 * always opaque; Glass applies to chrome only (toolbar: Surface).
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
