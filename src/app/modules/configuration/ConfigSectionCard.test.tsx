// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Tag } from 'lucide-react'
import ConfigSectionCard from './ConfigSectionCard'
import BASELINE from './ConfigSectionCard.icon-baseline.json'

afterEach(cleanup)

type Entry = { header: string | null; action: string | null }

/** The glyph drawn in a slot, reduced to its path data — size and colour are class-driven now. */
const glyphIn = (c: HTMLElement, selector: string) => c.querySelector(`${selector} svg`)?.innerHTML ?? null

const HEADER = '[data-slot="icon-box"]'
const ACTION = '[data-icon="inline-start"]'

describe('ConfigSectionCard icon', () => {
  it('accepts a Lucide component for the header icon and the action icon', () => {
    const { container } = render(
      <ConfigSectionCard title="T" icon={Tag} primaryAction={{ label: 'Go', icon: Tag, onClick: () => {} }} />,
    )
    expect(container.querySelectorAll('svg.lucide-tag').length).toBe(2)
  })

  /**
   * The card is now a thin adapter over the kit's Settings Section, so a legacy `bi-*` name
   * resolves through `IconSlot` → the icon registry. It used to resolve through
   * `keeniconFor` → KTIcon, with a Bootstrap `<i>` fallback for anything unmapped.
   *
   * Two things this pins:
   *   NOTHING IS BLANK. The Bootstrap fallback is gone, so an unregistered name would now draw
   *     nothing at all. Five names relied on it (`bi-123`, `bi-bullseye`, `bi-house-door`,
   *     `bi-table`, `bi-truck`) and are registered as Lucide components.
   *   NOTHING DRIFTED. The baseline holds the path data each name rendered before the swap, so a
   *     name that silently starts drawing a different glyph fails here.
   */
  it('renders a glyph for every icon name its consumers pass — none blank, none drifted', () => {
    const names = Object.keys(BASELINE)
    expect(names.length).toBeGreaterThan(55)
    for (const name of names) {
      const want = (BASELINE as Record<string, Entry>)[name]
      expect(want.header, `${name} has no header glyph in the baseline`).toBeTruthy()
      expect(want.action, `${name} has no action glyph in the baseline`).toBeTruthy()

      const { container, unmount } = render(
        <ConfigSectionCard title="T" icon={name} iconColor="green" primaryAction={{ label: 'Go', icon: name, onClick: () => {} }} />,
      )
      expect({ name, g: glyphIn(container, HEADER) }).toEqual({ name, g: want.header })
      expect({ name, g: glyphIn(container, ACTION) }).toEqual({ name, g: want.action })
      unmount()
    }
  })

  it('forwards iconColor to the card as a kit tone', () => {
    const { container } = render(<ConfigSectionCard title="T" icon={Tag} iconColor="teal" />)
    // The accent is a token on the card, not a hex written into an inline style as it used to be.
    expect((container.querySelector('[data-slot="card"]') as HTMLElement).style.cssText).toContain('--tone')
  })

  it('keeps a view control visible while loading, but not a write', () => {
    const { container } = render(
      <ConfigSectionCard
        title="T"
        loading
        headerRight={<span data-testid="view-toggle">toggle</span>}
        primaryAction={{ label: 'New Slab', onClick: () => {} }}
      >
        <p>body</p>
      </ConfigSectionCard>,
    )
    expect(container.querySelector('[data-testid="view-toggle"]')).toBeTruthy()
    expect([...container.querySelectorAll('button')].some((b) => /New Slab/i.test(b.textContent ?? ''))).toBe(false)
  })
})
