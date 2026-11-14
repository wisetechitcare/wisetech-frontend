import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ds/ui/input-group"
import type { InputSize } from "@/ds/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

/**
 * A password. The control only — wrap it in `Field` + `FieldLabel` like every field (the label floats).
 *
 * - **Reveal toggle** with the kit Tooltip; a 32px target (WCAG 2.5.8) and `aria-pressed`, so assistive tech
 *   hears the state. Revealing never changes the value or moves the caret.
 * - **Caps Lock notice** while Caps Lock is on, announced politely. Read from the key event's modifier
 *   state, so it is right from the first keystroke.
 * - **`autoComplete` is required**: `current-password` to sign in, `new-password` when choosing one. Password
 *   managers and the browser's strong-password generator key on it; `off` (what the live screens had) blocks
 *   both and pushes people to weak, reused passwords.
 * - Paste is never blocked.
 */
export function PasswordField({
  id,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  autoComplete,
  invalid,
  disabled,
  required,
  "aria-describedby": describedBy,
  className,
  inputRef,
  size = "default",
}: {
  id: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  autoComplete: "current-password" | "new-password"
  invalid?: boolean
  disabled?: boolean
  required?: boolean
  "aria-describedby"?: string
  className?: string
  inputRef?: React.Ref<HTMLInputElement>
  /** Input's control size: `lg` (44px) where the form is the whole page, e.g. sign-in. */
  size?: InputSize
}) {
  const [revealed, setRevealed] = React.useState(false)
  const [capsLock, setCapsLock] = React.useState(false)
  const capsId = `${id}-caps`

  const readCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // getModifierState is absent on some synthetic events (e.g. autofill); leave the state as it was.
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"))
  }

  const label = revealed ? "Hide password" : "Show password"
  const describedByIds = [describedBy, capsLock ? capsId : undefined].filter(Boolean).join(" ") || undefined

  return (
    <InputGroup className={className} size={size} data-disabled={disabled || undefined}>
      <InputGroupInput
        id={id}
        size={size}
        ref={inputRef}
        name={name}
        type={revealed ? "text" : "password"}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={(e) => {
          setCapsLock(false)
          onBlur?.(e)
        }}
        onKeyDown={readCapsLock}
        onKeyUp={readCapsLock}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedByIds}
      />
      <InputGroupAddon align="inline-end">
        {capsLock && (
          <span id={capsId} role="status" aria-live="polite" className="text-xs font-medium whitespace-nowrap text-warning-foreground">
            Caps Lock is on
          </span>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton
                size="icon-sm"
                aria-label={label}
                aria-pressed={revealed}
                aria-controls={id}
                disabled={disabled}
                onClick={() => setRevealed((r) => !r)}
              />
            }
          >
            {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  )
}
