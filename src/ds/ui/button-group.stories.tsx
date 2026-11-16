import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ChevronDown, Download, FileSpreadsheet, Printer } from 'lucide-react'
import { Button } from './button'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from './button-group'

/** Related actions joined into one control — export formats, a split button, a stepper. */
const meta = {
  title: 'Components/ButtonGroup',
  component: ButtonGroup,
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Export actions side by side. */
export const Export: Story = {
  render: () => (
    <ButtonGroup aria-label="Export">
      <Button variant="outline">
        <FileSpreadsheet data-icon="inline-start" aria-hidden /> Excel
      </Button>
      <Button variant="outline">
        <Download data-icon="inline-start" aria-hidden /> PDF
      </Button>
      <Button variant="outline" size="icon" aria-label="Print">
        <Printer aria-hidden />
      </Button>
    </ButtonGroup>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Export' })).toBeInTheDocument()
  },
}

/** Split button: main action plus a menu of related ones. */
export const Split: Story = {
  render: () => (
    <ButtonGroup>
      <Button>Run payroll</Button>
      <ButtonGroupSeparator />
      <Button size="icon" aria-label="More payroll actions">
        <ChevronDown aria-hidden />
      </Button>
    </ButtonGroup>
  ),
}

/** With a text segment. */
export const WithText: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>Rows</ButtonGroupText>
      <Button variant="outline">25</Button>
      <Button variant="outline">50</Button>
    </ButtonGroup>
  ),
}
