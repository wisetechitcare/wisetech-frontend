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
  render: (args) => (
    <h1 className="text-4xl font-bold tracking-tight">
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

/** Reduced motion: the whole sentence at once, no caret. */
export const ReducedMotion: Story = {
  beforeEach: () => reduceMotion(),
  play: async ({ canvasElement }) => {
    await expect(typed(canvasElement)).toBe('Fast, Efficient & Productive')
    await expect(canvasElement.querySelector('[data-slot="typewriter-caret"]')).toBeNull()
  },
}
