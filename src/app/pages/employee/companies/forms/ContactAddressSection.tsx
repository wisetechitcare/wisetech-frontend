import React, { useEffect, useRef } from "react";
import { useFormikContext } from "formik";
import { Typography } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import SmartLocationPicker, {
  GeoPick,
} from "@app/modules/common/components/SmartLocationPicker";
import { CrmSection } from "./CrmSection";
import type { IFormField } from "@models/company";

type Loc = { id: string; name: string; iso2?: string };

type Props = {
  countries: Loc[];
  states: Loc[];
  cities: Loc[];
  selectedCountry: string;
  selectedState: string;
  setSelectedCountry: (id: string) => void;
  setSelectedState: (id: string) => void;
  handleCountryChange: (countryId: string) => void | Promise<void>;
  handleStateChange: (countryId: string, stateId: string) => void | Promise<void>;
  /** Formik names for the fields whose name differs per form (Company uses
   *  addressLine1 / googleMapsLink / gmbProfileUrl). Defaults are the contact's. */
  fields?: { address?: string; googleMapLink?: string; gmbLink?: string };
  /** The host form's Address-section schema, keyed by Formik name. Omit for the default layout. */
  schema?: IFormField[];
  /** Section heading — the schema's section title when the host lets admins rename it. */
  title?: string;
};

const DROPDOWNS = new Set(["country", "state", "city"]);

const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Contact Address step — same SmartLocationPicker + manual override layout as
 * Lead `AddressSection`, wired to the flat contact Formik fields.
 */
export function ContactAddressSection({
  countries,
  states,
  cities,
  selectedCountry,
  selectedState,
  setSelectedCountry,
  setSelectedState,
  handleCountryChange,
  handleStateChange,
  fields = {},
  schema,
  title = "Address",
}: Props) {
  const { values, setFieldValue } = useFormikContext<any>();
  const { address = "address", googleMapLink = "googleMapLink", gmbLink = "gmbLink" } = fields;
  const pendingGeo = useRef<{ state?: string; city?: string } | null>(null);

  const byName = (list: Loc[], name?: string) =>
    name ? list.find((o) => norm(o.name) === norm(name)) : undefined;

  const applyGeoPick = (geo: GeoPick) => {
    setFieldValue("latitude", String(geo.lat));
    setFieldValue("longitude", String(geo.lng));
    setFieldValue(googleMapLink, geo.googleMapLink);
    if (geo.formatted) setFieldValue(address, geo.formatted);
    if (geo.locality) setFieldValue("area", geo.locality);
    if (geo.postcode) setFieldValue("zipCode", geo.postcode);

    const country = byName(countries, geo.country);
    if (country) {
      pendingGeo.current = { state: geo.state, city: geo.city };
      setFieldValue("country", country.id);
      setFieldValue("state", "");
      setFieldValue("city", "");
      setSelectedCountry(country.id);
      setSelectedState("");
      void handleCountryChange(country.id);
    }
  };

  useEffect(() => {
    const pending = pendingGeo.current;
    if (!pending?.state || !states.length) return;
    const match = byName(states, pending.state);
    if (!match || !selectedCountry) return;
    delete pending.state;
    setFieldValue("state", match.id);
    setFieldValue("city", "");
    setSelectedState(match.id);
    void handleStateChange(selectedCountry, match.id);
  }, [states, selectedCountry]);

  useEffect(() => {
    const pending = pendingGeo.current;
    if (!pending?.city || !cities.length) return;
    const match = byName(cities, pending.city);
    if (!match) return;
    delete pending.city;
    pendingGeo.current = null;
    setFieldValue("city", match.id);
  }, [cities]);

  // Parse lat/lng out of a pasted Google Maps link when coords are empty.
  const link = values[googleMapLink];
  useEffect(() => {
    if (link && !values.latitude && !values.longitude) {
      const latLngMatch = String(link).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (latLngMatch) {
        setFieldValue("latitude", latLngMatch[1]);
        setFieldValue("longitude", latLngMatch[2]);
      }
    }
  }, [link, values.latitude, values.longitude, setFieldValue]);


  // Each manual-override input, in default order. With a `schema`, the host form's
  // field settings (label, required, hidden, order) apply; without one this is the
  // contact layout exactly as before.
  const items: { name: string; md: number; render: (label: string | undefined, required: boolean) => React.ReactNode }[] = [
    { name: "country", md: 4, render: (label, required) => (
      <DropDownInput
        formikField="country"
        inputLabel={label || "Country"}
        options={countries.map((c) => ({ label: c.name, value: c.id }))}
        isRequired={required}
        onChange={(option: any) => {
          setFieldValue("country", option?.value || "");
          setFieldValue("state", "");
          setFieldValue("city", "");
          setSelectedCountry(option?.value || "");
          setSelectedState("");
          if (option?.value) void handleCountryChange(option.value);
        }}
        value={selectedCountry ? { label: countries.find((c) => c.id === selectedCountry)?.name || "", value: selectedCountry } : null}
      />
    )},
    { name: "state", md: 4, render: (label, required) => (
      <DropDownInput
        formikField="state"
        inputLabel={label || "State"}
        options={selectedCountry ? states.map((s) => ({ label: s.name, value: s.id })) : []}
        placeholder={!selectedCountry ? "Please select country first" : "Select State"}
        isRequired={required}
        onChange={(option: any) => {
          setFieldValue("state", option?.value || "");
          setFieldValue("city", "");
          setSelectedState(option?.value || "");
          if (option?.value && selectedCountry) void handleStateChange(selectedCountry, option.value);
        }}
        value={selectedState ? { label: states.find((s) => s.id === selectedState)?.name || "", value: selectedState } : null}
      />
    )},
    { name: "city", md: 4, render: (label, required) => (
      <DropDownInput
        formikField="city"
        inputLabel={label || "City"}
        options={
          selectedState
            ? [
                ...cities.map((c) => ({ label: c.name, value: c.id })),
                ...(values.city && !cities.find((c) => c.id === values.city) ? [{ label: values.city, value: values.city }] : []),
              ]
            : []
        }
        placeholder={!selectedState ? "Please select state first" : "Select City"}
        isRequired={required}
        onChange={(option: any) => setFieldValue("city", option?.value || "")}
        value={values.city ? { label: cities.find((c) => c.id === values.city)?.name || values.city, value: values.city } : null}
      />
    )},
    { name: "area", md: 6, render: (label, required) => (
      <TextInput formikField="area" label={label || "Locality"} placeholder="Area / neighbourhood — auto-filled from the map" isRequired={required} />
    )},
    { name: "zipCode", md: 6, render: (label, required) => (
      <TextInput formikField="zipCode" label={label || "Pincode"} isRequired={required} />
    )},
    { name: address, md: 6, render: (label, required) => (
      <TextInput formikField={address} label={label || "Formatted Address"} placeholder="Building, street, landmark" isRequired={required} />
    )},
    { name: "latitude", md: 3, render: (label, required) => (
      <TextInput formikField="latitude" label={label || "Latitude"} isRequired={required} inputValidation="signed-decimal" />
    )},
    { name: "longitude", md: 3, render: (label, required) => (
      <TextInput formikField="longitude" label={label || "Longitude"} isRequired={required} inputValidation="signed-decimal" />
    )},
    { name: googleMapLink, md: 6, render: (label, required) => (
      <TextInput formikField={googleMapLink} label={label || "Google Map Link"} placeholder="https://www.google.com/maps/@19.1234,72.8765,17z" isRequired={required} />
    )},
    { name: gmbLink, md: 6, render: (label, required) => (
      <TextInput formikField={gmbLink} label={label || "Google My Business Link"} isRequired={required} />
    )},
  ];
  const schemaOf = (name: string) => schema?.find((f) => f.id === name);
  if (schema) items.sort((a, b) => schema.findIndex((f) => f.id === a.name) - schema.findIndex((f) => f.id === b.name));

  return (
    <CrmSection title={title}>
      <SmartLocationPicker
        lat={values.latitude}
        lng={values.longitude}
        onPick={applyGeoPick}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2, mb: 1.5 }}>
          Advanced Location Details (Manual Override)
        </Typography>
        {/* Two rows on purpose: the dropdowns label ABOVE the box, the text inputs float
            theirs IN the border, so a row mixing the two staggers. Schema order applies
            within each row, never across them. */}
        {[items.filter((i) => DROPDOWNS.has(i.name)), items.filter((i) => !DROPDOWNS.has(i.name))].map((row, r) => (
          <Row key={r} className={r ? "g-3 mt-0" : "g-3"}>
            {row.map(({ name, md, render }) => {
              const f = schemaOf(name);
              if (f?.hidden) return null;
              return <Col key={name} md={md}>{render(f?.label, !!f?.required)}</Col>;
            })}
          </Row>
        ))}
      </SmartLocationPicker>
    </CrmSection>
  );
}

export default ContactAddressSection;
