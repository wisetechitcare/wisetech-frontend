import type { ClipboardEvent, KeyboardEvent } from "react"

/**
 * App-wide password clipboard policy (platform console + tenant HRMS).
 *
 * **Do not spread this from screens.** Kit `Input` applies it when `type="password"` or
 * `protectClipboard` (PasswordField reveal). Screens use `PasswordField` / `Input` only.
 *
 * Password-manager autofill still works (it does not fire a paste event).
 */

export function preventPasswordClipboard(e: ClipboardEvent | KeyboardEvent): void {
  e.preventDefault()
}

/** True when the key chord would copy, cut, or paste. */
export function isPasswordClipboardShortcut(e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase()
  if (e.shiftKey && key === "insert") return true
  if (!(e.ctrlKey || e.metaKey)) return false
  return key === "c" || key === "v" || key === "x" || key === "insert"
}

export function onPasswordClipboardEvent(e: ClipboardEvent): void {
  preventPasswordClipboard(e)
}

export function onPasswordClipboardKeyDown(e: KeyboardEvent): void {
  if (isPasswordClipboardShortcut(e)) preventPasswordClipboard(e)
}

/** Spread onto any password (or password-reveal) input. Composes with a caller's `onKeyDown`. */
export function passwordClipboardProps(options?: {
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}): {
  onCopy: (e: ClipboardEvent<HTMLInputElement>) => void
  onCut: (e: ClipboardEvent<HTMLInputElement>) => void
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
} {
  return {
    onCopy: onPasswordClipboardEvent,
    onCut: onPasswordClipboardEvent,
    onPaste: onPasswordClipboardEvent,
    onKeyDown: (e) => {
      onPasswordClipboardKeyDown(e)
      options?.onKeyDown?.(e)
    },
  }
}
