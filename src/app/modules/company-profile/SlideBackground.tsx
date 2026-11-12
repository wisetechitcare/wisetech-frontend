import type { ReactElement } from "react"
import { WtColorPicker, type ColorSwatch } from "@app/modules/common/components/ui/WtColorPicker"
import { Popover, PopoverContent, PopoverTrigger } from "@/ds/ui/popover"

/** Brochure-friendly backgrounds: four light, four dark (text turns white on the dark ones). */
const SWATCHES: ColorSwatch[] = [
  ["#ffffff", "White"],
  ["#f1f5f9", "Mist"],
  ["#faf6ee", "Ivory"],
  ["#e8f0fb", "Ice blue"],
  ["#1b2a4e", "Navy"],
  ["#0f172a", "Midnight"],
  ["#262b33", "Graphite"],
  ["#3d0f14", "Maroon"],
].map(([hex, label]) => ({ value: hex, hex, label }))

/** The deck's background colour: a palette, any custom colour or an exact hex, behind the given trigger button. */
export function SlideBackground({ value, onChange, trigger }: { value: string; onChange: (hex: string) => void; trigger: ReactElement }) {
  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-auto gap-3">
        <div>
          <p className="text-sm font-semibold">Slide background</p>
          <p className="text-xs text-muted-foreground">Every slide except the cover. Text switches to white on dark colours.</p>
        </div>
        <WtColorPicker label="Slide background" value={value} onChange={onChange} palette={SWATCHES} size={32} />
      </PopoverContent>
    </Popover>
  )
}
