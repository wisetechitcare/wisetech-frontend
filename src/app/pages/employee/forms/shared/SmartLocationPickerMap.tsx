import React, { useState, useEffect, useRef } from "react";
import { Grid, CircularProgress, IconButton, Tooltip } from "@mui/material";
import {
  MyLocation,
  LocationOn,
  CheckCircle,
  MapOutlined,
  Directions,
  ContentCopy,
  Clear,
} from "@mui/icons-material";
import { getIn, useFormikContext } from "formik";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { C, FONT } from "@app/modules/configuration/ConfigDesignSystem";
import type { SmartLocationPickerProps } from "./SmartLocationPicker";

/* ═══════════════════════════════════════════════════════════════════════════
 * Smart Location Picker — the map-driven address capture the Lead wizard uses,
 * generalised so any module can mount it against its OWN Formik field names.
 *
 * Everything the Lead version did is preserved: place search, click/drag to drop
 * a pin, reverse geocoding into country/state/city/locality/pincode, Google Maps
 * link ⇄ coordinate two-way sync, Indian-pincode auto-fill, layer switching with
 * a remembered preference, and a manual-override panel.
 *
 * Heavy (Leaflet + tiles) — always reached through the lazy wrapper in
 * `SmartLocationPicker.tsx`, never imported directly.
 * ═══════════════════════════════════════════════════════════════════════════ */

// Premium styles for the Leaflet layer control.
const MAP_CONTROL_STYLES = `
  .leaflet-control-layers {
    border: none !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
    overflow: hidden;
  }
  .leaflet-control-layers-toggle {
    width: 44px !important;
    height: 44px !important;
    background-size: 24px 24px !important;
    border-radius: 12px !important;
    transition: background-color 0.2s ease;
  }
  .leaflet-control-layers-toggle:hover { background-color: var(--wt-gray-50) !important; }
  .leaflet-control-layers-expanded {
    padding: 12px 16px !important;
    border-radius: 12px !important;
    background: var(--wt-white) !important;
    font-family: 'Inter', sans-serif !important;
  }
  .leaflet-control-layers-base label {
    display: flex !important;
    align-items: center !important;
    gap: 10px;
    padding: 8px 0;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--wt-gray-700);
    transition: color 0.2s ease;
  }
  .leaflet-control-layers-base label:hover { color: var(--wt-primary); }
  .leaflet-control-layers-base input[type="radio"] {
    appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid var(--wt-gray-200);
    border-radius: 50%;
    outline: none;
    position: relative;
    cursor: pointer;
    margin: 0;
    transition: all 0.2s ease;
  }
  .leaflet-control-layers-base input[type="radio"]:checked { border-color: var(--wt-primary); }
  .leaflet-control-layers-base input[type="radio"]:checked::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    background-color: var(--wt-primary);
    border-radius: 50%;
  }
`;

// Fix the Leaflet default-icon resolution under bundlers (fallback marker).
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const premiumMarkerIcon = L.divIcon({
  className: "custom-map-marker",
  html: `
    <div style="position: relative; width: 50px; height: 60px; display: flex; justify-content: center; align-items: flex-end;">
      <div style="
        position: absolute; bottom: 2px; width: 16px; height: 6px;
        background-color: rgba(0, 0, 0, 0.6); border-radius: 50%; filter: blur(2px);
        animation: shadow-pulse 1.5s infinite alternate ease-in-out;
      "></div>
      <div style="
        background: linear-gradient(135deg, ${C.primaryMid} 0%, ${C.primary} 100%);
        width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
        border: 2.5px solid white;
        box-shadow: inset 0 2px 4px rgba(255,255,255,0.6), 0 6px 12px rgba(0,0,0,0.3);
        z-index: 2; position: relative; display: flex; align-items: center; justify-content: center;
        animation: pin-float 1.5s infinite alternate ease-in-out; margin-bottom: 12px;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
      <style>
        @keyframes pin-float { 0% { transform: translateY(0px) rotate(-45deg); } 100% { transform: translateY(-10px) rotate(-45deg); } }
        @keyframes shadow-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(0.5); opacity: 0.2; } }
        .custom-map-marker { background: transparent; border: none; }
      </style>
    </div>
  `,
  iconSize: [50, 60],
  iconAnchor: [25, 60], // Anchor exactly at the bottom shadow
});

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const OPEN_CAGE_API_KEY = import.meta.env.VITE_APP_OPEN_CAGE_API_KEY;

// Third-party geocoding (OpenCage / Nominatim / India Post) MUST NOT use the
// app's global axios instance. Its response interceptor (setupAxios in
// AuthHelpers) treats ANY 401 as an expired session and hard-redirects to
// /auth — and OpenCage returns 401 on an invalid/exhausted API key, so a single
// failed reverse-geocode was logging the user out mid-form. A bare instance has
// none of the app interceptors (so a geocoding 401 stays a local, caught error)
// and doesn't attach our Bearer token to third-party hosts. Backend calls
// (resolve-map-link) keep using the global `axios` because they need auth.
const geoClient = axios.create();

// ── Coordinate / link helpers ────────────────────────────────────────────────
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const isValidLat = (n: number) => Number.isFinite(n) && n >= -90 && n <= 90;
const isValidLng = (n: number) => Number.isFinite(n) && n >= -180 && n <= 180;
/** Canonical Google Maps place link from coordinates (the "auto sync" link). */
const buildGoogleMapsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${round6(lat)},${round6(lng)}`;
/** Turn-by-turn directions link to the dropped pin. */
const buildDirectionsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${round6(lat)},${round6(lng)}`;

/** Pull coordinates out of any Google/OSM maps URL we can recognise. */
const parseCoordsFromUrl = (url: string): { lat: number; lng: number } | null => {
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // place pin
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // viewport center
    /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/, // q=/ll=/destination=
    /\/(-?\d+\.\d+),(-?\d+\.\d+)/, // path /lat,lng
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isValidLat(lat) && isValidLng(lng)) return { lat, lng };
    }
  }
  return null;
};

/** Normalise OpenCage components into the same shape Nominatim returns. */
const openCageToNominatim = (r: any) => ({
  display_name: r.formatted,
  boundingbox: r.bounds
    ? [r.bounds.southwest.lat, r.bounds.northeast.lat, r.bounds.southwest.lng, r.bounds.northeast.lng]
    : undefined,
  address: {
    city: r.components.city || r.components.town || r.components.village || r.components.county,
    town: r.components.town,
    village: r.components.village,
    county: r.components.county,
    state: r.components.state,
    country: r.components.country,
    postcode: r.components.postcode,
    suburb: r.components.suburb || r.components.neighbourhood,
    road: r.components.road,
  },
});

const MapEvents = ({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e);
    },
  });
  return null;
};

/** Caches the user's chosen base layer so every map opens the way they left it. */
const LayerTracker = () => {
  useMapEvents({
    baselayerchange(e: any) {
      localStorage.setItem("preferredMapStyle", e.name);
    },
  });
  return null;
};

const MapUpdater = ({
  center,
  zoom,
  bounds,
}: {
  center: { lat: number; lng: number };
  zoom: number;
  bounds?: L.LatLngBoundsExpression | null;
}) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { animate: true });
    else map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center, map, zoom, bounds]);
  return null;
};

/** Forces Leaflet to recalculate tile coverage after the container lays out. */
const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    const container = map.getContainer();
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const SmartLocationPickerMap: React.FC<SmartLocationPickerProps> = ({
  uid,
  fields,
  countryOptions,
  stateOptions,
  cityOptions,
  onCountryChange,
  onStateChange,
  title = "Smart Location Details",
  addressLabel = "Formatted Address",
  localityLabel = "Locality",
  pincodeLabel = "Pincode",
  extraAdvancedFields,
  mapHeight = 450,
}) => {
  const { values, setFieldValue } = useFormikContext<any>();

  const read = (path: string) => getIn(values, path) ?? "";
  const countryValue = read(fields.country);
  const stateValue = read(fields.state);
  const cityValue = read(fields.city);

  const [center, setCenter] = useState({ lat: 19.076, lng: 72.8777 }); // Default: Mumbai
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);

  const [searchQuery, setSearchQuery] = useState(read(fields.address));
  const [isResolving, setIsResolving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [pendingGeoState, setPendingGeoState] = useState<string | null>(null);
  const [pendingGeoCity, setPendingGeoCity] = useState<string | null>(null);

  const [locationVerified, setLocationVerified] = useState<boolean>(
    !isNaN(parseFloat(read(fields.latitude))) && !isNaN(parseFloat(read(fields.longitude))),
  );
  const [copied, setCopied] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents the link→coords resolver from firing on links WE generated (no loop).
  const skipNextLinkResolve = useRef(false);
  const lastPincodeLookup = useRef<string>("");

  // Inject the layer-control styling once per document.
  useEffect(() => {
    const STYLE_ID = "wt-map-control-styles";
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = MAP_CONTROL_STYLES;
    document.head.appendChild(el);
  }, []);

  // ── Geocode → dropdown sync ───────────────────────────────────────────────
  // A reverse-geocode returns NAMES; the dropdowns work in ids and their options
  // load asynchronously, so a matched name is parked as "pending" until the
  // corresponding option list arrives.
  useEffect(() => {
    if (!pendingGeoState || !stateOptions?.length) return;
    const needle = pendingGeoState.toLowerCase();
    const found = stateOptions.find(
      (s) => s.label.toLowerCase() === needle || needle.includes(s.label.toLowerCase()),
    );
    if (found) {
      if (stateValue !== found.value) onStateChange(found.value);
      setPendingGeoState(null);
    }
  }, [stateOptions, pendingGeoState, stateValue, onStateChange]);

  const tryMatchPendingCity = React.useCallback(() => {
    if (!pendingGeoCity || !cityOptions?.length) return;
    const needle = pendingGeoCity.toLowerCase().trim();

    let found = cityOptions.find((c) => c.label.toLowerCase().trim() === needle);
    if (!found) {
      found = cityOptions.find((c) => {
        const label = c.label.toLowerCase().trim();
        return needle.includes(label) || label.includes(needle);
      });
    }
    // "Mumbai" vs "Mumbai City" style near-misses.
    if (!found && needle.length > 0) {
      found = cityOptions.find((c) => c.label.toLowerCase().startsWith(needle.charAt(0)));
    }
    // Last resort: a single candidate is unambiguous.
    if (!found && cityOptions.length === 1) found = cityOptions[0];

    if (found && cityValue !== found.value) {
      setFieldValue(fields.city, found.value);
      setPendingGeoCity(null);
    }
  }, [pendingGeoCity, cityOptions, cityValue, setFieldValue, fields.city]);

  useEffect(() => {
    tryMatchPendingCity();
  }, [cityOptions, pendingGeoCity, tryMatchPendingCity]);

  // Initialise marker and centre from whatever the form already holds.
  useEffect(() => {
    const lat = parseFloat(read(fields.latitude));
    const lng = parseFloat(read(fields.longitude));
    if (!isNaN(lat) && !isNaN(lng)) {
      setCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLocation = (
    latRaw: number,
    lngRaw: number,
    placeData?: any,
    opts?: { keepLink?: boolean },
  ) => {
    if (!isValidLat(latRaw) || !isValidLng(lngRaw)) return;
    const lat = round6(latRaw);
    const lng = round6(lngRaw);
    setCenter({ lat, lng });
    setMarkerPosition({ lat, lng });
    setLocationVerified(true);
    setFieldValue(fields.latitude, lat.toString());
    setFieldValue(fields.longitude, lng.toString());

    // Auto-sync the Google Maps link from the pin (unless we're resolving FROM a
    // pasted link, in which case we keep what the user pasted).
    if (!opts?.keepLink) {
      skipNextLinkResolve.current = true;
      setFieldValue(fields.mapLink, buildGoogleMapsLink(lat, lng));
    }

    if (placeData?.boundingbox) {
      // Nominatim returns boundingbox as [latMin, latMax, lonMin, lonMax].
      setMapBounds([
        [parseFloat(placeData.boundingbox[0]), parseFloat(placeData.boundingbox[2])],
        [parseFloat(placeData.boundingbox[1]), parseFloat(placeData.boundingbox[3])],
      ]);
    } else {
      setMapBounds(null);
    }
    reverseGeocode(lat, lng);
  };

  // Sync a pasted Google Map Link → Lat/Lng (handles short maps.app.goo.gl links).
  const mapLinkValue = read(fields.mapLink);
  useEffect(() => {
    let active = true;
    const resolveLink = async () => {
      if (!mapLinkValue) return;
      // Ignore links we generated ourselves (avoids a resolve↔sync loop).
      if (skipNextLinkResolve.current) {
        skipNextLinkResolve.current = false;
        return;
      }
      if (isResolving) return;
      setIsResolving(true);
      try {
        if (mapLinkValue.includes("maps.app.goo.gl") || mapLinkValue.includes("goo.gl")) {
          const { data } = await axios.get(
            `${API_BASE_URL}/api/employee/resolve-map-link?url=${encodeURIComponent(mapLinkValue)}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
          );
          if (active && data?.data?.finalUrl) {
            const coords = parseCoordsFromUrl(data.data.finalUrl);
            if (coords) updateLocation(coords.lat, coords.lng, undefined, { keepLink: true });
          }
        } else {
          const coords = parseCoordsFromUrl(mapLinkValue);
          if (active && coords) updateLocation(coords.lat, coords.lng, undefined, { keepLink: true });
        }
      } catch (error) {
        console.error("Failed to resolve link", error);
      }
      if (active) setIsResolving(false);
    };
    resolveLink();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLinkValue]);

  const reverseGeocode = async (lat: number, lng: number) => {
    // Prefer OpenCage when an API key is configured (richer, more reliable
    // components); silently fall back to free Nominatim on any error/quota.
    if (OPEN_CAGE_API_KEY) {
      try {
        const { data } = await geoClient.get(
          `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPEN_CAGE_API_KEY}&no_annotations=1&limit=1&language=en`,
          { withCredentials: false },
        );
        const result = data?.results?.[0];
        if (result) {
          parseAddressComponents(openCageToNominatim(result));
          return;
        }
      } catch (error) {
        console.warn("OpenCage reverse failed, falling back to Nominatim", error);
      }
    }
    try {
      // withCredentials must stay off for third-party APIs — they respond with
      // Access-Control-Allow-Origin: * which rejects credentialed requests.
      const { data } = await geoClient.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`,
        { withCredentials: false },
      );
      if (data?.address) parseAddressComponents(data);
    } catch (error) {
      console.error("Reverse geocoding error", error);
    }
  };

  // ── Pincode → auto City/State (India Post; free, no key) ──────────────────
  const lookupPincode = async (pin: string) => {
    const code = (pin || "").trim();
    if (!/^\d{6}$/.test(code) || code === lastPincodeLookup.current) return;
    lastPincodeLookup.current = code;
    setPincodeLoading(true);
    try {
      const { data } = await geoClient.get(`https://api.postalpincode.in/pincode/${code}`, {
        withCredentials: false,
      });
      const po = data?.[0]?.PostOffice?.[0];
      if (po) {
        // India Post → mirror into the same auto-sync path used by geocoding.
        const country = po.Country || "India";
        const foundCountry = countryOptions.find((c) => c.label.toLowerCase() === country.toLowerCase());
        if (foundCountry && countryValue !== foundCountry.value) onCountryChange(foundCountry.value);
        if (po.State) setPendingGeoState(po.State);
        // Division/District beat Name/Block for city matching.
        const cityName = po.Division || po.District || po.Block || po.Name || "";
        if (cityName) setPendingGeoCity(cityName);
      }
    } catch (error) {
      console.warn("Pincode lookup failed", error);
    } finally {
      setPincodeLoading(false);
    }
  };

  const pincodeValue = read(fields.pincode);
  useEffect(() => {
    const code = (pincodeValue || "").trim();
    if (/^\d{6}$/.test(code)) lookupPincode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeValue]);

  const copyCoordinates = () => {
    const lat = read(fields.latitude);
    const lng = read(fields.longitude);
    if (!lat || !lng) return;
    navigator.clipboard?.writeText(`${lat}, ${lng}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const clearLocation = () => {
    setMarkerPosition(null);
    setMapBounds(null);
    setLocationVerified(false);
    setSearchQuery("");
    skipNextLinkResolve.current = true;
    [fields.latitude, fields.longitude, fields.mapLink].forEach((f) => setFieldValue(f, ""));
  };

  const searchPlaces = async (query: string) => {
    // countrycodes=in prioritises India, matching the rest of the app's data.
    const { data } = await geoClient.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query,
      )}&limit=5&addressdetails=1&countrycodes=in`,
      { withCredentials: false },
    );
    return Array.isArray(data) ? data : [];
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowDropdown(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const results = await searchPlaces(val);
          if (results.length) setSearchResults(results);
        } catch (error) {
          console.error("Geocoding error", error);
        }
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (searchResults.length > 0) {
      selectPlace(searchResults[0]);
      return;
    }
    if (searchQuery.length > 2) {
      // Force an immediate search if Enter beats the debounce.
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      try {
        const results = await searchPlaces(searchQuery);
        if (results.length) {
          setSearchResults(results);
          selectPlace(results[0]);
        }
      } catch (error) {
        console.error("Geocoding error", error);
      }
    }
  };

  const selectPlace = (place: any) => {
    setSearchQuery(place.display_name);
    setShowDropdown(false);
    setFieldValue(fields.address, place.display_name);
    updateLocation(parseFloat(place.lat), parseFloat(place.lon), place);
  };

  const parseAddressComponents = (result: any) => {
    const components = result.address || {};
    const display = result.display_name || "";

    // ALWAYS write the formatted address, so re-dropping the pin refreshes it.
    if (display) setFieldValue(fields.address, display);

    // Prefer city over district for the most recognisable name.
    const city =
      components.city ||
      components.town ||
      components.municipality ||
      components.county ||
      components.village ||
      components.district ||
      "";
    const state = components.state || components.province || components.region || "";
    const country = components.country || "";
    const pincode = components.postcode || "";
    // Locality = area / neighbourhood below city level. OpenCage is normalised to
    // `suburb` (see openCageToNominatim); raw Nominatim exposes several keys.
    const locality =
      components.suburb ||
      components.neighbourhood ||
      components.residential ||
      components.quarter ||
      components.city_district ||
      components.hamlet ||
      "";

    if (pincode) setFieldValue(fields.pincode, pincode);
    if (locality) setFieldValue(fields.locality, locality);

    if (country) {
      const foundCountry = countryOptions.find(
        (c) =>
          c.label.toLowerCase() === country.toLowerCase() ||
          country.toLowerCase().includes(c.label.toLowerCase()),
      );
      if (foundCountry && countryValue !== foundCountry.value) onCountryChange(foundCountry.value);

      if (state) setPendingGeoState(state);

      let cityToSet = city;
      if (!cityToSet && display) {
        const parts = display.split(",").map((p: string) => p.trim());
        cityToSet = parts.find((p: string) => p.length > 2 && p.length < 30) || "";
      }
      if (cityToSet) setPendingGeoCity(cityToSet);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => updateLocation(position.coords.latitude, position.coords.longitude),
      (error) => alert(`Error getting location: ${error.message}`),
    );
  };

  const preferredLayer = localStorage.getItem("preferredMapStyle") || "Google Satellite (Hybrid)";

  return (
    <div className="p-0 border rounded bg-white overflow-hidden shadow-sm">
      <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-light">
        <h5
          className="mb-0 fw-bold d-flex align-items-center gap-2"
          style={{ fontFamily: FONT.body, color: C.primary }}
        >
          <LocationOn className="me-1" /> {title}
          {locationVerified ? (
            <span
              className="badge d-inline-flex align-items-center gap-1"
              style={{ background: C.successLight, color: "#15803d", fontWeight: 600 }}
            >
              <CheckCircle style={{ fontSize: 14 }} /> Location set
            </span>
          ) : (
            <span
              className="badge"
              style={{ background: C.bgSection, color: C.textSecondary, fontWeight: 600 }}
            >
              Not set
            </span>
          )}
        </h5>
        <Tooltip title="Use My Current Location">
          <IconButton
            onClick={locateMe}
            size="small"
            style={{ backgroundColor: C.primaryLight, color: C.primary }}
          >
            <MyLocation fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="p-5">
        <div className="position-relative mb-5">
          <label className="form-label fw-bold mb-2" htmlFor={`location-search-${uid}`}>
            Search Address
          </label>
          <input
            id={`location-search-${uid}`}
            type="text"
            className="form-control form-control-lg form-control-solid border"
            placeholder="Start typing an address, building, or area (press Enter to select)…"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ paddingLeft: "45px", fontWeight: 500, fontSize: "15px" }}
          />
          <LocationOn style={{ position: "absolute", top: "44px", left: "15px", color: C.textMuted }} />

          {showDropdown && searchResults.length > 0 && (
            <div
              className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
              style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto" }}
            >
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="p-3 border-bottom cursor-pointer text-dark"
                  style={{ cursor: "pointer" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPlace(result);
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.bgSection)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.bgCard)}
                >
                  <LocationOn fontSize="small" className="me-2 text-muted" />
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            height: `${mapHeight}px`,
            borderRadius: "12px",
            overflow: "hidden",
            border: `1px solid ${C.border}`,
            marginBottom: "24px",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={markerPosition ? 16 : 11}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer name="Carto Light" checked={preferredLayer === "Carto Light"}>
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Esri Street Map" checked={preferredLayer === "Esri Street Map"}>
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer
                name="Google Satellite (Hybrid)"
                checked={preferredLayer === "Google Satellite (Hybrid)"}
              >
                <TileLayer
                  attribution="&copy; Google Maps"
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxZoom={20}
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="OpenStreetMap" checked={preferredLayer === "OpenStreetMap"}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* Search hits are clickable markers until a pin is committed. */}
            {searchResults.length > 0 &&
              !markerPosition &&
              searchResults.map((result, idx) => (
                <Marker
                  key={idx}
                  position={[parseFloat(result.lat), parseFloat(result.lon)]}
                  title={result.display_name}
                  eventHandlers={{ click: () => selectPlace(result) }}
                />
              ))}

            {markerPosition && (
              <Marker
                position={[markerPosition.lat, markerPosition.lng]}
                icon={premiumMarkerIcon}
                draggable
                eventHandlers={{
                  dragend: (e: any) => {
                    const ll = e.target.getLatLng();
                    updateLocation(ll.lat, ll.lng);
                  },
                }}
              />
            )}
            <MapEvents onMapClick={(e) => updateLocation(e.latlng.lat, e.latlng.lng)} />
            <MapUpdater center={center} zoom={markerPosition ? 16 : 11} bounds={mapBounds} />
            <LayerTracker />
            <MapInvalidator />
          </MapContainer>

          {!markerPosition && (
            <div
              style={{
                position: "absolute",
                bottom: "30px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "rgba(24, 28, 50, 0.72)",
                color: "white",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "14px",
                pointerEvents: "none",
                zIndex: 1000,
              }}
            >
              Click anywhere on the map to drop a pin — drag the pin to fine-tune
            </div>
          )}
        </div>

        {/* ── Quick actions for the dropped pin ──────────────────────────── */}
        {markerPosition && (
          <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
            <span className="text-muted fw-semibold" style={{ fontSize: 13 }}>
              <LocationOn fontSize="small" className="me-1" />
              {round6(markerPosition.lat)}, {round6(markerPosition.lng)}
            </span>
            <div className="vr mx-1" />
            <a
              className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
              href={buildGoogleMapsLink(markerPosition.lat, markerPosition.lng)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapOutlined style={{ fontSize: 16 }} /> Open in Maps
            </a>
            <a
              className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
              href={buildDirectionsLink(markerPosition.lat, markerPosition.lng)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Directions style={{ fontSize: 16 }} /> Directions
            </a>
            <button
              type="button"
              className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
              onClick={copyCoordinates}
            >
              <ContentCopy style={{ fontSize: 16 }} /> {copied ? "Copied!" : "Copy coordinates"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 ms-auto"
              onClick={clearLocation}
            >
              <Clear style={{ fontSize: 16 }} /> Clear
            </button>
          </div>
        )}

        <div className="accordion mt-5" id={`advancedLocation-${uid}`}>
          <div className="accordion-item border rounded">
            <h2 className="accordion-header">
              <button
                className="accordion-button collapsed bg-light fw-bold"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target={`#collapseLocation-${uid}`}
              >
                Advanced Location Details (Manual Override)
              </button>
            </h2>
            <div
              id={`collapseLocation-${uid}`}
              className="accordion-collapse collapse"
              data-bs-parent={`#advancedLocation-${uid}`}
            >
              <Grid container spacing={4} className="bg-white p-5 rounded">
                <Grid item xs={12} md={4}>
                  <DropDownInput
                    isRequired={false}
                    formikField={fields.country}
                    inputLabel="Country"
                    options={countryOptions}
                    onChange={(val: any) => onCountryChange(val?.value || "")}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <DropDownInput
                    isRequired={false}
                    formikField={fields.state}
                    inputLabel="State"
                    options={stateOptions}
                    onChange={(val: any) => onStateChange(val?.value || "")}
                    disabled={!countryValue}
                  />
                  {!countryValue && (
                    <span className="text-muted mt-1 d-block" style={{ fontSize: 11 }}>
                      Select a country first
                    </span>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  <DropDownInput
                    isRequired={false}
                    formikField={fields.city}
                    inputLabel="City"
                    options={cityOptions}
                    disabled={!stateValue}
                  />
                  {!stateValue && (
                    <span className="text-muted mt-1 d-block" style={{ fontSize: 11 }}>
                      Select a state first
                    </span>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextInput formikField={fields.locality} label={localityLabel} isRequired={false} />
                  <span className="text-muted mt-1 d-block" style={{ fontSize: 11 }}>
                    Area / neighbourhood — auto-filled from the map, or enter manually.
                  </span>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextInput formikField={fields.pincode} label={pincodeLabel} isRequired={false} />
                  {pincodeLoading ? (
                    <span
                      className="text-muted d-inline-flex align-items-center gap-1 mt-1"
                      style={{ fontSize: 12 }}
                    >
                      <CircularProgress size={12} /> Looking up city &amp; state…
                    </span>
                  ) : (
                    <span className="text-muted mt-1 d-block" style={{ fontSize: 11 }}>
                      Enter a 6-digit Indian pincode to auto-fill City &amp; State.
                    </span>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextInput formikField={fields.address} label={addressLabel} isRequired={false} />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextInput formikField={fields.latitude} label="Latitude" isRequired={false} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextInput formikField={fields.longitude} label="Longitude" isRequired={false} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextInput formikField={fields.mapLink} label="Google Map Link" isRequired={false} />
                </Grid>

                {extraAdvancedFields}
              </Grid>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartLocationPickerMap;
