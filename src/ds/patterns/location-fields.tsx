'use client'

import * as React from 'react'
import { LocateFixed, MapPin } from 'lucide-react'
import { AutoGrid } from '@/ds/patterns/auto-grid'
import { SearchSelect, type SearchSelectOption } from '@/ds/patterns/search-select'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Spinner } from '@/ds/ui/spinner'
import { Textarea } from '@/ds/ui/textarea'
import { cn } from '@/ds/lib/utils'

export type LocationOption = SearchSelectOption

export type LocationFieldsValue = {
  countryId: string
  stateId: string
  /** City name (or id when the caller stores ids). */
  cityId: string
  postalCode: string
  address: string
  latitude: string
  longitude: string
  timezone?: string
  currency?: string
}

export type LocationFieldsErrors = Partial<Record<keyof LocationFieldsValue, string>>

/** Nominatim / Places suggestion shaped for structured fill (provider-agnostic). */
export type AddressSuggestion = {
  id: string
  label: string
  address: string
  postalCode?: string
  latitude: string
  longitude: string
  countryName?: string
  stateName?: string
  cityName?: string
  locality?: string
}

const SUGGEST_DEBOUNCE_MS = 450
const SUGGEST_MIN_CHARS = 3

function matchOption(options: LocationOption[], name: string | undefined): string | null {
  if (!name?.trim()) return null
  const n = name.trim().toLowerCase()
  const exact = options.find((o) => o.label.toLowerCase() === n || o.value.toLowerCase() === n)
  if (exact) return exact.value
  const partial = options.find(
    (o) => o.label.toLowerCase().includes(n) || n.includes(o.label.toLowerCase()),
  )
  return partial?.value ?? null
}

/**
 * Shared head-office / branch location block: address typeahead, geo picks,
 * coordinates + geocode / current-location helpers. Controlled — callers own API fetches.
 *
 * Used by platform Create Tenant, HRMS Branches, and sub-org create (`registeredAddressOnly`)
 * so address UX stays one recipe. Town master lists are intentionally absent
 * (top-SaaS: locality lives in the address line).
 */
export function LocationFields({
  value,
  onChange,
  countryOptions = [],
  stateOptions = [],
  cityOptions = [],
  timezoneOptions,
  errors,
  addressMaxLength = 300,
  postalCodeMaxLength = 10,
  cityMode = 'select',
  currencyMode = 'text',
  currencyOptions = [],
  reuseAddressLabel = 'Use Organization Address',
  reuseAddress,
  onReuseAddress,
  suggestAddress,
  geoBusy = false,
  geoMessage = '',
  onGeocodeFromAddress,
  onUseCurrentLocation,
  showTimezone = false,
  showCurrency = false,
  /**
   * Org registered address only (sub-org create): address typeahead, no country/coords.
   * Full HO / branch forms leave this false and use the geo cascade.
   */
  registeredAddressOnly = false,
  addressLabel = 'Branch Address',
  className,
}: {
  value: LocationFieldsValue
  onChange: (patch: Partial<LocationFieldsValue>) => void
  countryOptions?: LocationOption[]
  stateOptions?: LocationOption[]
  cityOptions?: LocationOption[]
  timezoneOptions?: LocationOption[]
  currencyOptions?: LocationOption[]
  errors?: LocationFieldsErrors
  addressMaxLength?: number
  postalCodeMaxLength?: number
  /** Branches store city as free text; Create Tenant picks from geo cities. */
  cityMode?: 'select' | 'text'
  currencyMode?: 'text' | 'select'
  reuseAddressLabel?: string
  reuseAddress?: string
  onReuseAddress?: () => void
  /**
   * Debounced address typeahead. Return provider results (Nominatim today; Places later).
   * When omitted, only manual entry + Get Coordinates is available.
   */
  suggestAddress?: (query: string) => Promise<AddressSuggestion[]>
  geoBusy?: boolean
  geoMessage?: string
  onGeocodeFromAddress?: () => void
  onUseCurrentLocation?: () => void
  showTimezone?: boolean
  showCurrency?: boolean
  registeredAddressOnly?: boolean
  /** Field label for the address textarea (org create uses "Organization Address"). */
  addressLabel?: string
  className?: string
}) {
  const reuse = (reuseAddress ?? '').trim()
  /** Never hand SearchSelect a timezone row object as label/value (React child crash). */
  const safeTimezoneOptions = React.useMemo(() => {
    if (!timezoneOptions?.length) return timezoneOptions
    return timezoneOptions.map((raw) => {
      const o = raw as LocationOption & { name?: string; utcOffsetStr?: string }
      if (typeof o.value === 'string' && typeof o.label === 'string') return o
      const name =
        (typeof o.name === 'string' && o.name.trim()) ||
        (typeof o.value === 'string' && o.value.trim()) ||
        ''
      if (!name) return { value: '', label: '' }
      const offset =
        typeof o.utcOffsetStr === 'string' && o.utcOffsetStr ? `(UTC${o.utcOffsetStr}) ` : ''
      return { value: name, label: `${offset}${name}` }
    })
  }, [timezoneOptions])
  const address = value.address.trim()
  const showReuse = Boolean(reuse && reuse !== address && onReuseAddress)

  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([])
  const [suggestBusy, setSuggestBusy] = React.useState(false)
  const [suggestOpen, setSuggestOpen] = React.useState(false)
  const suggestSeq = React.useRef(0)

  React.useEffect(() => {
    if (!suggestAddress) {
      setSuggestions([])
      setSuggestOpen(false)
      return
    }
    const q = value.address.trim()
    if (q.length < SUGGEST_MIN_CHARS) {
      setSuggestions([])
      setSuggestOpen(false)
      return
    }
    const seq = ++suggestSeq.current
    const t = window.setTimeout(() => {
      setSuggestBusy(true)
      void suggestAddress(q)
        .then((rows) => {
          if (seq !== suggestSeq.current) return
          setSuggestions(rows)
          setSuggestOpen(rows.length > 0)
        })
        .catch(() => {
          if (seq !== suggestSeq.current) return
          setSuggestions([])
          setSuggestOpen(false)
        })
        .finally(() => {
          if (seq === suggestSeq.current) setSuggestBusy(false)
        })
    }, SUGGEST_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [value.address, suggestAddress])

  function applySuggestion(s: AddressSuggestion) {
    suggestSeq.current += 1
    setSuggestions([])
    setSuggestOpen(false)
    setSuggestBusy(false)

    if (registeredAddressOnly) {
      onChange({ address: s.address.slice(0, addressMaxLength) })
      return
    }

    const patch: Partial<LocationFieldsValue> = {
      address: s.address.slice(0, addressMaxLength),
      latitude: s.latitude,
      longitude: s.longitude,
    }
    if (s.postalCode) patch.postalCode = s.postalCode.slice(0, postalCodeMaxLength)

    const countryValue = matchOption(countryOptions, s.countryName)
    if (countryValue && countryValue !== value.countryId) {
      // Country change clears state/city in the country onValueChange path when user picks;
      // here we set country + best-effort city name; parent loads states asynchronously.
      patch.countryId = countryValue
      patch.stateId = ''
      patch.cityId = cityMode === 'text' ? (s.cityName ?? s.locality ?? '') : ''
    } else {
      const stateValue = matchOption(stateOptions, s.stateName)
      if (stateValue) {
        patch.stateId = stateValue
        if (cityMode === 'select') {
          const cityValue = matchOption(cityOptions, s.cityName ?? s.locality)
          if (cityValue) patch.cityId = cityValue
          else if (s.cityName) patch.cityId = s.cityName
        } else if (s.cityName || s.locality) {
          patch.cityId = s.cityName ?? s.locality ?? ''
        }
      } else if (cityMode === 'text' && (s.cityName || s.locality)) {
        patch.cityId = s.cityName ?? s.locality ?? ''
      } else if (cityMode === 'select') {
        const cityValue = matchOption(cityOptions, s.cityName ?? s.locality)
        if (cityValue) patch.cityId = cityValue
      }
    }

    onChange(patch)
  }

  return (
    <FieldGroup className={cn('gap-5', className)}>
      <Field data-invalid={errors?.address || undefined}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <FieldLabel htmlFor="loc-address">{addressLabel}</FieldLabel>
          {showReuse ? (
            <Button type="button" size="sm" variant="outline" onClick={onReuseAddress}>
              {reuseAddressLabel}
            </Button>
          ) : null}
        </div>
        <div className="relative">
          <Textarea
            id="loc-address"
            required
            maxLength={addressMaxLength}
            value={value.address}
            placeholder="Start typing an address — pick a suggestion, or paste and look up coordinates"
            aria-invalid={errors?.address ? true : undefined}
            aria-autocomplete={suggestAddress ? 'list' : undefined}
            aria-expanded={suggestAddress ? suggestOpen : undefined}
            aria-controls={suggestAddress ? 'loc-address-suggestions' : undefined}
            onChange={(e) => onChange({ address: e.target.value })}
            onBlur={() => {
              // Allow click on suggestion before closing.
              window.setTimeout(() => setSuggestOpen(false), 150)
            }}
            onFocus={() => {
              if (suggestions.length) setSuggestOpen(true)
            }}
          />
          {suggestOpen && suggestions.length > 0 ? (
            <ul
              id="loc-address-suggestions"
              role="listbox"
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
            >
              {suggestions.map((s) => (
                <li key={s.id} role="option">
                  <button
                    type="button"
                    className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(s)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <FieldDescription>
          {value.address.length}/{addressMaxLength} characters
          {registeredAddressOnly
            ? suggestAddress
              ? '. Suggestions from OpenStreetMap (Nominatim).'
              : '.'
            : suggestAddress
              ? '. Suggestions from OpenStreetMap (Nominatim).'
              : '. Used for map coordinate lookup.'}
          {reuse && reuse === address ? ' Same as the organization address.' : null}
          {suggestBusy ? ' Searching…' : null}
        </FieldDescription>
        {errors?.address ? <FieldError>{errors.address}</FieldError> : null}
      </Field>

      {!registeredAddressOnly ? (
        <>
          <AutoGrid min={220} stretch>
            <SearchSelect
              id="loc-country"
              label="Country"
              required
              value={value.countryId || null}
              error={errors?.countryId}
              options={countryOptions}
              onValueChange={(v) =>
                onChange({
                  countryId: v ?? '',
                  // Preserve address / coords / postal — only reset dependent geo picks.
                  stateId: '',
                  cityId: '',
                })
              }
            />
            <SearchSelect
              id="loc-state"
              label="State"
              required
              disabled={!value.countryId}
              value={value.stateId || null}
              error={errors?.stateId}
              options={stateOptions}
              onValueChange={(v) =>
                onChange({
                  stateId: v ?? '',
                  cityId: '',
                })
              }
            />
            {cityMode === 'select' ? (
              <SearchSelect
                id="loc-city"
                label="City"
                required
                disabled={!value.stateId}
                value={value.cityId || null}
                error={errors?.cityId}
                options={cityOptions}
                onValueChange={(v) => onChange({ cityId: v ?? '' })}
              />
            ) : (
              <Field data-invalid={errors?.cityId || undefined}>
                <FieldLabel htmlFor="loc-city">City</FieldLabel>
                <Input
                  id="loc-city"
                  required
                  value={value.cityId}
                  aria-invalid={errors?.cityId ? true : undefined}
                  onChange={(e) => onChange({ cityId: e.target.value })}
                />
                {errors?.cityId ? <FieldError>{errors.cityId}</FieldError> : null}
              </Field>
            )}
            <Field data-invalid={errors?.postalCode || undefined}>
              <FieldLabel htmlFor="loc-postal">Postal Code</FieldLabel>
              <Input
                id="loc-postal"
                required
                inputMode="numeric"
                maxLength={postalCodeMaxLength}
                value={value.postalCode}
                aria-invalid={errors?.postalCode ? true : undefined}
                onChange={(e) => onChange({ postalCode: e.target.value })}
              />
              <FieldDescription>
                International label — for India use the 6-digit PIN.
              </FieldDescription>
              {errors?.postalCode ? <FieldError>{errors.postalCode}</FieldError> : null}
            </Field>
            {showTimezone && safeTimezoneOptions ? (
              <SearchSelect
                id="loc-timezone"
                label="Timezone"
                required
                value={value.timezone || null}
                error={errors?.timezone}
                options={safeTimezoneOptions}
                onValueChange={(v) => onChange({ timezone: v ?? '' })}
              />
            ) : null}
            {showCurrency && currencyMode === 'select' ? (
              <SearchSelect
                id="loc-currency"
                label="Currency"
                value={value.currency || null}
                error={errors?.currency}
                options={currencyOptions}
                onValueChange={(v) => onChange({ currency: v ?? '' })}
              />
            ) : null}
            {showCurrency && currencyMode === 'text' ? (
              <Field data-invalid={errors?.currency || undefined}>
                <FieldLabel htmlFor="loc-currency">Currency</FieldLabel>
                <Input
                  id="loc-currency"
                  required
                  value={value.currency ?? ''}
                  aria-invalid={errors?.currency ? true : undefined}
                  onChange={(e) => onChange({ currency: e.target.value })}
                />
                {errors?.currency ? <FieldError>{errors.currency}</FieldError> : null}
              </Field>
            ) : null}
          </AutoGrid>

          <AutoGrid min={220} stretch>
            <Field data-invalid={errors?.latitude || undefined}>
              <FieldLabel htmlFor="loc-lat">Latitude</FieldLabel>
              <Input
                id="loc-lat"
                required
                inputMode="decimal"
                value={value.latitude}
                aria-invalid={errors?.latitude ? true : undefined}
                onChange={(e) => onChange({ latitude: e.target.value })}
              />
              {errors?.latitude ? <FieldError>{errors.latitude}</FieldError> : null}
            </Field>
            <Field data-invalid={errors?.longitude || undefined}>
              <FieldLabel htmlFor="loc-lng">Longitude</FieldLabel>
              <Input
                id="loc-lng"
                required
                inputMode="decimal"
                value={value.longitude}
                aria-invalid={errors?.longitude ? true : undefined}
                onChange={(e) => onChange({ longitude: e.target.value })}
              />
              {errors?.longitude ? <FieldError>{errors.longitude}</FieldError> : null}
            </Field>
          </AutoGrid>

          {(onGeocodeFromAddress || onUseCurrentLocation) && (
            <div className="flex flex-wrap items-center gap-2">
              {onGeocodeFromAddress ? (
                <Button type="button" size="sm" variant="outline" disabled={geoBusy} onClick={onGeocodeFromAddress}>
                  <MapPin data-icon="inline-start" aria-hidden /> Get Coordinates From Address
                </Button>
              ) : null}
              {onUseCurrentLocation ? (
                <Button type="button" size="sm" variant="outline" disabled={geoBusy} onClick={onUseCurrentLocation}>
                  <LocateFixed data-icon="inline-start" aria-hidden /> Use My Current Location
                </Button>
              ) : null}
              {geoBusy ? <Spinner className="size-4" aria-hidden /> : null}
            </div>
          )}
          {geoMessage ? (
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {geoMessage}
            </p>
          ) : (
            <FieldDescription>
              Pick a suggestion or look up the address — device location also sets timezone when available.
            </FieldDescription>
          )}
        </>
      ) : null}
    </FieldGroup>
  )
}
