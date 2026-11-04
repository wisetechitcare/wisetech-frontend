"use client"

import * as React from "react"
import {
  FieldErrorContext,
  LabelContext,
  TextContext,
  useContextProps,
  type ValidationResult,
} from "react-aria-components"

import { FieldDescription, FieldError, FieldLabel } from "@/ds/ui/field"
import { InputGroup } from "@/ds/ui/input-group"

// The kit's React Aria fields (date-field, date-picker, number-field) wear shadcn's own parts: each
// adapter takes the ids and aria wiring React Aria puts in its context and renders the shadcn
// component, so a React Aria field and a Base UI field share every class with no copy to drift.
// Only plain-DOM shadcn parts are reused here — never a Base UI one inside a React Aria field.

type FieldChromeProps = {
  label?: React.ReactNode
  description?: React.ReactNode
  /** Overrides the built-in validation message (e.g. "Value must be 01/04/2026 or later"). */
  errorMessage?: React.ReactNode | ((validation: ValidationResult) => React.ReactNode)
}

/** React Aria context props that are not DOM attributes. */
function domProps<T extends object>(props: T): Omit<T, "elementType" | "slot"> {
  const rest = { ...props } as T & { elementType?: unknown; slot?: unknown }
  delete rest.elementType
  delete rest.slot
  return rest
}

function AriaFieldLabel({ children }: { children: React.ReactNode }) {
  const [props, ref] = useContextProps({ children }, undefined, LabelContext)
  return <FieldLabel {...domProps(props)} ref={ref} />
}

function AriaFieldDescription({ children }: { children: React.ReactNode }) {
  const [props, ref] = useContextProps({ children, slot: "description" }, undefined, TextContext)
  return <FieldDescription {...domProps(props)} ref={ref as React.Ref<HTMLParagraphElement>} />
}

function AriaFieldError({ errorMessage }: Pick<FieldChromeProps, "errorMessage">) {
  const validation = React.useContext(FieldErrorContext)
  const [props, ref] = useContextProps({ slot: "errorMessage" }, undefined, TextContext)
  if (!validation?.isInvalid) return null
  const message =
    typeof errorMessage === "function"
      ? errorMessage(validation)
      : (errorMessage ?? validation.validationErrors.join(" "))
  // shadcn's FieldError is role="alert", so the message is announced when it appears.
  return (
    <FieldError {...domProps(props)} ref={ref as React.Ref<HTMLDivElement>}>
      {message}
    </FieldError>
  )
}

/** Label, control, description and error in field.tsx's order. Needs an ancestor KitProvider (locale). */
function FieldChrome({
  label,
  description,
  errorMessage,
  children,
}: FieldChromeProps & { children: React.ReactNode }) {
  return (
    <>
      {label && <AriaFieldLabel>{label}</AriaFieldLabel>}
      {children}
      {description && <AriaFieldDescription>{description}</AriaFieldDescription>}
      <AriaFieldError errorMessage={errorMessage} />
    </>
  )
}

/**
 * shadcn's InputGroup pill around a React Aria control, visual only: the React Aria element inside
 * keeps the group role and labels. Its rings key on descendants, so a text control inside must carry
 * data-slot="input-group-control" (focus) and React Aria's aria-invalid (error).
 */
function AriaInputGroup(props: React.ComponentProps<typeof InputGroup>) {
  return <InputGroup role="presentation" {...props} />
}

export { AriaInputGroup, FieldChrome, type FieldChromeProps }
