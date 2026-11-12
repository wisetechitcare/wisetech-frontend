import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Card, CardDescription, CardHeader, CardTitle } from '@/ds/ui/card'
import { AutoGrid } from './auto-grid'

const tiles = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <Card key={i} size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Tile {i + 1}</h2>
        </CardTitle>
        <CardDescription>Fills the row, then wraps.</CardDescription>
      </CardHeader>
    </Card>
  ))

/**
 * Tiles that fill wide screens and collapse to one column on phones — no breakpoints to write. Replaces the
 * live `AutoGrid`. Resize the canvas to see it reflow.
 */
const meta = {
  title: 'Patterns/Auto Grid',
  component: AutoGrid,
  args: { children: tiles(7) },
  decorators: [(Story) => <div className="w-[min(1400px,calc(100vw-2rem))]"><Story /></div>],
} satisfies Meta<typeof AutoGrid>

export default meta
type Story = StoryObj<typeof meta>

/** Tiles stop at `max`, so a short list does not stretch into full-width bars. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('heading')).toHaveLength(7)
  },
}

/** Two tiles stay tile-sized. */
export const FewItems: Story = { args: { children: tiles(2) } }

/** `stretch`: tiles absorb leftover width (dashboards). */
export const Stretch: Story = { args: { children: tiles(3), stretch: true } }
