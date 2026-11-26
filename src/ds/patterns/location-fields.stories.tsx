import * as React from 'react'
import type { Meta } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { LocationFields, type LocationFieldsValue } from './location-fields'

const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'AE', label: 'United Arab Emirates' },
]
const STATES = [
  { value: 'MH', label: 'Maharashtra' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'DH', label: 'Dadra and Nagar Haveli and Daman and Diu' },
]
const CITIES = [
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Pune', label: 'Pune' },
]

const EMPTY: LocationFieldsValue = {
  countryId: 'IN',
  stateId: '',
  cityId: '',
  postalCode: '',
  address: '',
  latitude: '',
  longitude: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
}

function Demo() {
  const [value, setValue] = React.useState<LocationFieldsValue>({
    ...EMPTY,
    address: '12 Example Road, Andheri West',
  })
  const [geoMessage, setGeoMessage] = React.useState('')
  return (
    <div className="max-w-2xl p-4">
      <LocationFields
        value={value}
        onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
        countryOptions={COUNTRIES}
        stateOptions={STATES}
        cityOptions={CITIES}
        timezoneOptions={[
          { value: 'Asia/Kolkata', label: '(UTC+05:30) Asia/Kolkata' },
          { value: 'Asia/Dubai', label: '(UTC+04:00) Asia/Dubai' },
        ]}
        showTimezone
        showCurrency
        reuseAddress="12 Example Road, Andheri West, Mumbai 400053"
        reuseAddressLabel="Use Registered Address"
        onReuseAddress={() =>
          setValue((v) => ({
            ...v,
            address: '12 Example Road, Andheri West, Mumbai 400053',
          }))
        }
        suggestAddress={async (query) => [
          {
            id: 'demo-1',
            label: `${query} — Mumbai, Maharashtra, India`,
            address: query,
            postalCode: '400053',
            latitude: '19.1197',
            longitude: '72.8468',
            countryName: 'India',
            stateName: 'Maharashtra',
            cityName: 'Mumbai',
            locality: 'Andheri',
          },
        ]}
        geoMessage={geoMessage}
        onGeocodeFromAddress={() => {
          setValue((v) => ({ ...v, latitude: '19.1197', longitude: '72.8468' }))
          setGeoMessage('Coordinates filled from the address.')
        }}
        onUseCurrentLocation={() => {
          setValue((v) => ({ ...v, latitude: '19.0760', longitude: '72.8777' }))
          setGeoMessage('Coordinates set to your current location.')
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Patterns/Location Fields',
  component: LocationFields,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LocationFields>

export default meta

/** Create Tenant / Branches recipe — typeahead + timezone string labels (no Town). */
export const CreateTenantRecipe = {
  render: () => <Demo />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const address = canvasElement.querySelector('#loc-address') as HTMLTextAreaElement
    expect(address).toBeTruthy()
    await userEvent.clear(address)
    await userEvent.type(address, 'FC Road Pune')
    const tz = canvasElement.querySelector('#loc-timezone')
    expect(tz).toBeTruthy()
  },
}

export const Interactive = {
  render: () => <Demo />,
  args: {
    onGeocodeFromAddress: fn(),
  },
}

function RegisteredAddressDemo() {
  const [address, setAddress] = React.useState('12 Example Road, Andheri West')
  return (
    <div className="max-w-2xl p-4">
      <LocationFields
        registeredAddressOnly
        addressLabel="Organization Address"
        addressMaxLength={300}
        value={{
          countryId: '',
          stateId: '',
          cityId: '',
          postalCode: '',
          address,
          latitude: '',
          longitude: '',
        }}
        onChange={(patch) => {
          if (patch.address !== undefined) setAddress(patch.address)
        }}
        suggestAddress={async (query) => [
          {
            id: 'demo-reg-1',
            label: `${query} — Mumbai, Maharashtra, India`,
            address: query,
            latitude: '19.1197',
            longitude: '72.8468',
          },
        ]}
      />
    </div>
  )
}

/** Sub-org create recipe — registered address only (no country / coords cascade). */
export const RegisteredAddressOnly = {
  render: () => <RegisteredAddressDemo />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    expect(canvasElement.querySelector('#loc-address')).toBeTruthy()
    expect(canvasElement.querySelector('#loc-country')).toBeNull()
    expect(canvasElement.querySelector('#loc-timezone')).toBeNull()
  },
}
