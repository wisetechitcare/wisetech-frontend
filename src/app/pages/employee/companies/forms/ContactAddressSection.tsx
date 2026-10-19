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
};

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
}: Props) {
  const { values, setFieldValue } = useFormikContext<any>();
  const pendingGeo = useRef<{ state?: string; city?: string } | null>(null);

  const byName = (list: Loc[], name?: string) =>
    name ? list.find((o) => norm(o.name) === norm(name)) : undefined;

  const applyGeoPick = (geo: GeoPick) => {
    setFieldValue("latitude", String(geo.lat));
    setFieldValue("longitude", String(geo.lng));
    setFieldValue("googleMapLink", geo.googleMapLink);
    if (geo.formatted) setFieldValue("address", geo.formatted);
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
  useEffect(() => {
    const link = values.googleMapLink;
    if (link && !values.latitude && !values.longitude) {
      const latLngMatch = String(link).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (latLngMatch) {
        setFieldValue("latitude", latLngMatch[1]);
        setFieldValue("longitude", latLngMatch[2]);
      }
    }
  }, [values.googleMapLink, values.latitude, values.longitude, setFieldValue]);

  return (
    <CrmSection title="Address">
      <SmartLocationPicker
        lat={values.latitude}
        lng={values.longitude}
        onPick={applyGeoPick}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2, mb: 1.5 }}>
          Advanced Location Details (Manual Override)
        </Typography>
        <Row className="g-3">
          <Col md={4}>
            <DropDownInput
              formikField="country"
              inputLabel="Country"
              options={countries.map((c) => ({ label: c.name, value: c.id }))}
              isRequired={false}
              onChange={(option: any) => {
                setFieldValue("country", option?.value || "");
                setFieldValue("state", "");
                setFieldValue("city", "");
                setSelectedCountry(option?.value || "");
                setSelectedState("");
                if (option?.value) void handleCountryChange(option.value);
              }}
              value={
                selectedCountry
                  ? {
                      label:
                        countries.find((c) => c.id === selectedCountry)?.name ||
                        "",
                      value: selectedCountry,
                    }
                  : null
              }
            />
          </Col>
          <Col md={4}>
            <DropDownInput
              formikField="state"
              inputLabel="State"
              options={
                selectedCountry
                  ? states.map((s) => ({ label: s.name, value: s.id }))
                  : []
              }
              placeholder={
                !selectedCountry
                  ? "Please select country first"
                  : "Select State"
              }
              isRequired={false}
              onChange={(option: any) => {
                setFieldValue("state", option?.value || "");
                setFieldValue("city", "");
                setSelectedState(option?.value || "");
                if (option?.value && selectedCountry) {
                  void handleStateChange(selectedCountry, option.value);
                }
              }}
              value={
                selectedState
                  ? {
                      label:
                        states.find((s) => s.id === selectedState)?.name || "",
                      value: selectedState,
                    }
                  : null
              }
            />
          </Col>
          <Col md={4}>
            <DropDownInput
              formikField="city"
              inputLabel="City"
              options={
                selectedState
                  ? [
                      ...cities.map((c) => ({ label: c.name, value: c.id })),
                      ...(values.city &&
                      !cities.find((c) => c.id === values.city)
                        ? [{ label: values.city, value: values.city }]
                        : []),
                    ]
                  : []
              }
              placeholder={
                !selectedState ? "Please select state first" : "Select City"
              }
              isRequired={false}
              onChange={(option: any) =>
                setFieldValue("city", option?.value || "")
              }
              value={
                values.city
                  ? {
                      label:
                        cities.find((c) => c.id === values.city)?.name ||
                        values.city,
                      value: values.city,
                    }
                  : null
              }
            />
          </Col>

          <Col md={6}>
            <TextInput
              formikField="area"
              label="Locality"
              placeholder="Area / neighbourhood — auto-filled from the map"
              isRequired={false}
            />
          </Col>
          <Col md={6}>
            <TextInput
              formikField="zipCode"
              label="Pincode"
              isRequired={false}
            />
          </Col>

          <Col md={6}>
            <TextInput
              formikField="address"
              label="Formatted Address"
              placeholder="Building, street, landmark"
              isRequired={false}
            />
          </Col>
          <Col md={3}>
            <TextInput
              formikField="latitude"
              label="Latitude"
              isRequired={false}
              inputValidation="signed-decimal"
            />
          </Col>
          <Col md={3}>
            <TextInput
              formikField="longitude"
              label="Longitude"
              isRequired={false}
              inputValidation="signed-decimal"
            />
          </Col>

          <Col md={6}>
            <TextInput
              formikField="googleMapLink"
              label="Google Map Link"
              placeholder="https://www.google.com/maps/@19.1234,72.8765,17z"
              isRequired={false}
            />
          </Col>
          <Col md={6}>
            <TextInput
              formikField="gmbLink"
              label="Google My Business Link"
              isRequired={false}
            />
          </Col>
        </Row>
      </SmartLocationPicker>
    </CrmSection>
  );
}

export default ContactAddressSection;
