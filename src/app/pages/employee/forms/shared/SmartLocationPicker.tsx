import React, { Suspense, lazy } from "react";

import { C, FONT } from "@app/modules/configuration/ConfigDesignSystem";

/* ═══════════════════════════════════════════════════════════════════════════
 * Smart Location Picker — public surface.
 *
 * The implementation pulls in Leaflet + react-leaflet (a large vendor chunk), so
 * it is code-split behind React.lazy. Importing THIS module is cheap: it carries
 * only types and the suspense shell, which keeps the map bundle out of the hot
 * paths that merely reference a form (companies list, lead wizard, …).
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface LocationOption {
  value: string;
  label: string;
}

/**
 * Full Formik paths for each address concept. Every module names these fields
 * differently (a lead has `addresses.0.projectAddress`, a company has
 * `addressLine1`, a contact has `address`), so the picker is told where to read
 * and write instead of assuming a shape.
 */
export interface LocationFieldPaths {
  /** Formatted / street address. */
  address: string;
  /** Area or neighbourhood below city level. */
  locality: string;
  /** Postal / ZIP code. Drives the Indian-pincode auto-fill. */
  pincode: string;
  latitude: string;
  longitude: string;
  /** Google Maps URL — kept in two-way sync with the pin. */
  mapLink: string;
  country: string;
  state: string;
  city: string;
}

export interface SmartLocationPickerProps {
  /** Unique suffix for DOM ids (the accordion needs collision-free targets). */
  uid: string;
  fields: LocationFieldPaths;
  countryOptions: LocationOption[];
  stateOptions: LocationOption[];
  cityOptions: LocationOption[];
  /** Must set the country field, clear state/city, and load the state options. */
  onCountryChange: (countryId: string) => void;
  /** Must set the state field, clear city, and load the city options. */
  onStateChange: (stateId: string) => void;
  title?: string;
  addressLabel?: string;
  localityLabel?: string;
  pincodeLabel?: string;
  /** Extra `<Grid item>`s appended to the manual-override panel. */
  extraAdvancedFields?: React.ReactNode;
  mapHeight?: number;
}

const SmartLocationPickerMap = lazy(() => import("./SmartLocationPickerMap"));

const MapSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div className="p-0 border rounded bg-white overflow-hidden shadow-sm">
    <div className="d-flex align-items-center gap-2 p-4 border-bottom bg-light">
      <i className="bi bi-geo-alt-fill" style={{ color: C.primary }} />
      <span className="fw-bold" style={{ fontFamily: FONT.body, color: C.primary }}>
        Smart Location Details
      </span>
    </div>
    <div className="p-5">
      <div
        className="d-flex flex-column align-items-center justify-content-center text-muted"
        style={{ height, background: C.bgSection, borderRadius: 12, border: `1px solid ${C.border}` }}
      >
        <div className="spinner-border spinner-border-sm mb-2" role="status" aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Loading map…</span>
      </div>
    </div>
  </div>
);

export const SmartLocationPicker: React.FC<SmartLocationPickerProps> = (props) => (
  <Suspense fallback={<MapSkeleton height={props.mapHeight ?? 450} />}>
    <SmartLocationPickerMap {...props} />
  </Suspense>
);

export default SmartLocationPicker;
