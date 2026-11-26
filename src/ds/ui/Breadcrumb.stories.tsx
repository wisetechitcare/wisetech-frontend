import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb'
import { Button } from './button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu'

import { animationsSettled } from '@/ds/lib/motion'

interface Crumb {
  label: string
  href: string
}

const BREADCRUMB_LABEL = 'breadcrumb'
const HIDDEN_PAGES_LABEL = 'Show hidden pages'
const VISIBLE_PARENTS = 2

const PEOPLE: Crumb = { label: 'People', href: '#people' }
const EMPLOYEES: Crumb = { label: 'Employees', href: '#employees' }
const EMPLOYEE_PAGE = 'Meera Joshi'

const DEEP_TRAIL: Crumb[] = [
  { label: 'Settings', href: '#settings' },
  { label: 'Organization', href: '#organization' },
  { label: 'Attendance', href: '#attendance' },
  { label: 'Shift rules', href: '#shift-rules' },
  { label: 'Night shift', href: '#night-shift' },
]
const SETTINGS_PAGE = 'Sandwich rule'

interface ParentCrumbProps {
  crumb: Crumb
}

function ParentCrumb({ crumb }: ParentCrumbProps) {
  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
    </>
  )
}

interface HiddenPagesProps {
  pages: Crumb[]
}

function HiddenPages({ pages }: HiddenPagesProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={HIDDEN_PAGES_LABEL} />}>
        <BreadcrumbEllipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {pages.map((page) => (
          <DropdownMenuItem key={page.href} render={<a href={page.href} />}>
            {page.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Where this page sits — shown on detail pages and settings, not on top-level lists. Parents are links;
 * the current page is marked with `aria-current="page"` and is not a link.
 */
const meta = {
  title: 'Navigation/Breadcrumb',
  component: Breadcrumb,
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

/** Parents are links in tab order; the current page is plain text, not focusable. */
export const Basic: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <ParentCrumb crumb={PEOPLE} />
        <ParentCrumb crumb={EMPLOYEES} />
        <BreadcrumbItem>
          <BreadcrumbPage>{EMPLOYEE_PAGE}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation', { name: BREADCRUMB_LABEL })
    const people = within(nav).getByRole('link', { name: PEOPLE.label })
    await expect(people).toHaveAttribute('href', PEOPLE.href)
    await expect(within(nav).getByRole('link', { name: EMPLOYEES.label })).toHaveAttribute('href', EMPLOYEES.href)

    const page = within(nav).getByText(EMPLOYEE_PAGE)
    await expect(page).toHaveAttribute('aria-current', 'page')
    await expect(page).not.toHaveAttribute('href')

    people.focus()
    await userEvent.tab()
    await expect(within(nav).getByRole('link', { name: EMPLOYEES.label })).toHaveFocus()
  },
}

/** Deep paths keep the first and last parents; the middle collapses into a menu of links. */
export const Collapsed: Story = {
  render: () => {
    const [first, ...rest] = DEEP_TRAIL
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <ParentCrumb crumb={first} />
          <BreadcrumbItem>
            <HiddenPages pages={rest.slice(0, -VISIBLE_PARENTS)} />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {rest.slice(-VISIBLE_PARENTS).map((crumb) => (
            <ParentCrumb key={crumb.href} crumb={crumb} />
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{SETTINGS_PAGE}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  },
  play: async ({ canvas }) => {
    const hidden = DEEP_TRAIL.slice(1, -VISIBLE_PARENTS)
    for (const crumb of hidden) {
      await expect(canvas.queryByRole('link', { name: crumb.label })).not.toBeInTheDocument()
    }

    await userEvent.click(canvas.getByRole('button', { name: HIDDEN_PAGES_LABEL }))
    for (const crumb of hidden) {
      await expect(await screen.findByRole('menuitem', { name: crumb.label })).toHaveAttribute('href', crumb.href)
    }

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    await animationsSettled()
  },
}
