import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Typewriter } from './typewriter'

/**
 * For moments only: the sign-in headline. It rotates through what the platform does — one line per
 * product family — typing, holding and backspacing each, then lands on the brand line and rests. One
 * motion idea (typing) on one surface (brand ink). Never in tables, forms, wizards or approval flows.
 * Assistive tech reads only the landing line.
 */
const PHRASES = [
  'Effortless HR, End to End', //       HRMS — people, attendance, leave
  'Payroll, Right Every Time', //       Payroll — salary, loans, reimbursements
  'Every Lead, Closer to a Deal', //    CRM — leads, companies, contacts
  'From Project to Paid Invoice', //    Projects, tasks, timesheets, billing
  'Hire Great People, Faster', //       Recruitment
  'Performance You Can Measure', //     KPIs
  'Fast, Efficient & Productive', //    the brand line — where it lands
] as const
const LANDING = PHRASES[PHRASES.length - 1]

// Stories run fast; the component's defaults are the original timing (55 / 30 / 2000 / 300ms).
const FAST = { speed: 4, deleteSpeed: 2, hold: 40, delay: 20 }

const Headline = ({ className = '', ...args }: React.ComponentProps<typeof Typewriter>) => (
  <h1 className={`font-heading text-[clamp(30px,3.2vw,44px)] leading-[1.12] font-bold tracking-[-0.025em] text-foreground ${className}`}>
    <Typewriter {...args} />
  </h1>
)

const meta = {
  title: 'Effects/Typewriter',
  component: Typewriter,
  args: { text: PHRASES, ...FAST },
  render: (args) => <Headline {...args} />,
} satisfies Meta<typeof Typewriter>

export default meta
type Story = StoryObj<typeof meta>

const shown = (root: HTMLElement) => root.querySelector('[data-slot="typewriter-text"]')!.textContent
const landed = (root: HTMLElement) => root.querySelector('[data-slot="typewriter-text"][data-landed]') !== null

/** Rotates through every line and lands on the brand line; the heading's name is the brand line from the first frame. */
export const Default: Story = {
  args: {
    speed: 3,
    deleteSpeed: 1
  },

  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { name: LANDING })).toBeInTheDocument()
    await waitFor(() => expect(landed(canvasElement)).toBe(true), { timeout: 8000 })
    await expect(shown(canvasElement)).toBe(LANDING)
    await animationsSettled()
  }
}

/** Type → hold → backspace → next: every phrase is typed in full, then deleted to nothing. */
export const Rotates: Story = {
  args: { ...FAST, hold: 120 },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(shown(canvasElement)).toBe(PHRASES[0]), { timeout: 3000 })
    await waitFor(() => expect(shown(canvasElement)).toBe(''), { timeout: 3000 })
    await waitFor(() => expect(shown(canvasElement)).toBe(PHRASES[1]), { timeout: 3000 })
  },
}

/** The box is the largest phrase's from the first frame — rotating never moves the page. */
export const NoReflow: Story = {
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector<HTMLElement>('[data-slot="typewriter"]')!
    const before = box.getBoundingClientRect()
    const sizes = new Set<string>()
    await waitFor(() => {
      const r = box.getBoundingClientRect()
      sizes.add(`${r.width}x${r.height}`)
      expect(landed(canvasElement)).toBe(true)
    }, { timeout: 8000, interval: 15 })
    await expect([...sizes]).toEqual([`${before.width}x${before.height}`])
  },
}

/** `settled` (a sign-in field took focus): the brand line at once, nothing typing. */
export const Settled: Story = {
  args: { settled: true },
  play: async ({ canvasElement }) => {
    await expect(shown(canvasElement)).toBe(LANDING)
    await expect(landed(canvasElement)).toBe(true)
  },
}

/** The brand ink: one smooth gradient clipped to the letters, with a soft halo — the only effect on the text. */
export const BrandInk: Story = {
  args: { text: LANDING, settled: true },
  play: async ({ canvasElement }) => {
    const css = getComputedStyle(canvasElement.querySelector<HTMLElement>('[data-slot="typewriter-text"]')!)
    await expect(css.backgroundImage).toContain('linear-gradient')
    await expect(css.backgroundClip).toBe('text')
    await expect(css.color).toBe('rgba(0, 0, 0, 0)')
    await expect(css.filter).toContain('drop-shadow')
  },
}

/** Resolves any CSS colour to sRGB through a canvas pixel, then the WCAG contrast ratio. */
function contrast(fg: string, bg: string) {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (c: string) => {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = c
    ctx.fillRect(0, 0, 1, 1)
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
  }
  const lum = (c: string) => {
    const [r, g, b] = rgb(c).map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

/** Both ends of the brand ink read as large text (≥ 3:1) on the page, in light AND dark. */
export const InkContrast: Story = {
  render: () => (
    <div className="grid gap-4">
      <div data-theme-probe="light" className="bg-background p-4" />
      <div data-theme-probe="dark" className="dark bg-background p-4" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const probe of canvasElement.querySelectorAll<HTMLElement>('[data-theme-probe]')) {
      const css = getComputedStyle(probe)
      const bg = css.backgroundColor
      for (const stop of ['--typewriter-ink-from', '--typewriter-ink-to']) {
        const ratio = contrast(css.getPropertyValue(stop).trim(), bg)
        await expect(ratio, `${probe.dataset.themeProbe} ${stop} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      }
    }
  },
}

/** The original caret, exactly: size in em, gradient, glow, and the hard 1s on/off blink. */
export const OriginalCaret: Story = {
  args: { text: LANDING, settled: true },
  play: async ({ canvasElement }) => {
    const caret = canvasElement.querySelector<HTMLElement>('[data-slot="typewriter-text"] [data-slot="typewriter-caret"]')!
    const css = getComputedStyle(caret)
    const em = parseFloat(getComputedStyle(caret.parentElement!).fontSize)
    const { width, height } = caret.getBoundingClientRect()
    await expect(width / em).toBeCloseTo(0.09, 2)
    await expect(height / em).toBeCloseTo(0.92, 2)
    await expect(parseFloat(css.marginLeft)).toBe(4) // 0.25rem
    await expect(css.backgroundImage).toContain('linear-gradient')
    await expect(css.backgroundImage).toContain('rgb(66, 133, 244)') // #4285f4 at the top
    await expect(css.boxShadow).toContain('rgba(155, 114, 203, 0.55)')
    await expect(css.animationName).toBe('typewriter-caret')
    await expect(css.animationDuration).toBe('1s')
    // step-end, which browsers serialise as its equivalent steps(1).
    await expect(['step-end', 'steps(1)', 'steps(1, end)']).toContain(css.animationTimingFunction)
    await expect(css.animationIterationCount).toBe('infinite')
  },
}

/** Dark: the same brand, lifted to read on a dark surface. */
export const Dark: Story = {
  args: { settled: true },
  render: (args) => (
    <div className="dark rounded-xl bg-background p-8">
      <Headline {...args} />
    </div>
  ),
}

/** Phones: the original mobile size, centred, 250ms delay. */
export const Mobile: Story = {
  args: { ...FAST, delay: 250 },
  globals: { viewport: { value: 'mobile1' } },
  render: (args) => <Headline {...args} className="text-center text-[clamp(22px,7vw,30px)]" />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(landed(canvasElement)).toBe(true), { timeout: 8000 })
    await animationsSettled()
  },
}

/** Makes `(prefers-reduced-motion: reduce)` match for one story; returns the restore. */
function reduceMotion() {
  const real = window.matchMedia
  window.matchMedia = (query) =>
    query === '(prefers-reduced-motion: reduce)'
      ? ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
      : real.call(window, query)
  return () => { window.matchMedia = real }
}

/** Reduced motion: the brand line, still, in brand ink — no rotation, no caret. */
export const ReducedMotion: Story = {
  beforeEach: () => reduceMotion(),
  play: async ({ canvasElement }) => {
    await expect(shown(canvasElement)).toBe(LANDING)
    await expect(canvasElement.querySelector('[data-slot="typewriter-caret"]')).toBeNull()
  },
}
