// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Tag } from 'lucide-react'
import { ToolbarFilterSelect } from './ToolbarFilterSelect'

afterEach(cleanup)

const opts = [{ value: 'a', label: 'A' }]
const draw = (icon: Parameters<typeof ToolbarFilterSelect>[0]['icon']) =>
  render(<ToolbarFilterSelect label="L" icon={icon} value="a" onChange={() => {}} options={opts} />).container

describe('ToolbarFilterSelect icon', () => {
  it('accepts a Lucide component, drawn at the 16px field-icon size', () => {
    const svg = draw(Tag).querySelector('svg.lucide-tag')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('class')).toContain('size-[16px]')
  })

  it('keeps a bi- string on the same path as before: AppIcon at fs-6 (16px)', () => {
    const svg = draw('bi-tag').querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('16')
    expect(svg.getAttribute('height')).toBe('16')
    expect(svg.getAttribute('class')).toContain('lucide')
    expect(svg.getAttribute('stroke-width')).toBe('1.75')
  })

  it('keeps a keenicon-name string on the same path as before (16px)', () => {
    const svg = draw('tag').querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('16')
  })
})
