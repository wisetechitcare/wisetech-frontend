import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { GradientText, type GradientTone } from './gradient-text'

/**
 * For moments only: text in a module-hue gradient with a soft light shimmer — the sign-in headline's key words
 * and the sign-in pages' headings. `display` ink is vivid (large text only); `text` ink uses the hues' readable
 * tokens (any size). Two shimmer passes, then still; none under reduced motion. Never on buttons.
 */
const meta = {
  title: 'Effects/Gradient Text',
  component: GradientText,
  args: { tone: 'brand', ink: 'display', shimmer: 'twice', children: 'Fast, Efficient & Productive' },
  render: (args) => (
    <p className="font-heading text-4xl font-bold tracking-tight">
      <GradientText {...args} />
    </p>
  ),
} satisfies Meta<typeof GradientText>

export default meta
type Story = StoryObj<typeof meta>

const TONES: GradientTone[] = ['brand', 'blue', 'green', 'purple', 'rose', 'amber', 'indigo', 'cyan', 'slate']

/** Display ink, brand gradient (blue → indigo → purple). */
export const Default: Story = {}

/** Every tone: the module hues and `brand`, in display ink. */
export const Tones: Story = {
  render: (args) => (
    <div className="grid gap-2 font-heading text-3xl font-bold">
      {TONES.map((tone) => (
        <GradientText key={tone} {...args} tone={tone}>
          {tone[0].toUpperCase() + tone.slice(1)}
        </GradientText>
      ))}
    </div>
  ),
}

/** Text ink at heading size — what the sign-in pages' UPPERCASE heading uses. */
export const TextInk: Story = {
  args: { ink: 'text', children: 'Sign In' },
  render: (args) => (
    <h2 className="heading-case font-heading text-base font-medium">
      <GradientText {...args} />
    </h2>
  ),
}

/** Dark: the gradients follow the theme tokens. */
export const Dark: Story = {
  render: (args) => (
    <div className="dark grid gap-3 bg-background p-6 font-heading text-foreground">
      <span className="text-4xl font-bold"><GradientText {...args} /></span>
      <span className="heading-case text-base font-medium"><GradientText {...args} ink="text">Forgot Password</GradientText></span>
    </div>
  ),
}

/** Two shimmer passes (under 5s — WCAG 2.2.2), then still; the letters stay real text. */
export const ShimmerTwiceThenStill: Story = {
  tags: ['!autodocs'], // a test, not a demo
  play: async ({ canvasElement }) => {
    const text = canvasElement.querySelector<HTMLElement>('[data-slot="gradient-text"]')!
    await expect(text).toHaveTextContent('Fast, Efficient & Productive')
    await expect(text).toHaveAttribute('data-shimmer', 'twice')
    const css = getComputedStyle(text)
    await expect(css.animationName).toBe('text-shimmer')
    await expect(css.animationIterationCount).toBe('2')
    await expect(2 * parseFloat(css.animationDuration)).toBeLessThan(5)
    await expect(css.backgroundClip).toBe('text, text')
  },
}

/** `shimmer="off"`: the gradient, still. */
export const Still: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: { shimmer: 'off' },
  play: async ({ canvasElement }) => {
    const text = canvasElement.querySelector<HTMLElement>('[data-slot="gradient-text"]')!
    await expect(text).not.toHaveAttribute('data-shimmer')
    await expect(getComputedStyle(text).animationName).toBe('none')
  },
}
