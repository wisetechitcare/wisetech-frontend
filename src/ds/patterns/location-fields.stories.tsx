import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
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
const TOWNS = [
  { value: 't1', label: 'Andheri' },
  { value: 't2', label: 'Bandra' },
]

const EMPTY: LocationFieldsValue = {
  countryId: 'IN',
  stateId: '',
  cityId: '',
  townId: '',
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
        townOptions={TOWNS}
        timezoneOptions={[{ value: 'Asia/Kolkata', label: 'Asia/Kolkata' }]}
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
  args: {
    value: EMPTY,
    onChange: fn(),
    countryOptions: COUNTRIES,
    stateOptions: STATES,
    cityOptions: CITIES,
    townOptions: TOWNS,
  },
  render: () => <Demo />,
} satisfies Meta<typeof LocationFields>

export default meta
type Story = StoryObj<typeof meta>

/** Head-office / branch location: searchable geo, address reuse, coordinate helpers. */
export const HeadOffice: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Use Registered Address' }))
    await expect(canvas.getByLabelText('Branch Address')).toHaveValue(
      '12 Example Road, Andheri West, Mumbai 400053',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Get Coordinates From Address' }))
    await expect(canvas.getByLabelText('Latitude')).toHaveValue('19.1197')
  },
}
