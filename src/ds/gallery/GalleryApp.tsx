import { useEffect, useState } from "react"
import { Moon, Sun, Layers, Rows3, Palette } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ds/ui/tabs"
import { TooltipProvider } from "@/ds/ui/tooltip"
import { Toaster } from "@/ds/ui/sonner"
import { applyAppearance, BRAND_PRESETS, type Appearance } from "@/ds/lib/appearance"
import { cn } from "@/ds/lib/utils"
import { Foundations } from "@/ds/foundations/Foundations"
import { Components } from "./sections/Components"
import { PrototypeApp } from "@/ds/prototypes/PrototypeApp"

/** Read the initial appearance from the query string so screenshots can pin a theme. */
function initialAppearance(): Appearance & { brandId: string } {
  const q = new URLSearchParams(location.search)
  const brandId = q.get("brand") ?? "navy"
  return {
    mode: q.get("mode") === "dark" ? "dark" : "light",
    surface: q.get("surface") === "glass" ? "glass" : "material",
    density: q.get("density") === "compact" ? "compact" : "comfortable",
    brand: null,
    brandId,
  }
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<{ value: T; label: string; icon?: React.ReactNode }>
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-label font-medium transition-colors duration-[var(--duration-fast)]",
            value === o.value ? "bg-card text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function GalleryApp() {
  const [a, setA] = useState(initialAppearance)
  const preset = BRAND_PRESETS.find((b) => b.id === a.brandId) ?? BRAND_PRESETS[0]

  useEffect(() => {
    applyAppearance({ ...a, brand: a.brandId === "navy" ? null : a.mode === "dark" ? preset.dark : preset.light })
  }, [a, preset])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen">
        <header className="surface-chrome sticky top-0 z-40 border-b">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-3">
            <div className="mr-auto flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-label font-bold text-primary-foreground">
                W
              </span>
              <div>
                <p className="text-title font-semibold leading-tight">WiseTech Design System</p>
                <p className="text-label text-muted-foreground">Visual Language v2 · Radix + Tailwind</p>
              </div>
            </div>
            <Segmented
              label="Theme"
              value={a.mode}
              onChange={(mode) => setA((s) => ({ ...s, mode }))}
              options={[
                { value: "light", label: "Light", icon: <Sun className="size-3.5" /> },
                { value: "dark", label: "Dark", icon: <Moon className="size-3.5" /> },
              ]}
            />
            <Segmented
              label="Surface"
              value={a.surface}
              onChange={(surface) => setA((s) => ({ ...s, surface }))}
              options={[
                { value: "material", label: "Material", icon: <Layers className="size-3.5" /> },
                { value: "glass", label: "Glass", icon: <Layers className="size-3.5" /> },
              ]}
            />
            <Segmented
              label="Density"
              value={a.density}
              onChange={(density) => setA((s) => ({ ...s, density }))}
              options={[
                { value: "comfortable", label: "Comfortable", icon: <Rows3 className="size-3.5" /> },
                { value: "compact", label: "Compact", icon: <Rows3 className="size-3.5" /> },
              ]}
            />
            <div role="radiogroup" aria-label="Tenant brand" className="flex items-center gap-1.5">
              <Palette className="size-4 text-muted-foreground" aria-hidden />
              {BRAND_PRESETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={a.brandId === b.id}
                  aria-label={b.label}
                  title={b.label}
                  onClick={() => setA((s) => ({ ...s, brandId: b.id }))}
                  className={cn(
                    "size-6 rounded-full border-2 transition-transform",
                    a.brandId === b.id ? "scale-110 border-foreground" : "border-transparent",
                  )}
                  style={{ background: a.mode === "dark" ? b.dark : b.light }}
                />
              ))}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          <Tabs defaultValue={new URLSearchParams(location.search).get("tab") ?? "screens"}>
            <TabsList>
              <TabsTrigger value="screens">Screens</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="foundations">Foundations</TabsTrigger>
            </TabsList>
            <TabsContent value="screens" className="mt-6">
              <PrototypeApp initialScreen={(new URLSearchParams(location.search).get("screen") as "dashboard" | "employees" | "employee" | "leave" | null) ?? "dashboard"} />
            </TabsContent>
            <TabsContent value="components" className="mt-6">
              <Components />
            </TabsContent>
            <TabsContent value="foundations" className="mt-6">
              <Foundations />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  )
}
