import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { Typewriter } from './typewriter'

/**
 * For moments only: the sign-in headline typing itself out once. Never in tables, forms, wizards or
 * approval flows. Assistive tech reads the whole sentence once; under reduced motion it renders whole.
 */
const meta = {
  title: 'Effects/Typewriter',
  component: Typewriter,
  args: { text: 'Fast, Efficient & Productive', speed: 20, delay: 50 },
  // The original Login headline's type, desktop size.
  render: (args) => (
    <h1 className="font-heading text-[clamp(30px,3.2vw,44px)] leading-[1.12] font-bold tracking-[-0.025em] text-foreground">
      <Typewriter {...args} />
    </h1>
  ),
} satisfies Meta<typeof Typewriter>

export default meta
type Story = StoryObj<typeof meta>

/** Makes `(prefers-reduced-motion: reduce)` match for one story; returns the restore. */
function reduceMotion() {
  const real = window.matchMedia
  window.matchMedia = (query) =>
    query === '(prefers-reduced-motion: reduce)'
      ? ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
      : real.call(window, query)
  return () => { window.matchMedia = real }
}

const typed = (root: HTMLElement) =>
  root.querySelector('[data-slot="typewriter"] > [aria-hidden="true"].absolute')!.textContent

/** Types the sentence out; the heading's accessible name is the whole sentence from the first frame. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { name: 'Fast, Efficient & Productive' })).toBeInTheDocument()
    await waitFor(() => expect(typed(canvasElement)).toBe('Fast, Efficient & Productive'), { timeout: 3000 })
  },
}

/** Typing never reflows: the box is the finished sentence's size from the start. */
export const NoReflow: Story = {
  args: { delay: 400 },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector<HTMLElement>('[data-slot="typewriter"]')!
    const before = box.getBoundingClientRect()
    await waitFor(() => expect(typed(canvasElement)).toBe('Fast, Efficient & Productive'), { timeout: 3000 })
    const after = box.getBoundingClientRect()
    await expect(after.width).toBe(before.width)
    await expect(after.height).toBe(before.height)
  },
}

/** The original caret, exactly: size in em, gradient, glow, and the hard 1s on/off blink. */
export const OriginalCaret: Story = {
  play: async ({ canvasElement }) => {
    const caret = canvasElement.querySelector<HTMLElement>('[data-done] [data-slot="typewriter-caret"], .absolute [data-slot="typewriter-caret"]')!
    const css = getComputedStyle(caret)
    const em = parseFloat(getComputedStyle(caret.parentElement!).fontSize)
    const { width, height } = caret.getBoundingClientRect()
    await expect(width / em).toBeCloseTo(0.09, 2)
    await expect(height / em).toBeCloseTo(0.92, 2)
    await expect(parseFloat(css.marginLeft)).toBe(4) // 0.25rem
    await expect(css.backgroundImage).toContain('linear-gradient')
    await expect(css.backgroundImage).toContain('rgb(66, 133, 244)') // #4285f4 at the top
    await expect(css.boxShadow).toContain('rgba(155, 114, 203, 0.55)')
    await expect(css.animationName).toBe('typewriter-caret')
    await expect(css.animationDuration).toBe('1s')
    // step-end, which browsers serialise as its equivalent steps(1).
    await expect(['step-end', 'steps(1)', 'steps(1, end)']).toContain(css.animationTimingFunction)
    await expect(css.animationIterationCount).toBe('infinite')
  },
}

/** Phones: the original mobile size, centred, 250ms delay. */
export const Mobile: Story = {
  args: { delay: 250 },
  globals: { viewport: { value: 'mobile1' } },
  render: (args) => (
    <h1 className="text-center font-heading text-[clamp(22px,7vw,30px)] leading-[1.12] font-bold tracking-[-0.025em] text-foreground">
      <Typewriter {...args} />
    </h1>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(typed(canvasElement)).toBe('Fast, Efficient & Productive'), { timeout: 3000 })
  },
}

/** Reduced motion: the whole sentence at once, no caret. */
export const ReducedMotion: Story = {
  beforeEach: () => reduceMotion(),
  play: async ({ canvasElement }) => {
    await expect(typed(canvasElement)).toBe('Fast, Efficient & Productive')
    await expect(canvasElement.querySelector('[data-slot="typewriter-caret"]')).toBeNull()
  },
}
