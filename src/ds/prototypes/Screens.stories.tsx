import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent } from 'storybook/test'
import { PrototypeApp } from './PrototypeApp'

/**
 * Prototypes of the new app shell and hero screens (demo data). Navigate with the sidebar,
 * or press Ctrl K for the command palette.
 */
const meta = {
  title: 'Screens/App',
  component: PrototypeApp,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PrototypeApp>

export default meta
type Story = StoryObj<typeof meta>

/** Workspace dashboard: decisions waiting, KPIs, live attendance. */
export const Dashboard: Story = {
  args: { initialScreen: 'dashboard' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: /Good morning/ })).toBeInTheDocument()
  },
}

/** List template: saved views, search, bulk selection. Selecting rows shows the bulk bar. */
export const Employees: Story = {
  args: { initialScreen: 'employees' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select Aarav Sharma' }))
    await expect(canvas.getByText('1 selected')).toBeInTheDocument()
    await userEvent.type(canvas.getByPlaceholderText('Search name, role or ID'), 'Diya')
    await expect(canvas.getByText('Diya Nair')).toBeInTheDocument()
    await expect(canvas.queryByText('Rohan Mehta')).not.toBeInTheDocument()
  },
}

/** Detail template: identity header, tabs, info cards, activity. */
export const EmployeeDetail: Story = {
  args: { initialScreen: 'employee' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Aarav Sharma' })).toBeInTheDocument()
  },
}

/** Mobile self-service: apply leave with a live day count and balance after. */
export const ApplyLeaveMobile: Story = {
  args: { initialScreen: 'leave' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('3 days')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('switch'))
    await expect(canvas.getByText('2.5 days')).toBeInTheDocument()
  },
}

/** Ctrl K opens the command palette from anywhere in the shell. */
export const CommandPalette: Story = {
  args: { initialScreen: 'dashboard' },
  play: async () => {
    await userEvent.keyboard('{Control>}k{/Control}')
    await expect(await screen.findByPlaceholderText('Search people, pages and actions…')).toBeInTheDocument()
  },
}
