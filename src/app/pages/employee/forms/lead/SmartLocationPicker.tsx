import React, { useMemo } from "react";
import { useFormikContext } from "formik";

import {
  SmartLocationPicker as SharedSmartLocationPicker,
  LocationOption,
} from "../shared/SmartLocationPicker";

/**
 * Lead adapter for the shared Smart Location Picker.
 *
 * The lead captures MANY addresses (a `addresses[]` FieldArray, with per-row
 * state/city option lists parked on `addressStatesOptions[i]` /
 * `addressCitiesOptions[i]`), so this maps that row-indexed shape onto the
 * module-agnostic field-path contract the shared picker takes. Behaviour is
 * unchanged — the map, search, geocoding and pincode lookup all live in the
 * shared component, which the Contact and Company forms mount the same way.
 */
interface SmartLocationPickerProps {
  index: number;
  countryOptions: LocationOption[];
  handleAddressCountryChange: (index: number, countryId: any, setFieldValue: any) => void;
  handleAddressStateChange: (index: number, stateId: any, countryId: any, setFieldValue: any) => void;
}

export const SmartLocationPicker: React.FC<SmartLocationPickerProps> = ({
  index,
  countryOptions,
  handleAddressCountryChange,
  handleAddressStateChange,
}) => {
  const { values, setFieldValue } = useFormikContext<any>();

  const addressPath = `addresses.${index}`;
  const addressData = values.addresses?.[index] || {};

  const stateOptions = useMemo<LocationOption[]>(
    () => (values.addressStatesOptions?.[index] || []).map((s: any) => ({ value: s.id, label: s.name })),
    [values.addressStatesOptions, index],
  );
  const cityOptions = useMemo<LocationOption[]>(
    () => (values.addressCitiesOptions?.[index] || []).map((c: any) => ({ value: c.id, label: c.name })),
    [values.addressCitiesOptions, index],
  );

  return (
    <SharedSmartLocationPicker
      uid={`lead-${index}`}
      fields={{
        address: `${addressPath}.projectAddress`,
        locality: `${addressPath}.locality`,
        pincode: `${addressPath}.pincode`,
        latitude: `${addressPath}.latitude`,
        longitude: `${addressPath}.longitude`,
        mapLink: `${addressPath}.googleMapLink`,
        country: `${addressPath}.country`,
        state: `${addressPath}.state`,
        city: `${addressPath}.city`,
      }}
      countryOptions={countryOptions}
      stateOptions={stateOptions}
      cityOptions={cityOptions}
      onCountryChange={(countryId) => handleAddressCountryChange(index, countryId, setFieldValue)}
      onStateChange={(stateId) => handleAddressStateChange(index, stateId, addressData.country, setFieldValue)}
    />
  );
};

export default SmartLocationPicker;
