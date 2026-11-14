import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Button, buttonVariants } from '@/ds/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { LANDING_LINE, PRODUCT_LINES } from '@/ds/effects/typewriter.fixtures'
import logo from '@/ds/ui/__fixtures__/logo.svg'
import { AuthLayout } from './auth-layout'
import { PasswordField } from './password-field'

/** A sign-in form, composed from the kit — what the Sign In screen will render inside the layout. */
function SignInForm() {
  return (
    <form className="grid gap-6" onSubmit={(e) => e.preventDefault()} noValidate>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="auth-email">Email</FieldLabel>
          <Input id="auth-email" type="email" name="email" autoComplete="username" inputMode="email" />
        </Field>
        <Field>
          <FieldLabel htmlFor="auth-password">Password</FieldLabel>
          <PasswordField id="auth-password" name="password" autoComplete="current-password" />
        </Field>
      </FieldGroup>
      <a href="#forgot" className={buttonVariants({ variant: 'link', className: 'justify-self-end px-0' })}>
        Forgot password?
      </a>
      <Button type="submit" className="w-full">Sign In</Button>
    </form>
  )
}

/**
 * The sign-in pages' frame: brand panel (logo, Typewriter headline, supporting line) beside the form Card from
 * `lg`, stacked above it on tablets and phones. The headline settles as soon as the form takes focus.
 */
const meta = {
  title: 'Patterns/Auth Layout',
  component: AuthLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    brandName: 'WiseTech',
    logoSrc: logo,
    headline: PRODUCT_LINES,
    tagline: 'All-in-one HR, CRM, Projects and Payroll for your whole organisation.',
    title: 'Sign In',
    description: 'Welcome back. Use your work email.',
    children: <SignInForm />,
  },
} satisfies Meta<typeof AuthLayout>

export default meta
type Story = StoryObj<typeof meta>

const box = (el: Element) => el.getBoundingClientRect()

/** Sign In, on a desktop: brand panel on the left, the form on the right. */
export const Default: Story = {
  globals: { viewport: { value: 'desktop' } },
}

/** Phones: logo and headline stacked above the form. */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
}

/** Dark. */
export const Dark: Story = {
  globals: { viewport: { value: 'desktop' } },
  render: (args) => (
    <div className="dark">
      <AuthLayout {...args} />
    </div>
  ),
}

/** One page heading: the form title is the `h1` (structural, UPPERCASE); the headline is not a heading. */
export const OneHeading: Story = {
  tags: ['!autodocs'], // a test, not a demo
  play: async ({ canvas, canvasElement }) => {
    const headings = canvas.getAllByRole('heading')
    await expect(headings).toHaveLength(1)
    await expect(headings[0]).toHaveAccessibleName('Sign In')
    await expect(headings[0].tagName).toBe('H1')
    await expect(getComputedStyle(headings[0]).textTransform).toBe('uppercase')
    // The headline's accessible text is only its landing line.
    await expect(canvasElement.querySelector('[data-slot="auth-headline"]')).toHaveTextContent(LANDING_LINE)
  },
}

/** Focusing the form settles the headline at once — it never competes with typing a password. */
export const SettlesOnFocus: Story = {
  tags: ['!autodocs'], // a test, not a demo
  play: async ({ canvas, canvasElement }) => {
    const shown = () => {
      const el = canvasElement.querySelector<HTMLElement>('[data-slot="typewriter-text"]')!
      return (el.textContent ?? '').slice(0, Number(el.dataset.typed))
    }
    await waitFor(() => expect(shown().length).toBeGreaterThan(0), { timeout: 3000 })
    await expect(shown()).not.toBe(LANDING_LINE)
    await userEvent.click(canvas.getByLabelText('Email'))
    await expect(shown()).toBe(LANDING_LINE)
    await expect(canvasElement.querySelector('[data-slot="typewriter-text"][data-landed]')).not.toBeNull()
  },
}

/** A logo that fails to load falls back to the organisation's initials beside its name — never a broken image. */
export const BrokenLogo: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: { logoSrc: 'https://invalid.example/missing-logo.png' },
  play: async ({ canvasElement }) => {
    const brand = canvasElement.querySelector('[data-slot="auth-brand"]')!
    await waitFor(() => expect(brand.querySelector('img[src*="missing-logo"]')).toBeNull(), { timeout: 3000 })
    await expect(brand.querySelector('[data-slot="auth-brand-mark"]')).toHaveTextContent('WiseTech')
  },
}

/** Phone: the logo heads the form card, centred with the title and description (as the reference). */
export const CentredOnPhone: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const card = box(canvasElement.querySelector('[data-slot="card"]')!)
    const mark = canvasElement.querySelector('[data-slot="auth-card-brand"] [data-slot="auth-brand-mark"]')!
    await waitFor(() => expect(box(mark).width).toBeGreaterThan(0))
    const centre = (r: DOMRect) => r.left + r.width / 2
    await expect(Math.abs(centre(box(mark)) - centre(card))).toBeLessThan(2)
    const title = canvasElement.querySelector('[data-slot="auth-title"]')!
    await expect(Math.abs(centre(box(title)) - centre(card))).toBeLessThan(2)
  },
}

/** Desktop: brand panel and form side by side, the form vertically centred. */
export const SideBySide: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const brand = box(canvasElement.querySelector('[data-slot="auth-brand"]')!)
    const card = box(canvasElement.querySelector('[data-slot="card"]')!)
    await expect(brand.right).toBeLessThanOrEqual(card.left)
    await expect(Math.abs(brand.top - 0)).toBeLessThan(2)
  },
}

/** Phone (320px): stacked — logo and headline above the form — with nothing wider than the screen. */
export const StackedOnPhone: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const brand = box(canvasElement.querySelector('[data-slot="auth-brand"]')!)
    const card = box(canvasElement.querySelector('[data-slot="card"]')!)
    await expect(brand.bottom).toBeLessThanOrEqual(card.top + 1)
    const root = document.documentElement
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth)
    // The card keeps the 16px gutter on both sides.
    await expect(card.left).toBeGreaterThanOrEqual(15)
    await expect(root.clientWidth - card.right).toBeGreaterThanOrEqual(15)
  },
}

/** The form card is still: no corner glow, no accent underline, no lift on hover. */
export const StillFormCard: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="card"]')!
    await expect(card).toHaveAttribute('data-variant', 'panel')
    await expect(card.querySelector('[data-slot="card-glow"]')).toBeNull()
    await expect(card.querySelector('[data-slot="card-accent"]')).toBeNull()
    const before = card.getBoundingClientRect().top
    await userEvent.hover(card)
    await new Promise((r) => setTimeout(r, 400)) // longer than any card transition
    await expect(card.getBoundingClientRect().top).toBe(before)
  },
}
