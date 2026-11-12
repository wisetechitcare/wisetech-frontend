import type { Meta, StoryObj } from '@storybook/react-vite'
import { Separator } from './separator'

/** A hairline between groups. Prefer spacing; use a separator only where groups would otherwise merge. */
const meta = {
  title: 'Components/Separator',
  component: Separator,
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

/** Horizontal between sections, vertical between inline items. */
export const Default: Story = {
  render: () => (
    <div className="max-w-sm text-sm">
      <p className="font-medium">Meera Joshi</p>
      <p className="text-muted-foreground">Senior MEP Engineer</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-muted-foreground">
        <span>Mumbai</span>
        <Separator orientation="vertical" />
        <span>Engineering</span>
        <Separator orientation="vertical" />
        <span>Since 2021</span>
      </div>
    </div>
  ),
}
