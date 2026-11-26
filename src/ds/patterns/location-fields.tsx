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
  townId: string
  postalCode: string
  address: string
  latitude: string
  longitude: string
  timezone?: string
  currency?: string
}

export type LocationFieldsErrors = Partial<Record<keyof LocationFieldsValue, string>>

/**
 * Shared head-office / branch location block: geo picks, address (with optional reuse),
 * coordinates + geocode / current-location helpers. Controlled — callers own API fetches.
 *
 * Used by platform Create Tenant and HRMS Branches so address/coords UX stays one recipe.
 */
export function LocationFields({
  value,
  onChange,
  countryOptions,
  stateOptions,
  cityOptions = [],
  townOptions,
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
  onCreateTown,
  createTownLabel,
  geoBusy = false,
  geoMessage = '',
  onGeocodeFromAddress,
  onUseCurrentLocation,
  showTimezone = false,
  showCurrency = false,
  className,
}: {
  value: LocationFieldsValue
  onChange: (patch: Partial<LocationFieldsValue>) => void
  countryOptions: LocationOption[]
  stateOptions: LocationOption[]
  cityOptions?: LocationOption[]
  townOptions: LocationOption[]
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
  onCreateTown?: (name: string) => void | Promise<void>
  createTownLabel?: (q: string) => string
  geoBusy?: boolean
  geoMessage?: string
  onGeocodeFromAddress?: () => void
  onUseCurrentLocation?: () => void
  showTimezone?: boolean
  showCurrency?: boolean
  className?: string
}) {
  const reuse = (reuseAddress ?? '').trim()
  const address = value.address.trim()
  const showReuse = Boolean(reuse && reuse !== address && onReuseAddress)

  return (
    <FieldGroup className={cn('gap-5', className)}>
      <Field data-invalid={errors?.address || undefined}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <FieldLabel htmlFor="loc-address">Branch Address</FieldLabel>
          {showReuse ? (
            <Button type="button" size="sm" variant="outline" onClick={onReuseAddress}>
              {reuseAddressLabel}
            </Button>
          ) : null}
        </div>
        <Textarea
          id="loc-address"
          required
          maxLength={addressMaxLength}
          value={value.address}
          placeholder="Street, area, landmark"
          aria-invalid={errors?.address ? true : undefined}
          onChange={(e) => onChange({ address: e.target.value })}
        />
        <FieldDescription>
          {value.address.length}/{addressMaxLength} characters. Used for map coordinate lookup.
          {reuse && reuse === address ? ' Same as the organization address.' : null}
        </FieldDescription>
        {errors?.address ? <FieldError>{errors.address}</FieldError> : null}
      </Field>

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
        <SearchSelect
          id="loc-town"
          label="Town"
          required
          value={value.townId || null}
          error={errors?.townId}
          options={townOptions}
          onValueChange={(v) => onChange({ townId: v ?? '' })}
          onCreate={onCreateTown}
          createLabel={createTownLabel}
        />
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
          {errors?.postalCode ? <FieldError>{errors.postalCode}</FieldError> : null}
        </Field>
        {showTimezone && timezoneOptions ? (
          <SearchSelect
            id="loc-timezone"
            label="Timezone"
            required
            value={value.timezone || null}
            error={errors?.timezone}
            options={timezoneOptions}
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
          Look up the address, or use the device location (also sets timezone when available).
        </FieldDescription>
      )}
    </FieldGroup>
  )
}
