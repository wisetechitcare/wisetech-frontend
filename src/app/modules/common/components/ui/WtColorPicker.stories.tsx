import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { KIT_HEX_SWATCHES, KIT_SWATCHES, WtColorPicker } from './WtColorPicker'

/**
 * The app's colour control: a palette, a custom colour (the browser's picker) and a hex field.
 * Used by Gift / Leads / Calendar / Billing config, board backgrounds and the Company Showcase deck.
 */
const meta = {
  title: 'Components/Color Picker',
  component: WtColorPicker,
  args: { label: 'Colour', value: KIT_SWATCHES[0].value, onChange: fn() },
  // Controlled, so a click shows as selected in the canvas as well as in the Actions panel.
  render: function Render(args) {
    const [value, setValue] = useState(args.value)
    return <WtColorPicker {...args} value={value} onChange={(v) => (setValue(v), args.onChange(v))} />
  },
} satisfies Meta<typeof WtColorPicker>

export default meta
type Story = StoryObj<typeof meta>

/** Palette grid (the default): picking a swatch selects it and reports its value. */
export const Palette: Story = {
  play: async ({ args, canvas }) => {
    const swatch = canvas.getByRole('radio', { name: KIT_SWATCHES[1].label })
    await userEvent.click(swatch)
    await expect(swatch).toHaveAttribute('aria-checked', 'true')
    await expect(args.onChange).toHaveBeenCalledWith(KIT_SWATCHES[1].value)
  },
}

/** A hex can be typed key by key: the field keeps the half-typed text and commits each complete hex. */
export const HexField: Story = {
  args: { palette: KIT_HEX_SWATCHES, value: KIT_HEX_SWATCHES[0].value },
  play: async ({ args, canvas }) => {
    const hex = canvas.getByRole('textbox', { name: 'Hex' })
    await userEvent.clear(hex)
    await userEvent.type(hex, '#1b2a4e')
    await expect(hex).toHaveValue('#1b2a4e')
    await expect(args.onChange).toHaveBeenLastCalledWith('#1b2a4e')
    await expect(args.onChange).not.toHaveBeenCalledWith('#1b2a')
    // Leaving the field shows the committed colour, normalised.
    await userEvent.tab()
    await expect(hex).toHaveValue('#1B2A4E')
  },
}

/** Row: one compact line that opens the browser's picker, as in Gift Management → Configure. */
export const Row: Story = {
  args: { variant: 'row', palette: KIT_HEX_SWATCHES, value: KIT_HEX_SWATCHES[0].value },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(KIT_HEX_SWATCHES[0].hex.toUpperCase())).toBeVisible()
    await expect(canvas.getByLabelText('Colour — custom colour')).toBeInTheDocument()
  },
}

/** Disabled: no swatch, custom colour or hex can be changed. */
export const Disabled: Story = { args: { disabled: true } }
