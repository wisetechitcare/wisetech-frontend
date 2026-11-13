// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Tag } from 'lucide-react'
import ConfigSectionCard from './ConfigSectionCard'
import BEFORE from './ConfigSectionCard.icon-baseline.json'

afterEach(cleanup)

/** Header tile glyph: the svg (or Bootstrap <i>) inside the 40px tile. Reduced to markup + box size. */
const glyphOf = (el: Element | null) => {
  if (!el) return null
  const svg = el.querySelector('svg')
  if (svg) return { kind: 'svg', w: svg.getAttribute('width'), h: svg.getAttribute('height'), html: svg.innerHTML }
  const i = el.querySelector('i')
  return i ? { kind: 'i', cls: i.className, fs: (i as HTMLElement).style.fontSize } : null
}
const headerGlyph = (c: HTMLElement) => glyphOf(c.querySelector('.cfg-section-header > div > div'))
const actionGlyph = (c: HTMLElement) => glyphOf(c.querySelector('[data-icon="inline-start"]'))

describe('ConfigSectionCard icon', () => {
  it('accepts a Lucide component for the header icon and the action icon', () => {
    const { container } = render(
      <ConfigSectionCard title="T" icon={Tag} primaryAction={{ label: 'Go', icon: Tag, onClick: () => {} }} />,
    )
    expect(container.querySelectorAll('svg.lucide-tag').length).toBe(2)
  })

  it('renders every icon string used by today\'s consumers exactly as before', () => {
    const names = Object.keys(BEFORE)
    expect(names.length).toBeGreaterThan(40)
    for (const name of names) {
      const { container, unmount } = render(
        <ConfigSectionCard title="T" icon={name} iconColor="green" primaryAction={{ label: 'Go', icon: name, onClick: () => {} }} />,
      )
      const want = (BEFORE as Record<string, unknown>)[name] as { header: unknown; action: unknown; color: string }
      expect({ name, g: headerGlyph(container) }).toEqual({ name, g: want.header })
      expect({ name, g: actionGlyph(container) }).toEqual({ name, g: want.action })
      const tile = container.querySelector('.cfg-section-header > div > div') as HTMLElement
      expect(tile.innerHTML.includes(want.color)).toBe(true)
      unmount()
    }
  })
})
