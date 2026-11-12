// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Trash2 } from 'lucide-react'
import { iconFor } from '@/ds/lib/icons/registry'
import { DynamicIcon, IconSlot } from './dynamic-icon'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('DynamicIcon', () => {
  it('renders a Lucide svg at the default 18px size', () => {
    const { container } = render(<DynamicIcon name="setting-2" />)
    const svg = container.querySelector('svg.lucide')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('class')).toContain('size-[18px]')
  })

  it('keeps caller classes and adds no default when a size class is present', () => {
    const { container } = render(<DynamicIcon name="bi-trash" className="size-4 text-danger" />)
    const cls = container.querySelector('svg.lucide')?.getAttribute('class') ?? ''
    expect(cls).toContain('size-4')
    expect(cls).toContain('text-danger')
    expect(cls).not.toContain('size-[18px]')
  })

  it('renders nothing and warns once for an unknown name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<DynamicIcon name="no-such-icon" />)
    expect(container.innerHTML).toBe("")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('[DynamicIcon] no icon registered for "no-such-icon"')
  })
})

describe('IconSlot', () => {
  it('renders a component source with its className', () => {
    const { container } = render(<IconSlot icon={Trash2} className="size-4" />)
    expect(container.querySelector('svg.lucide-trash-2')).not.toBeNull()
  })

  it('resolves a string source through the registry', () => {
    const expected = render(<IconSlot icon={iconFor('bi-trash')!} />).container.querySelector('svg')!.getAttribute('class')!
    const { container } = render(<IconSlot icon="bi-trash" />)
    const glyph = expected.split(/\s+/).find((c) => c.startsWith('lucide-') && c !== 'lucide')!
    expect(container.querySelector(`svg.${glyph}`)).not.toBeNull()
  })

  it('renders nothing for a nullish source', () => {
    const { container } = render(<IconSlot icon={undefined} />)
    expect(container.innerHTML).toBe("")
  })
})
