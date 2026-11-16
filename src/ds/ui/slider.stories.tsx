import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Slider } from './slider'

/**
 * Choose a value on a range where the exact number matters less than its position — weights,
 * thresholds. Replaces the live kit's `WeightSliderList` rows. Always show the number next to it.
 */
const meta = {
  title: 'Components/Slider',
  component: Slider,
  args: { 'aria-label': 'Technical skills weight', defaultValue: [40], max: 100, step: 5 },
  render: (args) => (
    <div className="grid max-w-sm gap-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Technical skills</span>
        <span className="tabular text-muted-foreground">weight</span>
      </div>
      <Slider {...args} />
    </div>
  ),
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

/** Arrow keys move by one step. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const thumb = canvas.getByRole('slider', { name: 'Technical skills weight' })
    await expect(thumb).toHaveAttribute('aria-valuenow', '40')
    thumb.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(thumb).toHaveAttribute('aria-valuenow', '45')
  },
}

/** A range (two thumbs) — e.g. a salary band. */
export const Range: Story = {
  args: { 'aria-label': undefined, defaultValue: [30, 70] },
  render: (args) => (
    <div className="grid max-w-sm gap-2">
      <span id="band" className="text-sm font-medium">Experience band (years)</span>
      <Slider aria-labelledby="band" {...args} max={20} step={1} defaultValue={[3, 8]} />
    </div>
  ),
}
