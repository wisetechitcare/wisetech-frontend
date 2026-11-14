import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Button, buttonVariants } from '@/ds/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { LANDING_LINE, PRODUCT_LINES } from '@/ds/effects/typewriter.fixtures'
import wideLogo from '@/ds/ui/__fixtures__/logo.svg'

/** The real WiseTech lockup (public/, served by Storybook and the app). */
const LOCKUP = '/media/brand/wisetech-logo.png'
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
 * The sign-in pages' frame: brand panel (Typewriter headline, supporting line) beside the form Card from `lg`,
 * stacked above it on tablets and phones. Text is centred at every size. The logo sits in the page's top-left
 * corner from `lg`, and centred at the top of the stack below it. The headline settles as soon as the form takes focus.
 */
const meta = {
  title: 'Patterns/Auth Layout',
  component: AuthLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    brandName: 'WiseTech',
    logoSrc: LOCKUP,
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

/** A logo that fails to load leaves the organisation's initials, never an empty or broken tile. */
export const BrokenLogo: Story = {
  tags: ['!autodocs'], // a test, not a demo
  // Same-origin 404: fails at once (an unresolvable host waits on DNS and made this test flaky).
  args: { logoSrc: '/media/brand/missing-logo.png' },
  play: async ({ canvasElement }) => {
    const brand = canvasElement.querySelector('[data-slot="auth-brand"]')!
    await waitFor(() => expect(brand.querySelector('img[src*="missing-logo"]')).toBeNull(), { timeout: 3000 })
    await expect(brand.querySelector('[data-slot="smart-avatar"]')).toHaveTextContent('WI')
  },
}

/** Phone: the logo stays outside the card — centred at the top of the brand row, above the headline. */
export const LogoOutsideCardOnPhone: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const cardEl = canvasElement.querySelector('[data-slot="card"]')!
    await expect(cardEl.querySelector('[data-slot="auth-logo"]')).toBeNull()
    const mark = canvasElement.querySelector('[data-slot="auth-brand"] [data-slot="auth-logo-image"]')!
    await waitFor(() => expect(box(mark).width).toBeGreaterThan(0))
    const card = box(cardEl)
    await expect(box(mark).bottom).toBeLessThanOrEqual(card.top)
    const centre = (r: DOMRect) => r.left + r.width / 2
    await expect(Math.abs(centre(box(mark)) - centre(card))).toBeLessThan(2)
    await expect(Math.abs(centre(box(canvasElement.querySelector('[data-slot="auth-title"]')!)) - centre(card))).toBeLessThan(2)
  },
}

/** The page heading is Gradient Text in readable ink: two shimmer passes, then still. */
export const GradientHeading: Story = {
  tags: ['!autodocs'], // a test, not a demo
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector<HTMLElement>('[data-slot="auth-title"] [data-slot="gradient-text"]')!
    await expect(heading).toHaveAttribute('data-tone', 'brand')
    await expect(heading).toHaveAttribute('data-shimmer', 'twice')
    await expect(getComputedStyle(heading).animationIterationCount).toBe('2')
    await expect(canvasElement.querySelector('h1')).toHaveTextContent('Sign In')
  },
}

/** Desktop: the logo pinned to the page's top-left corner, outside the card and clear of the headline; text centred. */
export const LogoTopLeftOnDesktop: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvasElement }) => {
    const marks = canvasElement.querySelectorAll('[data-slot="auth-logo"]')
    await expect(marks).toHaveLength(1)
    const root = box(canvasElement.querySelector('[data-slot="auth-frame"]')!) // the composition's corner
    const image = canvasElement.querySelector<HTMLImageElement>('[data-slot="auth-logo-image"]')!
    await waitFor(() => expect(image.naturalWidth).toBeGreaterThan(0), { timeout: 3000 })
    const mark = box(image)
    await expect(mark.left - root.left).toBeLessThan(64)
    await expect(mark.top - root.top).toBeLessThan(64)
    await expect(mark.height).toBeGreaterThanOrEqual(80)
    await expect(canvasElement.querySelector('[data-slot="card"] [data-slot="smart-avatar"]')).toBeNull()
    await expect(mark.bottom).toBeLessThanOrEqual(box(canvasElement.querySelector('[data-slot="auth-headline"]')!).top)
    await expect(getComputedStyle(canvasElement.querySelector('[data-slot="auth-brand"]')!).textAlign).toBe('center')
    await expect(getComputedStyle(canvasElement.querySelector('[data-slot="card-header"]')!).textAlign).toBe('center')
  },
}

/** A logo keeps its own proportions — a wide logo stays wide (here 3:1), never squeezed into a square tile. */
export const LogoKeepsItsShape: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'desktop' } },
  args: { logoSrc: wideLogo },
  play: async ({ canvasElement }) => {
    const image = canvasElement.querySelector<HTMLImageElement>('[data-slot="auth-logo-image"]')!
    await waitFor(() => expect(image.naturalWidth).toBeGreaterThan(0), { timeout: 3000 })
    const r = box(image)
    await expect(Math.abs(r.width / r.height - 3)).toBeLessThan(0.05)
    await expect(image).toHaveAccessibleName('WiseTech')
  },
}

/** Wherever the column can hold it, the longest headline line stays on ONE line (here the desktop viewport). */
export const HeadlineOnOneLine: Story = {
  tags: ['!autodocs'], // a test, not a demo
  globals: { viewport: { value: 'desktop' } },
  args: { headline: [['Performance You Can Measure']] },
  play: async ({ canvasElement }) => {
    const text = canvasElement.querySelector<HTMLElement>('[data-slot="typewriter-text"]')!
    await waitFor(() => expect(text).toHaveAttribute('data-landed'), { timeout: 5000 })
    const range = document.createRange()
    range.selectNodeContents(text)
    const lineTops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)))
    await expect(lineTops.size).toBe(1)
    await expect(parseFloat(getComputedStyle(text).fontSize)).toBeGreaterThanOrEqual(22)
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
