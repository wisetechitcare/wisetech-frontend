import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Button } from '@/ds/ui/button'
import { celebrate, clearCelebration, type CelebrateOptions } from './celebrate'

function CelebrateDemo(options: CelebrateOptions) {
  return <Button onClick={() => void celebrate(options)}>Celebrate</Button>
}

/**
 * For moments only: a real celebration, such as a birthday or a rank-1 reveal. Never as feedback
 * for routine work (saving a form, approving a request). One shared canvas, removed by
 * clearCelebration(); a no-op under reduced motion.
 */
const meta = {
  title: 'Effects/Celebrate',
  component: CelebrateDemo,
  beforeEach: () => clearCelebration,
} satisfies Meta<typeof CelebrateDemo>

export default meta
type Story = StoryObj<typeof meta>

const canvases = () => document.querySelectorAll('canvas[data-slot="celebrate"]')
const settle = () => new Promise((done) => setTimeout(done, 200))

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

/** js-confetti's default burst. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Celebrate' }))
    await waitFor(() => expect(canvases()).toHaveLength(1))
    // Decorative: the full-screen canvas stays out of the accessibility tree.
    await expect(canvases()[0]).toHaveAttribute('aria-hidden', 'true')
  },
}

/** Options pass straight through to js-confetti; a second burst reuses the same canvas. */
export const Emojis: Story = {
  args: { emojis: ['🎉', '🎂', '🎈'], emojiSize: 60, confettiNumber: 40 },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Celebrate' })
    await userEvent.click(button)
    await userEvent.click(button)
    await waitFor(() => expect(canvases()).toHaveLength(1))
    await settle()
    await expect(canvases()).toHaveLength(1)
  },
}

/** Two first calls at once, both still waiting on the js-confetti import, share one canvas. */
export const ConcurrentFirstCalls: Story = {
  play: async () => {
    void celebrate()
    void celebrate()
    await waitFor(() => expect(canvases()).toHaveLength(1))
    await settle()
    await expect(canvases()).toHaveLength(1)
  },
}

/** Under reduced motion a click draws nothing and adds no canvas. */
export const ReducedMotion: Story = {
  beforeEach: reduceMotion,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Celebrate' }))
    await settle()
    await expect(canvases()).toHaveLength(0)
  },
}
