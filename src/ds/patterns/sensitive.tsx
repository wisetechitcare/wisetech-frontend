import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Toggle } from "@/ds/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

type Ctx = {
  /** True when amounts are readable. Always true while the provider is `disabled`. */
  visible: boolean
  setVisible: (v: boolean) => void
  toggle: () => void
  /** True inside a real provider; lets a nested provider defer to the outer one. */
  provided: boolean
}

const SensitiveContext = React.createContext<Ctx>({
  visible: true,
  setVisible: () => undefined,
  toggle: () => undefined,
  provided: false,
})

/**
 * Read the eye's state, for code that must branch on it (a chart that hides its values, an export that
 * masks a column). Without a provider `visible` is true and `provided` false: nothing is hidden.
 */
export function useSensitive(): Ctx {
  return React.useContext(SensitiveContext)
}

/**
 * One eye switch hides every amount on a screen (salary, reimbursements, loans). Replaces the live
 * `SensitiveData` provider. Opt-in: with no provider nothing is hidden.
 *
 * Nested inside another provider it defers: there is ONE switch and it governs every figure below it. A
 * second provider would shadow the outer one and leave the eye in the tab bar controlling nothing.
 */
export function SensitiveProvider({
  children,
  defaultVisible = false,
  disabled = false,
}: {
  children: React.ReactNode
  /** Screens showing one's own data may open revealed. */
  defaultVisible?: boolean
  /**
   * Hide nothing, as if there were no provider. For a page-level provider above tabs where only SOME tabs
   * offer the eye: a tab without a switch must not blur figures it gives the reader no way to reveal. The
   * toggle's state is kept while disabled, so returning to an eye tab finds it as it was left.
   */
  disabled?: boolean
}) {
  const parent = React.useContext(SensitiveContext)
  const [visible, setVisible] = React.useState(defaultVisible)
  const toggle = React.useCallback(() => setVisible((v) => !v), [])

  // A disabled provider is still a provider: nested ones keep deferring and the tree shape never changes
  // between tabs (which would remount them). It just reports everything as shown.
  const value = React.useMemo<Ctx>(
    () => ({ visible: disabled || visible, setVisible, toggle, provided: true }),
    [visible, disabled, toggle],
  )

  if (parent.provided) return <>{children}</>
  return <SensitiveContext.Provider value={value}>{children}</SensitiveContext.Provider>
}

/**
 * The eye switch: "Show amounts", pressed while they are shown (the state is announced).
 *
 * `variant="onPrimary"` is for the primary-coloured sticky tab bar (`PageTabs` `headerAction`), where the
 * outline button would vanish: a frosted fill like the bar's tabs, a ring while amounts show, and on a
 * phone the label drops so it is an icon square beside the tabs (the tooltip and screen readers keep it).
 */
export function SensitiveToggle({
  className,
  variant = "default",
}: {
  className?: string
  variant?: "default" | "onPrimary"
}) {
  const { visible, toggle, provided } = useSensitive()
  if (!provided) return null

  if (variant === "onPrimary") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              pressed={visible}
              onPressedChange={toggle}
              className={cn(
                // Alpha of the bar's own ink (primary-foreground), as the bar's tabs use: ON = the selected tab's
                // frosted fill plus a ring, OFF = a quiet fill like an unselected tab on hover.
                "h-[34px] shrink-0 gap-2 rounded-lg px-3.5 text-[13px] leading-none font-semibold",
                "bg-primary-foreground/8 text-primary-foreground/90 hover:bg-primary-foreground/14 hover:text-primary-foreground",
                "aria-pressed:border-transparent aria-pressed:bg-primary-foreground/16 aria-pressed:text-primary-foreground aria-pressed:shadow-[inset_0_0_0_1.5px_color-mix(in_oklch,var(--primary-foreground)_75%,transparent)] aria-pressed:hover:bg-primary-foreground/20 aria-pressed:hover:text-primary-foreground",
                "focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-primary-foreground/70",
                // Phone: a 36px cell matching the bar's phone tabs, glyph a little larger, no label.
                "max-sm:size-[36px] max-sm:min-w-0 max-sm:rounded-[10px] max-sm:bg-primary-foreground/10 max-sm:px-0 max-sm:aria-pressed:bg-primary-foreground/18 max-sm:aria-pressed:shadow-none",
                className,
              )}
            />
          }
        >
          {visible ? <Eye aria-hidden className="size-[17px] max-sm:size-[20px]" /> : <EyeOff aria-hidden className="size-[17px] max-sm:size-[20px]" />}
          <span className="max-sm:sr-only">Show amounts</span>
        </TooltipTrigger>
        {/* Constant, like the accessible name: a flipping tooltip next to a fixed label contradicts aria-pressed. */}
        <TooltipContent>Show amounts</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={visible}
      onPressedChange={toggle}
      className={className}
    >
      {visible ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
      Show amounts
    </Toggle>
  )
}

/**
 * A figure that hides with the eye switch. Hidden values are replaced for assistive tech too (the blur is
 * only visual), so a screen reader never reads out a salary the user chose to hide.
 */
export function SensitiveValue({ children, className }: { children: React.ReactNode; className?: string }) {
  const { visible } = useSensitive()
  if (visible) return <span className={className}>{children}</span>
  return (
    <span className={cn("relative inline-block", className)}>
      <span aria-hidden className="select-none blur-sm">{children}</span>
      <span className="sr-only">Hidden</span>
    </span>
  )
}
