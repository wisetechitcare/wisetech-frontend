import { useLayoutEffect, type ReactNode } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import '../src/ds/styles/globals.css'
import { KitProvider } from '../src/ds/provider'
import { Toaster } from '../src/ds/ui/sonner'
import { applyAppearance, BRAND_PRESETS, type Density, type Mode, type Surface } from '../src/ds/lib/appearance'

/**
 * WiseTech v2 appearance: the four axes the product exposes (theme, surface, density, tenant
 * brand) are applied to <html> exactly as the app will, so every story renders in real context.
 */
type Globals = { mode: Mode; surface: Surface; density: Density; brand: string }

function Appearance({ mode, surface, density, brand, children }: Globals & { children: ReactNode }) {
  const preset = BRAND_PRESETS.find((b) => b.id === brand) ?? BRAND_PRESETS[0]
  useLayoutEffect(() => {
    applyAppearance({
      mode,
      surface,
      density,
      brand: preset.id === 'navy' ? null : mode === 'dark' ? preset.dark : preset.light,
    })
  }, [mode, surface, density, preset])
  return (
    <KitProvider>
      {children}
      <Toaster position="bottom-right" closeButton />
    </KitProvider>
  )
}

const withAppearance: Decorator = (Story, ctx) => (
  <Appearance {...(ctx.globals as Globals)}>
    <Story />
  </Appearance>
)

const toolbar = (title: string, icon: string, items: Array<{ value: string; title: string }>) => ({
  toolbar: { title, icon, items, dynamicTitle: true },
})

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [withAppearance],
  globalTypes: {
    mode: { description: 'Light or dark', ...toolbar('Theme', 'mirror', [{ value: 'light', title: 'Light' }, { value: 'dark', title: 'Dark' }]) },
    surface: { description: 'Material or Glass chrome', ...toolbar('Surface', 'component', [{ value: 'material', title: 'Material' }, { value: 'glass', title: 'Glass' }]) },
    density: { description: 'Comfortable or compact spacing', ...toolbar('Density', 'grow', [{ value: 'comfortable', title: 'Comfortable' }, { value: 'compact', title: 'Compact' }]) },
    brand: { description: 'Tenant brand colour', ...toolbar('Brand', 'paintbrush', BRAND_PRESETS.map((b) => ({ value: b.id, title: b.label }))) },
  },
  initialGlobals: { mode: 'light', surface: 'material', density: 'comfortable', brand: 'navy' },
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'error': an axe violation fails the story test (enterprise bar — zero a11y errors).
      test: 'error',
    },
    options: {
      storySort: { order: ['Introduction', 'Foundations', 'Components', 'Patterns', 'Effects', 'Screens'] },
    },
  },
}

export default preview
