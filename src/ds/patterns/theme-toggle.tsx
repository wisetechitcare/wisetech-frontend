import { Moon, Sun } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

/**
 * Light / dark switch: an icon button (the Tooltip story's recipe — outline, icon size) named by the kit
 * Tooltip and `aria-label`, with `aria-pressed` for the dark state. Presentational: the app owns the theme
 * (pass `mode` and `onToggle` from its colour-mode state).
 */
export function ThemeToggle({
  mode,
  onToggle,
  className,
}: {
  mode: "light" | "dark"
  onToggle: () => void
  className?: string
}) {
  const label = mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={label}
            aria-pressed={mode === "dark"}
            onClick={onToggle}
            className={className}
          />
        }
      >
        {mode === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
