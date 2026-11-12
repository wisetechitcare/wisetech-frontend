import * as React from "react"
import { defaultCountries, FlagImage, parseCountry, usePhoneInput, type CountryIso2, type ParsedCountry } from "react-international-phone"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/ds/ui/combobox"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ds/ui/input-group"

const COUNTRIES = defaultCountries.map(parseCountry)

/**
 * The country's flag as an image — the same flags (react-international-phone's FlagImage, Twemoji SVGs) the
 * live WtPhoneField shows. Emoji flags were tried first and render as letters ("IN", "AE") on Windows.
 * Decorative: the country name and dial code next to it carry the meaning.
 */
function Flag({ iso2, size = 20 }: { iso2: string; size?: number }) {
  return <FlagImage iso2={iso2} size={`${size}px`} alt="" aria-hidden className="shrink-0" />
}

/** An example number in the country's own grouping ("50 123 4567"), shown as the placeholder hint. */
function example(format: unknown) {
  if (typeof format !== "string") return undefined
  let n = 0
  return format.replace(/\./g, () => String((n++ % 9) + 1))
}

/**
 * An international phone number: country picker (flag, searchable by name or dial code) + a number that formats as you
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
  const anchor = useComboboxAnchor()
  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
    defaultCountry,
    value,
    countries: defaultCountries,
    disableDialCodeAndPrefix: true,
    onChange: (data) => onChange?.(data.phone, data.country),
  })

  // Built once per chosen country (a new array each render would reset the combobox's filtering).
  const countries = React.useMemo(() => [country, ...COUNTRIES.filter((c) => c.iso2 !== country.iso2)], [country])

  return (
    <InputGroup ref={anchor} className={className} data-disabled={disabled || undefined}>
      <InputGroupAddon>
        {/* The country list IS the kit Combobox (search in the popup, highlighted and chosen rows, check,
            flipping arrow) — inherited, not rebuilt. The list opens under the whole field. */}
        <Combobox
          items={countries}
          value={country}
          onValueChange={(c: ParsedCountry | null) => c && setCountry(c.iso2, { focusOnInput: true })}
          itemToStringLabel={(c: ParsedCountry | null) => c?.name ?? ""}
          isItemEqualToValue={(a: ParsedCountry, b: ParsedCountry) => a.iso2 === b.iso2}
          filter={(c: ParsedCountry, query: string) => {
            const q = query.trim().toLowerCase().replace(/^\+/, "")
            return !q || c.name.toLowerCase().includes(q) || c.dialCode.startsWith(q) || c.iso2 === q
          }}
          disabled={disabled}
        >
          <ComboboxTrigger
            render={
              <InputGroupButton
                variant="ghost"
                size="sm"
                // Flag and code as one group, nothing drawn around them: no fill, no hover box. The code takes
                // the input's typography so "+971 50 123 4567" reads as one number; only keyboard focus shows
                // an outline (required for accessibility).
                className="gap-2 border-0 pr-0 pl-1 tracking-normal hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
              />
            }
            // On the trigger itself (it sets its own default name): starts with the visible text, so voice
            // control ("click +91") finds it.
            aria-label={`+${country.dialCode} ${country.name}, country code`}
          >
            <Flag iso2={country.iso2} />
            <span className="tabular text-base font-normal text-muted-foreground md:text-sm">+{country.dialCode}</span>
          </ComboboxTrigger>
          <ComboboxContent anchor={anchor} align="start" className="w-80">
            <ComboboxInput showTrigger={false} placeholder="Search country or code" />
            <ComboboxEmpty>No country found.</ComboboxEmpty>
            <ComboboxList>
              {(c: ParsedCountry) => (
                <ComboboxItem key={c.iso2} value={c}>
                  <Flag iso2={c.iso2} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="tabular w-12 text-right text-muted-foreground">+{c.dialCode}</span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {/* Separator between the flag + code group and the number. Every gap in the row is the same 8px: flag ·
            code · arrow · separator · number (the addon's gap-2 on the left, the input's pl-2 on the right). */}
        <span aria-hidden data-slot="phone-field-separator" className="h-5 w-px shrink-0 bg-border" />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        ref={inputRef}
        type="tel"
        autoComplete="tel-national"
        value={inputValue}
        onChange={handlePhoneValueChange}
        disabled={disabled}
        placeholder={example(country.format)}
        className="pl-2!"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
    </InputGroup>
  )
}
