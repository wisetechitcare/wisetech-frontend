import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Colours, Motion, RadiusShadow, TypeScale } from './Foundations'

/** Design tokens of Visual Language v2 — every value lives in `src/ds/styles/tokens.css`. */
const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Colour roles (the brand role follows each tenant's Appearance setting), status colours and category hues, in both themes. */
export const Colors: Story = { render: () => <Colours /> }

/** Inter on Tailwind's built-in type scale; numbers use tabular figures. */
export const Typography: Story = { render: () => <TypeScale /> }

/** The rounded-* scale with each step's real size, read from the browser; shadows are Tailwind's own. */
export const RadiusAndShadow: Story = {
  name: 'Radius & shadow',
  render: () => <RadiusShadow />,
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByText(/^\d+(\.\d+)?px$/)).toHaveLength(7)
  },
}

/** Easing by direction (enter / move, plus the button spring) and duration by size; hover a row to run its curve. */
export const MotionStory: Story = { name: 'Motion', render: () => <Motion /> }
