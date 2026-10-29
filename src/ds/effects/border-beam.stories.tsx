import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Avatar, AvatarFallback } from '@/ds/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/ds/ui/card'
import { BorderBeam } from './border-beam'

/**
 * For moments only: draws the eye to ONE insight card, such as a suggestion or a new highlight.
 * Never on tables, forms, wizards or approval flows, and never on two cards at once. Decorative:
 * hidden from assistive tech, and not drawn under reduced motion. The card must be `relative`.
 */
const meta = {
  title: 'Effects/Border Beam',
  component: BorderBeam,
  render: (args) => (
    <Card className="relative w-80">
      <CardHeader>
        <CardTitle>
          <h2>3 people near their leave cap</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">Unused leave over the carry-forward limit lapses.</CardContent>
      <BorderBeam {...args} />
    </Card>
  ),
} satisfies Meta<typeof BorderBeam>

export default meta
type Story = StoryObj<typeof meta>

/** Makes `(prefers-reduced-motion: reduce)` match for one story; returns the restore. */
function reduceMotion() {
  const real = window.matchMedia
  window.matchMedia = (query) =>
    query === '(prefers-reduced-motion: reduce)'
      ? ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
      : real.call(window, query)
  return () => {
    window.matchMedia = real
  }
}

/** Brand-coloured beam running round the card's border. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { name: '3 people near their leave cap' })).toBeInTheDocument()
    const beam = canvasElement.querySelector('[data-slot="border-beam"]')
    await expect(beam).toHaveAttribute('aria-hidden', 'true')
    await expect(beam?.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
    // Painted only in the 1px border ring: the fill is masked away, so card content stays clear.
    const ring = getComputedStyle(beam as Element)
    await expect(ring.borderTopWidth).toBe('1px')
    await expect(ring.maskComposite).toContain('intersect')
    // Pure CSS: the dot runs on a keyframe animation, not a per-frame JS loop.
    await expect(getComputedStyle(beam?.firstElementChild as Element).animationName).toBe('border-beam')
  },
}

/** shape="circle": the orbit round a disc of ~64px or more, e.g. the one person a screen is about. */
export const Circle: Story = {
  args: { shape: 'circle' },
  render: (args) => (
    <div className="relative size-20 rounded-full">
      <Avatar className="size-20">
        <AvatarFallback className="text-xl">AS</AvatarFallback>
      </Avatar>
      <BorderBeam {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const beam = canvasElement.querySelector('[data-slot="border-beam"]') as HTMLElement
    await expect(beam).toHaveAttribute('data-shape', 'circle')
    await expect(beam).toHaveAttribute('aria-hidden', 'true')
    await expect(getComputedStyle(beam).animationName).toBe('border-beam-orbit')
    // A circle: radius at least half the side (rounded-full computes to an "infinite" px value).
    await expect(parseFloat(getComputedStyle(beam).borderRadius)).toBeGreaterThanOrEqual(beam.getBoundingClientRect().width / 2)
  },
}

/** Under reduced motion the beam is not drawn; the card is unchanged. */
export const ReducedMotion: Story = {
  beforeEach: reduceMotion,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { name: '3 people near their leave cap' })).toBeInTheDocument()
    await expect(canvasElement.querySelector('[data-slot="border-beam"]')).toBeNull()
  },
}
