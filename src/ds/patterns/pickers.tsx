import * as React from "react"
import { HUE_TONES } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group"
import { Label } from "@/ds/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/ds/ui/toggle-group"

const HEX = /^#[0-9a-f]{6}$/i

/** Shared: a labelled single-choice group of tiles (ToggleGroup — arrow keys move, one always chosen). */
function TileGroup({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
}) {
  const labelId = React.useId()
  return (
    <div className="grid gap-2">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <ToggleGroup
        aria-labelledby={labelId}
        value={value ? [value] : []}
        // Clicking the chosen tile again reports []; keep the current choice instead of clearing it.
        onValueChange={(next: string[]) => next[0] && onValueChange(next[0])}
        spacing={2}
        className="flex-wrap"
      >
        {children}
      </ToggleGroup>
    </div>
  )
}

const tileClass =
  "p-0 aria-pressed:ring-2 aria-pressed:ring-foreground aria-pressed:ring-offset-2 aria-pressed:ring-offset-background"

export type ColorSwatch = { value: string; label: string; color: string }

/** The kit palette: every category hue in `HUE_TONES`, named. Values are hue names; a custom colour is a hex. */
export const KIT_SWATCHES: ColorSwatch[] = HUE_TONES.map((h) => ({
  value: h,
  label: h[0].toUpperCase() + h.slice(1),
  color: `var(--tone-${h})`,
}))

/**
 * Choose a colour for something an admin configures (leave type, status, section): the kit palette, or a
 * custom hex. Replaces the live kit's `WtColorPicker` (and the browser's native colour input). The value is a
 * hue name (follows theme and dark mode) or a hex.
 */
export function ColorPicker({
  label,
  value,
  onChange,
  palette = KIT_SWATCHES,
  allowCustom = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  palette?: ColorSwatch[]
  allowCustom?: boolean
}) {
  const isCustom = !palette.some((s) => s.value === value)
  const [hex, setHex] = React.useState(isCustom ? value : "")
  const hexId = React.useId()
  return (
    <div className="grid gap-3">
      <TileGroup label={label} value={isCustom ? "" : value} onValueChange={onChange}>
        {palette.map((s) => (
          <ToggleGroupItem key={s.value} value={s.value} aria-label={s.label} className={cn(tileClass, "size-8 min-w-8 rounded-full")}>
            <span aria-hidden className="size-full rounded-full ring-1 ring-foreground/10 ring-inset" style={{ background: s.color }} />
          </ToggleGroupItem>
        ))}
      </TileGroup>
      {allowCustom && (
        <div className="grid max-w-56 gap-1.5">
          <Label htmlFor={hexId}>Custom colour (hex)</Label>
          <InputGroup>
            <InputGroupAddon>
              <span
                aria-hidden
                className="size-4 rounded-full ring-1 ring-foreground/15"
                style={{ background: HEX.test(hex) ? hex : "transparent" }}
              />
            </InputGroupAddon>
            <InputGroupInput
              id={hexId}
              placeholder="#1E3A8A"
              value={hex}
              aria-invalid={hex !== "" && !HEX.test(hex) ? true : undefined}
              onChange={(e) => {
                const next = e.target.value.trim()
                setHex(next)
                if (HEX.test(next)) onChange(next)
              }}
            />
          </InputGroup>
        </div>
      )}
    </div>
  )
}

/**
 * Choose an icon for something an admin configures (a module, a document category). Replaces the live
 * kit's `IconPicker`. Each option has a name, read out instead of the picture.
 */
export function IconPicker({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; icon: React.ReactNode }>
}) {
  return (
    <TileGroup label={label} value={value} onValueChange={onChange}>
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          aria-label={o.label}
          className={cn(tileClass, "size-10 min-w-10 rounded-xl bg-muted text-muted-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground [&_svg]:size-5")}
        >
          {o.icon}
        </ToggleGroupItem>
      ))}
    </TileGroup>
  )
}
