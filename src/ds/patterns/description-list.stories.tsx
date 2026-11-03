import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Landmark, UserRound } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Card, CardContent, CardHeader } from '@/ds/ui/card'
import { DescriptionList } from './description-list'
import { SectionHeader } from './section-header'

/**
 * Read-only facts of a record as label / value pairs. Replaces the live `KeyValueList`, `KeyValueRow` and
 * `DetailGrid`; inside a Card with a SectionHeader it is the `DetailCard` look.
 */
const meta = {
  title: 'Patterns/Description List',
  component: DescriptionList,
  args: {
    rows: [
      { label: 'Date of birth', value: '1992.03.14' },
      { label: 'Gender', value: 'Female' },
      { label: 'Personal email', value: 'meera.j@example.com' },
      { label: 'Blood group', value: '' },
      { label: 'Address', value: '12 Lake View, Powai, Mumbai 400076', wide: true },
    ],
  },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof DescriptionList>

export default meta
type Story = StoryObj<typeof meta>

/** Two columns from tablet up; a missing value shows an em dash. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Date of birth').tagName).toBe('DT')
    await expect(canvas.getByText('—')).toBeInTheDocument()
  },
}

/** The record-section look (live `DetailCard`): Card + SectionHeader + list. */
export const InCard: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card tone="blue">
        <CardHeader>
          <SectionHeader icon={<UserRound />} tone="blue" title="Personal details" action={<Button size="sm" variant="ghost">Edit</Button>} />
        </CardHeader>
        <CardContent>
          <DescriptionList
            rows={[
              { label: 'Date of birth', value: '1992.03.14' },
              { label: 'Marital status', value: 'Married' },
              { label: 'Nationality', value: 'Indian' },
              { label: 'PAN', value: 'ABCPJ1234K' },
            ]}
          />
        </CardContent>
      </Card>
      <Card tone="green">
        <CardHeader>
          <SectionHeader icon={<Landmark />} tone="green" title="Bank account" description="Salary is credited here" />
        </CardHeader>
        <CardContent>
          <DescriptionList
            rows={[
              { label: 'Bank', value: 'HDFC Bank' },
              { label: 'IFSC', value: 'HDFC0001234' },
              { label: 'Account', value: '•••• 4821' },
              { label: 'Monthly net pay', value: '₹1,12,400', strong: true },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  ),
}

/** Nothing recorded. */
export const Empty: Story = { args: { rows: [], emptyText: 'No emergency contacts added.' } }
