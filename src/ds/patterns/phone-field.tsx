import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { defaultCountries, parseCountry, usePhoneInput, type CountryIso2 } from "react-international-phone"
import { cn } from "@/ds/lib/utils"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/ds/ui/command"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ds/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/ds/ui/popover"

const COUNTRIES = defaultCountries.map(parseCountry)

/** A flag from the two regional-indicator letters — no image download, works offline. */
const flag = (iso2: string) =>
  String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))

/**
 * An international phone number: country picker (searchable, with dial code) + a number that formats as you
 * type. Replaces the live kit's `WtPhoneField`; same engine (`react-international-phone`), v2 look.
 * `onChange` receives E.164 (`+919800000210`) — store that, never the formatted text.
 */
export function PhoneField({
  id,
  value,
  defaultCountry = "in",
  onChange,
  disabled,
  invalid,
  "aria-describedby": describedBy,
  className,
}: {
  id?: string
  /** E.164, e.g. "+919800000210". */
  value?: string
  defaultCountry?: CountryIso2
  onChange?: (phone: string, country: { iso2: string; dialCode: string; name: string }) => void
  disabled?: boolean
  invalid?: boolean
  "aria-describedby"?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
    defaultCountry,
    value,
    countries: defaultCountries,
    disableDialCodeAndPrefix: true,
    onChange: (data) => onChange?.(data.phone, data.country),
  })

  return (
    <InputGroup className={className} data-disabled={disabled || undefined}>
      <InputGroupAddon>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled}
            render={
              <InputGroupButton
                variant="ghost"
                size="sm"
                aria-label={`Country code: ${country.name} +${country.dialCode}`}
              />
            }
          >
            <span aria-hidden>{flag(country.iso2)}</span>
            <span className="tabular">+{country.dialCode}</span>
            <ChevronDown aria-hidden className="text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command>
              <CommandInput placeholder="Search country or code" />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                {COUNTRIES.map((c) => (
                  <CommandItem
                    key={c.iso2}
                    value={`${c.name} +${c.dialCode} ${c.iso2}`}
                    onSelect={() => {
                      setCountry(c.iso2, { focusOnInput: true })
                      setOpen(false)
                    }}
                  >
                    <span aria-hidden>{flag(c.iso2)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular text-muted-foreground">+{c.dialCode}</span>
                    <Check aria-hidden className={cn("size-4", c.iso2 === country.iso2 ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        ref={inputRef}
        type="tel"
        autoComplete="tel-national"
        value={inputValue}
        onChange={handlePhoneValueChange}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
    </InputGroup>
  )
}
