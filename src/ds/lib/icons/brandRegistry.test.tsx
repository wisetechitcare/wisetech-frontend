// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { iconFor } from './registry'

afterEach(cleanup)

describe('brand icons in the registry', () => {
  it.each(['whatsapp', 'facebook', 'twitter'])('%s carries the lucide class and keeps caller classes', (name) => {
    const Brand = iconFor(name)!
    const { container } = render(<Brand className="size-4 text-green-600" />)
    const svg = container.querySelector('svg')!
    expect(svg.classList.contains('lucide')).toBe(true)
    expect(svg.classList.contains('size-4')).toBe(true)
  })

  it('lucide class without a caller className', () => {
    const Brand = iconFor('whatsapp')!
    const { container } = render(<Brand />)
    expect(container.querySelector('svg.lucide')).not.toBeNull()
  })

  it('draws no stroke: filled marks, no stroke-width attribute for the global rule to hit', () => {
    const Brand = iconFor('whatsapp')!
    const { container } = render(<Brand />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('stroke-width')).toBeNull()
    expect(svg.getAttribute('stroke')).toBeNull()
    expect(svg.getAttribute('fill')).toBe('currentColor')
  })
})
