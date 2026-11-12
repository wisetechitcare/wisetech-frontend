// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { Tag } from 'lucide-react'
import MaterialHeaderTab, { type TabItem } from './MaterialHeaderTab'

afterEach(cleanup)

const draw = (icon: TabItem['icon']) => {
  const store = configureStore({ reducer: () => ({}) })
  return render(
    <Provider store={store}>
      <MaterialHeaderTab tabItems={[{ title: 'One', icon, component: <div /> }]} activeTab={0} onTabChange={() => {}} />
    </Provider>,
  ).container
}

describe('MaterialHeaderTab icon', () => {
  it('accepts a Lucide component, inside .mht-icon at the 23px (fs-2) size', () => {
    const span = draw(Tag).querySelector('.mht-icon')!
    const svg = span.querySelector('svg.lucide-tag')!
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('class')).toContain('size-[23px]')
  })

  it('keeps a bi- string identical: same hook, 23px', () => {
    const span = draw('bi-tag').querySelector('.mht-icon')!
    const svg = span.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('23')
    expect(svg.getAttribute('class')).toContain('lucide')
    expect(svg.getAttribute('stroke-width')).toBe('1.75')
  })

  it('phone switcher: component icon is 21px (fs-3) and, like the string branch, takes its colour from the parent button (no own colour)', () => {
    const original = window.matchMedia
    const hadRO = 'ResizeObserver' in globalThis
    if (!hadRO) (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
    window.matchMedia = ((q: string) => ({
      matches: true, media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as typeof window.matchMedia
    try {
      const fromComponent = draw(Tag).querySelector('button svg.lucide-tag')!
      expect(fromComponent.getAttribute('class')).toContain('size-[21px]')
      const fromString = draw('bi-tag').querySelector('button svg')!
      expect(fromString.getAttribute('width')).toBe('21')
      for (const svg of [fromComponent, fromString]) {
        expect((svg as SVGElement).style.color).toBe('')
        expect(svg.closest('.mht-icon')).toBeNull()
        expect(svg.closest('button')).not.toBeNull()
      }
    } finally {
      window.matchMedia = original
      if (!hadRO) delete (globalThis as any).ResizeObserver
    }
  })
})
