import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Download, Plus } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { PageHeader } from './page-header'

/** The one page header every template uses. The title is the page's only `h1`. */
const meta = {
  title: 'Patterns/Page Header',
  component: PageHeader,
  args: {
    title: 'Employees',
    description: '248 people across 4 branches',
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

/** Title and description only. */
export const Basic: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument()
  },
}

/** With an eyebrow and page actions (one primary). */
export const WithActions: Story = {
  args: {
    eyebrow: 'People',
    actions: (
      <>
        <Button variant="outline">
          <Download aria-hidden /> Export
        </Button>
        <Button>
          <Plus aria-hidden /> Add employee
        </Button>
      </>
    ),
  },
}
