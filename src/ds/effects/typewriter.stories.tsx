import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Typewriter, type TypewriterLine } from './typewriter'

/**
 * For moments only: the sign-in headline. It rotates through what the platform does — one line per
 * product family, its key word in its department's hue — typing, holding and backspacing each like a
 * person, then lands on the brand line in three colours and rests. One motion idea: typing. Never in tables, forms,
 * wizards or approval flows. Assistive tech reads only the landing line.
 */
// One line per product family, its key word in its launcher department's hue (accessSidebarLayout:
// KPIs and hiring sit under HR). Ordered so neighbouring lines never share a colour.
const LINES: readonly TypewriterLine[] = [
  ['Effortless ', { text: 'HR', tone: 'blue' }, ', End to End'], //                                  HR Department
  ['Every ', { text: 'Lead', tone: 'green' }, ', Closer to a ', { text: 'Deal', tone: 'green' }], //  CRM
  [{ text: 'Hire', tone: 'blue' }, ' Great People, Faster'], //                                      HR — recruitment
  ['From ', { text: 'Project', tone: 'purple' }, ' to Paid ', { text: 'Invoice', tone: 'purple' }], // Project Department
  [{ text: 'Performance', tone: 'blue' }, ' You Can Measure'], //                                     HR — KPIs
  [{ text: 'Payroll', tone: 'rose' }, ', Right Every Time'], //                                       Finance/Account
  // Lands in three: the launcher's first three departments — HR, CRM, Projects.
  [{ text: 'Fast', tone: 'blue' }, ', ', { text: 'Efficient', tone: 'green' }, ' & ', { text: 'Productive', tone: 'purple' }],
]
const LANDING = 'Fast, Efficient & Productive'
const FIRST = 'Effortless HR, End to End'
const SECOND = 'Every Lead, Closer to a Deal'

// Test speed, for the stories that assert a whole run. Everything else shows the real pace.
const FAST = { speed: 4, deleteSpeed: 2, hold: 40, delay: 20 }

const Headline = ({ className = '', ...args }: React.ComponentProps<typeof Typewriter>) => (
  <h1 className={`font-heading text-[clamp(30px,3.2vw,44px)] leading-[1.12] font-bold tracking-[-0.025em] text-foreground ${className}`}>
    <Typewriter {...args} />
  </h1>
)

// The docs page shows the demos (Default, Dark, Mobile). Every other story is an automated check and is
// kept off it with `!autodocs`: the docs page renders all its stories in ONE window, so the Reduced Motion
// story's matchMedia patch would freeze every headline on the page (no typing, no caret).
const meta = {
  title: 'Effects/Typewriter',
  component: Typewriter,
  // Real timing in Storybook (the component's defaults: the original 55ms / 2s hold / 30ms delete /
  // 300ms delay). Only stories that assert a whole run opt into FAST.
  args: { lines: LINES },
  render: (args) => <Headline {...args} />,
} satisfies Meta<typeof Typewriter>

export default meta
type Story = StoryObj<typeof meta>

const shown = (root: HTMLElement) => root.querySelector('[data-slot="typewriter-text"]')!.textContent
const landed = (root: HTMLElement) => root.querySelector('[data-slot="typewriter-text"][data-landed]') !== null

/** The real thing, at the real pace (the original 55ms per letter, 2s hold, 30ms backspace). */
export const Default: Story = {
  play: async ({ canvas }) => {
    // The heading's accessible name is the brand line from the first frame, whatever is on screen.
    await expect(canvas.getByRole('heading', { name: LANDING })).toBeInTheDocument()
  },
}

/** (Test speed) Rotates through every line and lands on the brand line. */
export const RunsToLanding: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: FAST,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(landed(canvasElement)).toBe(true), { timeout: 8000 })
    await expect(shown(canvasElement)).toBe(LANDING)
    await animationsSettled()
  },
}

/** (Test speed) Type → hold → backspace → next: every line typed in full, then deleted to nothing. */
export const Rotates: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: { ...FAST, hold: 120 },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(shown(canvasElement)).toBe(FIRST), { timeout: 3000 })
    await waitFor(() => expect(shown(canvasElement)).toBe(''), { timeout: 3000 })
    await waitFor(() => expect(shown(canvasElement)).toBe(SECOND), { timeout: 3000 })
  },
}

/** (Test speed) The box is the largest line's from the first frame — rotating never moves the page. */
export const NoReflow: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: FAST,
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
  tags: ['!autodocs'], // a test, not a demo
  args: { settled: true },
  play: async ({ canvasElement }) => {
    await expect(shown(canvasElement)).toBe(LANDING)
    await expect(landed(canvasElement)).toBe(true)
  },
}

/** Key words wear their module's hue; the landing line is tri-colour; the rest is the heading's own ink. */
export const Tones: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: { settled: true },
  play: async ({ canvasElement }) => {
    const text = canvasElement.querySelector<HTMLElement>('[data-slot="typewriter-text"]')!
    const word = (hue: string) => text.querySelector<HTMLElement>(`[data-tone="${hue}"]`)!
    const probe = (v: string) => {
      const el = document.createElement('span')
      el.style.color = `var(${v})`
      text.appendChild(el)
      const c = getComputedStyle(el).color
      el.remove()
      return c
    }
    await expect(word('blue').textContent).toBe('Fast')
    await expect(word('green').textContent).toBe('Efficient')
    await expect(word('purple').textContent).toBe('Productive')
    for (const hue of ['blue', 'green', 'purple']) await expect(getComputedStyle(word(hue)).color).toBe(probe(`--tone-${hue}`))
    // Three different colours, and the connecting "," / "&" stay in the heading's ink.
    await expect(new Set(['blue', 'green', 'purple'].map((h) => getComputedStyle(word(h)).color)).size).toBe(3)
    await expect(getComputedStyle(text).color).toBe(getComputedStyle(text.closest('h1')!).color)
  },
}

/** (Test speed) The caret holds still while keys are pressed and blinks only when idle. */
export const CaretBlinksOnlyWhenIdle: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: { ...FAST, speed: 60, hold: 600 },
  play: async ({ canvasElement }) => {
    const caret = () => canvasElement.querySelector<HTMLElement>('[data-slot="typewriter-text"] [data-slot="typewriter-caret"]')!
    // Mid-line: typing, so steady.
    await waitFor(() => expect(shown(canvasElement)!.length).toBeGreaterThan(4), { timeout: 3000 })
    await expect(caret()).not.toHaveAttribute('data-blinking')
    await expect(getComputedStyle(caret()).animationName).toBe('none')
    // Line finished and held: idle, so blinking.
    await waitFor(() => expect(shown(canvasElement)).toBe(FIRST), { timeout: 5000 })
    await waitFor(() => expect(caret()).toHaveAttribute('data-blinking'), { timeout: 500 })
    await expect(getComputedStyle(caret()).animationName).toBe('typewriter-caret')
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

/** Every hue the headline uses reads as large text (≥ 3:1) on the page, in light AND dark. */
export const ToneContrast: Story = {
  tags: ['!autodocs'], // a test, not a demo
  render: () => (
    <div className="grid gap-4">
      <div data-theme-probe="light" className="bg-background p-4" />
      <div data-theme-probe="dark" className="dark bg-background p-4" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const probe of canvasElement.querySelectorAll<HTMLElement>('[data-theme-probe]')) {
      const css = getComputedStyle(probe)
      for (const hue of ['blue', 'green', 'purple', 'rose']) {
        const ratio = contrast(css.getPropertyValue(`--tone-${hue}`).trim(), css.backgroundColor)
        await expect(ratio, `${probe.dataset.themeProbe} ${hue} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      }
    }
  },
}

/** The original caret, exactly: size in em, its four-stop gradient, glow, and the hard 1s on/off blink when idle. */
export const OriginalCaret: Story = {
  tags: ['!autodocs'], // a test, not a demo
  args: { settled: true },
  play: async ({ canvasElement }) => {
    const caret = canvasElement.querySelector<HTMLElement>('[data-slot="typewriter-text"] [data-slot="typewriter-caret"]')!
    const css = getComputedStyle(caret)
    const em = parseFloat(getComputedStyle(caret.parentElement!).fontSize)
    const { width, height } = caret.getBoundingClientRect()
    await expect(width / em).toBeCloseTo(0.09, 2)
    await expect(height / em).toBeCloseTo(0.92, 2)
    await expect(parseFloat(css.marginLeft)).toBe(4) // 0.25rem
    await expect(css.backgroundImage).toContain('rgb(66, 133, 244)') //  #4285f4
    await expect(css.backgroundImage).toContain('rgb(155, 114, 203)') // #9b72cb
    await expect(css.backgroundImage).toContain('rgb(217, 101, 112)') // #d96570
    await expect(css.backgroundImage).toContain('rgb(249, 171, 85)') //  #f9ab55
    await expect(css.boxShadow).toContain('rgba(155, 114, 203, 0.55)')
    await expect(css.animationName).toBe('typewriter-caret')
    await expect(css.animationDuration).toBe('1s')
    // step-end, which browsers serialise as its equivalent steps(1).
    await expect(['step-end', 'steps(1)', 'steps(1, end)']).toContain(css.animationTimingFunction)
    await expect(css.animationIterationCount).toBe('infinite')
  },
}

/** Dark: the module hues on a dark surface, at the real pace. */
export const Dark: Story = {
  render: (args) => (
    <div className="dark rounded-xl bg-background p-8">
      <Headline {...args} />
    </div>
  ),
}

/** Phones: the original mobile size, centred, 250ms delay — at the real pace. */
export const Mobile: Story = {
  args: { delay: 250 },
  globals: { viewport: { value: 'mobile1' } },
  render: (args) => <Headline {...args} className="text-center text-[clamp(22px,7vw,30px)]" />,
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

/** Reduced motion: the brand line, still, in its colours — no rotation, no caret. */
export const ReducedMotion: Story = {
  tags: ['!autodocs'], // a test, not a demo — and it must not share the docs page's window
  beforeEach: () => reduceMotion(),
  play: async ({ canvasElement }) => {
    await expect(shown(canvasElement)).toBe(LANDING)
    await expect(canvasElement.querySelector('[data-slot="typewriter-caret"]')).toBeNull()
    await expect(canvasElement.querySelectorAll('[data-slot="typewriter-text"] [data-tone]')).toHaveLength(3)
  },
}
