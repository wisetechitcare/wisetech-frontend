import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import { configure } from 'storybook/test'
import '../src/ds/styles/globals.css'
import { KitProvider } from '../src/ds/provider'
import { Toaster } from '../src/ds/ui/sonner'
import { applyAppearance, BRAND_PRESETS, type Density, type Mode, type Surface } from '../src/ds/lib/appearance'

// Story tests wait for animated overlays (Animate UI springs) to open and close. Testing Library's default
// 1s wait was too tight on a loaded machine running the whole suite in parallel, so stories timed out at
// random. One setting for every story instead of a timeout sprinkled into each.
configure({ asyncUtilTimeout: 4000 })

/**
 * WiseTech v2 appearance: the four axes the product exposes (theme, surface, density, tenant
 * brand) are applied exactly as the app will, so every story renders in real context.
 *
 * WHERE they are applied depends on the view:
 * - Canvas (one story per document): on <html>, like the app — portals (popovers, toasts) follow too.
 * - Docs (MANY stories share one document, on Storybook's white page): on a wrapper around each story.
 *   Applying them to <html> there let one story's `globals: { mode: 'dark' }` (e.g. Field's
 *   FloatingLabelsDark) flip EVERY story on the page to dark tokens — pale ink on the white docs page,
 *   invisible inputs — and made a dark toolbar choice paint black widgets on a white page. Scoped, a
 *   dark story is a dark panel with its own background, and its neighbours are untouched.
 */
type Globals = { mode: Mode; surface: Surface; density: Density; brand: string }

function Appearance({ mode, surface, density, brand, scoped, children }: Globals & { scoped: boolean; children: ReactNode }) {
  const preset = BRAND_PRESETS.find((b) => b.id === brand) ?? BRAND_PRESETS[0]
  const wrapper = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const appearance = { mode, surface, density, brand: preset.id === 'wisetech' ? null : preset.primary }
    if (scoped) {
      // The iframe is reused from canvas to docs: clear any <html> theme a canvas story left behind.
      applyAppearance({ mode: 'light', surface: 'material', density: 'comfortable', brand: null })
      if (wrapper.current) applyAppearance(appearance, wrapper.current)
    } else {
      applyAppearance(appearance)
    }
  }, [mode, surface, density, preset, scoped])
  const body = (
    <KitProvider>
      {children}
      <Toaster position="bottom-right" closeButton />
    </KitProvider>
  )
  if (!scoped) return body
  return (
    <div
      ref={wrapper}
      data-slot="story-appearance"
      // Light keeps the docs block exactly as before; dark becomes a panel carrying its own surface.
      className={mode === 'dark' ? 'rounded-xl bg-background p-6 text-foreground' : 'text-foreground'}
    >
      {body}
    </div>
  )
}

const withAppearance: Decorator = (Story, ctx) => (
  <Appearance {...(ctx.globals as Globals)} scoped={ctx.viewMode === 'docs'}>
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
  initialGlobals: { mode: 'light', surface: 'material', density: 'comfortable', brand: 'wisetech' },
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
      storySort: { order: ['Introduction', 'Kit Map', 'Foundations', 'Components', 'Patterns', 'Effects', 'Screens'] },
    },
  },
}

export default preview
