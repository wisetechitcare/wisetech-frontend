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
})
