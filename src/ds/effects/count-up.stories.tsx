import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { CountUp } from './count-up'

/**
 * For moments only: a KPI counter landing on a dashboard tile, a total on a celebration. Never in
 * tables, forms, wizards or approval flows, where a number must be readable the instant it renders.
 * Assistive tech reads the final value once; the counting digits are hidden from it.
 */
const meta = {
  title: 'Effects/Count Up',
  component: CountUp,
  args: { value: 482500 },
  render: (args) => (
    <span className="text-3xl font-semibold">
      <CountUp {...args} />
    </span>
  ),
} satisfies Meta<typeof CountUp>

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

/** Indian digit grouping by default. */
export const Default: Story = {
  args: { duration: 2000 },
  play: async ({ canvas, canvasElement }) => {
    // The final value is there for assistive tech from the first render, not after the count.
    await expect(canvas.getByText('4,82,500', { ignore: '[aria-hidden="true"]' })).toBeInTheDocument()
    const counting = canvasElement.querySelector('[data-slot="count-up"] > [aria-hidden="true"]')
    await expect(counting).not.toHaveTextContent('4,82,500')
    await waitFor(() => expect(counting).toHaveTextContent('4,82,500'), { timeout: 4000 })

    // Copying the number gives it once: the screen-reader copy is unselectable.
    const selection = window.getSelection()!
    const range = document.createRange()
    range.selectNodeContents(canvasElement.querySelector('[data-slot="count-up"]')!)
    selection.removeAllRanges()
    selection.addRange(range)
    await expect(selection.toString()).toBe('4,82,500')
    selection.removeAllRanges()
  },
}

/** Fixed decimals, e.g. a conversion rate. */
export const Decimals: Story = {
  args: { value: 37.5, decimals: 1 },
  render: (args) => (
    <span className="text-3xl font-semibold">
      <CountUp {...args} />%
    </span>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('37.5', { ignore: '[aria-hidden="true"]' })).toBeInTheDocument()
    const counting = canvasElement.querySelector('[data-slot="count-up"] > [aria-hidden="true"]')
    await waitFor(() => expect(counting).toHaveTextContent('37.5'), { timeout: 3000 })
  },
}

/** Under reduced motion the number is there at once; a minute-long count would still be at 0 otherwise. */
export const ReducedMotion: Story = {
  args: { duration: 60_000 },
  beforeEach: reduceMotion,
  play: async ({ canvasElement }) => {
    const counting = canvasElement.querySelector('[data-slot="count-up"] > [aria-hidden="true"]')
    await expect(counting).toHaveTextContent('4,82,500')
  },
}
