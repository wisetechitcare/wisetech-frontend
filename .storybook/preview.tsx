import { useLayoutEffect } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import '../src/ds/styles/globals.css'
import { TooltipProvider } from '../src/ds/ui/tooltip'
import { Toaster } from '../src/ds/ui/sonner'
import { applyAppearance, BRAND_PRESETS, type Density, type Mode, type Surface } from '../src/ds/lib/appearance'

/**
 * WiseTech v2 appearance: the four axes the product exposes (theme, surface, density, tenant
 * brand) are applied to <html> exactly as the app will, so every story renders in real context.
 */
const withAppearance: Decorator = (Story, ctx) => {
  const { mode, surface, density, brand } = ctx.globals as {
    mode: Mode
    surface: Surface
    density: Density
    brand: string
  }
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
    <TooltipProvider delayDuration={150}>
      <Story />
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  )
}

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
      storySort: { order: ['Introduction', 'Foundations', 'Components', 'Patterns', 'Screens'] },
    },
  },
}

export default preview
