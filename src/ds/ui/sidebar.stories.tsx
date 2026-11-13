import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { CalendarDays, Clock, LayoutDashboard, Receipt, Users } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'People', icon: Users },
  { label: 'Attendance', icon: Clock },
  { label: 'Leave', icon: CalendarDays, badge: 4 },
  { label: 'Payroll', icon: Receipt },
]

/**
 * The app's navigation rail; collapses to icons on desktop and becomes a sheet on phones. The full shell
 * (header, Ctrl K, user menu) is in Screens/App — this story shows the part on its own.
 */
const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <SidebarProvider className="min-h-96">
      <Sidebar collapsible="icon" {...args}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((n) => (
                  <SidebarMenuItem key={n.label}>
                    <SidebarMenuButton isActive={n.active} tooltip={n.label} render={<a href={`#${n.label}`} />}>
                      <n.icon aria-hidden />
                      <span>{n.label}</span>
                    </SidebarMenuButton>
                    {n.badge && <SidebarMenuBadge>{n.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-sm font-medium">Dashboard</h1>
        </header>
        <div className="p-4 text-sm text-muted-foreground">Page content</div>
      </SidebarInset>
    </SidebarProvider>
  ),
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

/** The current page is marked; the trigger collapses the rail. SidebarInset is the page's `main` landmark. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('data-active')
    await userEvent.click(canvas.getByRole('button', { name: /toggle sidebar/i }))
    await waitFor(() =>
      expect(canvas.getByRole('link', { name: 'Dashboard' }).closest('[data-state]')).toHaveAttribute('data-state', 'collapsed'),
    )
  },
}
