"use client"

import { cn } from "cn"
import { MinusIcon, PlusIcon } from "lucide-react"
import {
  Button,
  Group,
  Input,
  NumberField as AriaNumberField,
  composeRenderProps,
  type NumberFieldProps,
} from "react-aria-components"

import { buttonVariants } from "@/ds/ui/button"
import {
  FieldChrome,
  fieldClassName,
  fieldGroupClassName,
  type FieldChromeProps,
} from "@/ds/ui/date-field"

const stepperClassName = buttonVariants({
  variant: "ghost",
  size: "icon-sm",
  className: "text-muted-foreground",
})

// Formats for the I18nProvider locale (en-IN groups 1,00,000). For money pass
// formatOptions={{ style: "currency", currency: "INR" }}; the value stays a plain number.
// Requires an ancestor I18nProvider (react-aria-components); without one React Aria uses
// navigator.language, so an en-US browser groups 100,000.
function NumberField({
  label,
  description,
  errorMessage,
  placeholder,
  className,
  ...props
}: NumberFieldProps & FieldChromeProps & { placeholder?: string }) {
  return (
    <AriaNumberField
      data-slot="number-field"
      className={composeRenderProps(className, (className) =>
        cn(fieldClassName, className)
      )}
      {...props}
    >
      <FieldChrome
        label={label}
        description={description}
        errorMessage={errorMessage}
      >
        <Group data-slot="number-field-group" className={fieldGroupClassName}>
          <Input
            data-slot="number-field-input"
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-base tabular-nums outline-none placeholder:text-muted-foreground md:text-sm"
          />
          <Button
            slot="decrement"
            data-slot="number-field-decrement"
            className={stepperClassName}
          >
            <MinusIcon />
          </Button>
          <Button
            slot="increment"
            data-slot="number-field-increment"
            className={cn(stepperClassName, "me-0.5")}
          >
            <PlusIcon />
          </Button>
        </Group>
      </FieldChrome>
    </AriaNumberField>
  )
}

export { NumberField }
