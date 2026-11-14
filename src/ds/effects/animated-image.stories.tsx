import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Button } from '@/ds/ui/button'
import { AnimatedImage } from './animated-image'

/** The sign-in illustration (public/media/login): a 27 KB still, the 3.6 MB GIF, its 4.47s loop and its crop. */
const STILL = '/media/login/wtgif-still.webp'
const GIF = '/media/login/WTgif.gif'
const LOOP_MS = 4470
const CROP = { width: 800, height: 800, x: 71, y: 186, w: 658, h: 517 }

/** Plays until "Settle" is pressed — as the sign-in page settles it when the headline lands or the form is focused. */
function Demo(props: Omit<React.ComponentProps<typeof AnimatedImage>, 'playing'>) {
  const [playing, setPlaying] = React.useState(true)
  return (
    <div className="grid w-[420px] justify-items-center gap-4">
      <AnimatedImage {...props} playing={playing} />
      <Button variant="outline" onClick={() => setPlaying(false)} disabled={!playing}>
        Settle
      </Button>
    </div>
  )
}

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

// The docs page renders every story in one window, so the Reduced Motion story's matchMedia patch would
// freeze the others — tests stay off it (`!autodocs`).
const meta = {
  title: 'Effects/Animated Image',
  component: AnimatedImage,
  parameters: { layout: 'centered' },
  args: { still: STILL, animated: GIF, loopMs: LOOP_MS, crop: CROP, playing: true },
  render: ({ playing: _playing, ...args }) => <Demo {...args} />,
} satisfies Meta<typeof AnimatedImage>

export default meta
type Story = StoryObj<typeof meta>

const image = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-slot="animated-image"]')!
const src = (root: HTMLElement) => image(root).querySelector('img')?.getAttribute('src') ?? image(root).getAttribute('src')

/**
 * The still paints first; the animation takes over once loaded; "Settle" lets the loop in progress finish and it
 * rests on the still for good — within one loop (4.47s).
 */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(image(canvasElement)).toHaveAttribute('data-moving'), { timeout: 5000 })
    await expect(src(canvasElement)).toBe(GIF)
    await userEvent.click(canvas.getByRole('button', { name: 'Settle' }))
    await waitFor(() => expect(image(canvasElement)).not.toHaveAttribute('data-moving'), { timeout: LOOP_MS + 1500 })
    await expect(src(canvasElement)).toBe(STILL)
  },
}

/** Without `animated` (e.g. on phones, where the sign-in page never downloads it) it is just the still. */
export const StillOnly: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: { animated: undefined },
  play: async ({ canvasElement }) => {
    await new Promise((r) => setTimeout(r, 800))
    await expect(image(canvasElement)).not.toHaveAttribute('data-moving')
    await expect(src(canvasElement)).toBe(STILL)
  },
}

/** Reduced motion: never moves — and never downloads the animation. */
export const ReducedMotion: Story = {
  tags: ['!autodocs'], // patches matchMedia — must not share the docs page
  beforeEach: reduceMotion,
  play: async ({ canvasElement }) => {
    await new Promise((r) => setTimeout(r, 1200))
    await expect(image(canvasElement)).not.toHaveAttribute('data-moving')
    await expect(src(canvasElement)).toBe(STILL)
    await expect(image(canvasElement)).toHaveAttribute('aria-hidden', 'true')
  },
}

/** The crop shows only the drawing: the box takes the visible area's proportions (658 × 517), not the 800px frame's. */
export const Crop: Story = {
  tags: ['!autodocs'], // a test, not a demo
  play: async ({ canvasElement }) => {
    const box = image(canvasElement).getBoundingClientRect()
    await expect(Math.abs(box.width / box.height - CROP.w / CROP.h)).toBeLessThan(0.02)
  },
}
