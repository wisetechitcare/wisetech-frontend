import type { Meta, StoryObj } from '@storybook/react-vite'
import { Calendar, Check, Loader2 } from 'lucide-react'
import { expect } from 'storybook/test'

/** Every Lucide icon gets one default rule (`svg.lucide` in `src/ds/styles/components.css`): stroke 1.75, middle-aligned, never shrinks. Utilities still win. */
const meta = {
  title: 'Foundations/Icons',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The global defaults, with no classes on the icon. lucide-react itself marks it aria-hidden. */
export const Defaults: Story = {
  render: () => <Calendar data-testid="i" />,
  play: async ({ canvas }) => {
    const icon = await canvas.findByTestId('i')
    const style = getComputedStyle(icon)
    await expect(style.strokeWidth).toBe('1.75px')
    await expect(style.verticalAlign).toBe('middle')
    await expect(style.flexShrink).toBe('0')
    await expect(icon).toHaveAttribute('aria-hidden', 'true')
  },
}

/** Tailwind utilities beat the base-layer default. */
export const UtilityWins: Story = {
  render: () => <Calendar data-testid="i" className="size-5 stroke-2" />,
  play: async ({ canvas }) => {
    const style = getComputedStyle(await canvas.findByTestId('i'))
    await expect(style.width).toBe('20px')
    await expect(style.strokeWidth).toBe('2px')
  },
}

/** An explicit `strokeWidth` prop must beat the global default, which only fills in Lucide's untouched `stroke-width="2"`. */
export const ExplicitStrokeWins: Story = {
  render: () => (
    <>
      <Check data-testid="default" />
      <Check data-testid="explicit" strokeWidth={3} />
    </>
  ),
  play: async ({ canvas }) => {
    await expect(getComputedStyle(await canvas.findByTestId('default')).strokeWidth).toBe('1.75px')
    await expect(getComputedStyle(await canvas.findByTestId('explicit')).strokeWidth).toBe('3px')
  },
}

/**
 * Spinner. `ci-spin` is not a global class today: it is defined in an inline <style> inside AuditSection.tsx, so it
 * only exists while that section is mounted. The story supplies the same rule locally so the transform-origin
 * check is meaningful; moving `ci-spin` into a real stylesheet is a follow-up (reported in the task notes).
 */
export const Spinner: Story = {
  render: () => (
    <>
      <style>{'@keyframes ciSpin { to { transform: rotate(360deg); } } .ci-spin { display: inline-block; animation: ciSpin .8s linear infinite; }'}</style>
      <Loader2 data-testid="i" className="ci-spin size-4" />
    </>
  ),
  play: async ({ canvas }) => {
    const style = getComputedStyle(await canvas.findByTestId('i'))
    await expect(style.animationName).not.toBe('none')
    await expect(style.transformOrigin).toBe('8px 8px')
  },
}

/** In a squeezed flex row next to a very long label, the icon keeps its size. */
export const TightRow: Story = {
  render: () => (
    <div className="flex w-[120px] items-center gap-1">
      <Calendar data-testid="i" className="size-5" />
      <span>{'long label '.repeat(200)}</span>
    </div>
  ),
  play: async ({ canvas }) => {
    const icon = await canvas.findByTestId('i')
    await expect(getComputedStyle(icon).width).toBe('20px')
    await expect(icon.getBoundingClientRect().width).toBe(20)
  },
}

/** Colour comes from the surrounding text (currentColor), nothing to set on the icon. */
export const ColourFollowsText: Story = {
  render: () => (
    <div data-testid="p" className="text-danger">
      <Calendar data-testid="i" />
    </div>
  ),
  play: async ({ canvas }) => {
    const icon = await canvas.findByTestId('i')
    const parent = await canvas.findByTestId('p')
    await expect(getComputedStyle(icon).color).toBe(getComputedStyle(parent).color)
  },
}
