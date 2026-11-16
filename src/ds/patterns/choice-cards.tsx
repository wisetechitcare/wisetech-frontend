import * as React from "react"
import { titleCase } from "@/ds/lib/text"
import { cn } from "@/ds/lib/utils"
import { Card } from "@/ds/ui/card"
import { RadioGroup, RadioGroupItem } from "@/ds/ui/radio-group"
import { IconBox } from "./icon-box"

export type ChoiceOption<T extends string> = {
  value: T
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
  /** Why it is unavailable — shown under the option, so the user is never left guessing. */
  disabledReason?: string
}

/**
 * Choose one of two to four options that each need a sentence of explanation — payout method, leave
 * session, approval mode. Replaces the live kit's `WtChoice` / `WtChoiceField` (`variant="cards"`); for a
 * bare on/off use Switch, for short labels use ToggleGroup. Real radios: arrow keys move, Space selects.
 */
export function ChoiceCards<T extends string>({
  label,
  value,
  defaultValue,
  onValueChange,
  options,
  columns = 2,
  name,
  className,
}: {
  label: string
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
  options: ReadonlyArray<ChoiceOption<T>>
  columns?: 1 | 2 | 3
  name?: string
  className?: string
}) {
  const labelId = React.useId()
  return (
    <div className={cn("grid gap-2", className)}>
      <p id={labelId} className="text-sm font-medium">
        {titleCase(label)}
      </p>
      <RadioGroup
        aria-labelledby={labelId}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => onValueChange?.(v as T)}
        className={cn("grid gap-3", columns >= 2 && "sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}
      >
        {options.map((o) => {
          const id = `${labelId}-${o.value}`
          return (
            // The option is a card: radio leads (where form controls go), icon tile top-right (the card rule); the
            // label makes the whole card select the radio.
            <label key={o.value} htmlFor={id} className="block">
              <Card
                interactive
                aria-disabled={o.disabled || undefined}
                className="h-full flex-row items-start gap-3 px-(--card-spacing)"
              >
                <RadioGroupItem id={id} value={o.value} disabled={o.disabled} className="mt-0.5" />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block text-sm font-medium">{titleCase(o.label)}</span>
                  {(o.description || (o.disabled && o.disabledReason)) && (
                    <span className="block text-sm text-muted-foreground">
                      {o.disabled && o.disabledReason ? o.disabledReason : o.description}
                    </span>
                  )}
                </span>
                {o.icon && <IconBox icon={o.icon} size="lg" />}
              </Card>
            </label>
          )
        })}
      </RadioGroup>
    </div>
  )
}
