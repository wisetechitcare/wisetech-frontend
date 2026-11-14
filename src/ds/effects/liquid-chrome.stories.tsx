import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { LiquidChrome } from './liquid-chrome'

/**
 * For moments only: the sign-in background — milky liquid chrome in the brand tint (React Bits, raw WebGL2, no
 * dependency). Ease it to a stop with `settled`; under reduced motion it is a still frame. Behind content, put
 * a veil of the page colour over it (Auth Layout uses bg-background/85).
 */
const meta = {
  title: 'Effects/Liquid Chrome',
  component: LiquidChrome,
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div className="relative h-[480px] w-full">
      <LiquidChrome {...args} />
    </div>
  ),
} satisfies Meta<typeof LiquidChrome>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Counts what THIS canvas draws from now on — its own WebGL context's draw calls (getContext returns the same
 * context the effect created). Counting window.requestAnimationFrame would also count Storybook's own frames.
 */
function countDraws(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-slot="liquid-chrome"] canvas')!
  const gl = canvas.getContext('webgl2')!
  const real = gl.drawArrays.bind(gl)
  const counter = { n: 0, restore: () => { gl.drawArrays = real } }
  gl.drawArrays = (...args: Parameters<WebGL2RenderingContext['drawArrays']>) => {
    counter.n++
    return real(...args)
  }
  return counter
}

/** Light, in the brand tint, moving. */
export const Default: Story = {}

/** Under the Auth Layout veil — how it reads behind the sign-in page. */
export const UnderVeil: Story = {
  render: (args) => (
    <div className="relative h-[480px] w-full">
      <LiquidChrome {...args} />
      <div className="absolute inset-0 bg-background/85" />
    </div>
  ),
}

/** Dark: follows the kit theme. */
export const Dark: Story = {
  render: (args) => (
    <div className="dark relative h-[480px] w-full bg-background">
      <LiquidChrome {...args} />
    </div>
  ),
}

/** Moving: it keeps drawing. */
export const Moves: Story = {
  tags: ['!autodocs'], // a test, not a demo — it instruments the canvas
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="liquid-chrome"] canvas')).not.toBeNull()
    const frames = countDraws(canvasElement)
    await new Promise((r) => setTimeout(r, 600))
    frames.restore()
    await expect(frames.n).toBeGreaterThan(5)
  },
}

/** Settled: the motion eases to a stop and then nothing more is drawn. */
export const Settles: Story = {
  tags: ['!autodocs'], // a test, not a demo — it instruments the canvas
  args: { settled: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="liquid-chrome"]')).toHaveAttribute('data-settled')
    // Ease-out (1.2s) plus the intro fade (~1.8s), then quiet.
    await new Promise((r) => setTimeout(r, 2600))
    const frames = countDraws(canvasElement)
    await new Promise((r) => setTimeout(r, 700))
    frames.restore()
    await expect(frames.n).toBe(0)
  },
}

/** Makes `(prefers-reduced-motion: reduce)` match for one story; returns the restore. */
function reduceMotion() {
  const real = window.matchMedia
  window.matchMedia = (query) =>
    query === '(prefers-reduced-motion: reduce)'
      ? ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
      : real.call(window, query)
  return () => { window.matchMedia = real }
}

/** Reduced motion: a still frame — nothing drawn after the first paint. */
export const ReducedMotion: Story = {
  tags: ['!autodocs'], // a test, not a demo — and its matchMedia patch must not reach the docs page
  beforeEach: () => reduceMotion(),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="liquid-chrome"] canvas')).not.toBeNull())
    await new Promise((r) => setTimeout(r, 400))
    const frames = countDraws(canvasElement)
    await new Promise((r) => setTimeout(r, 700))
    frames.restore()
    await expect(frames.n).toBe(0)
  },
}
