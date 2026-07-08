import React, { useState, useEffect, useRef } from "react";
import { Grid, CircularProgress, IconButton, Tooltip } from "@mui/material";
import { MyLocation, LocationOn, CheckCircle, MapOutlined, Directions, ContentCopy, Clear } from "@mui/icons-material";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { useFormikContext } from "formik";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl, LayerGroup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Premium styles for the Leaflet Layer Control
const mapStyles = `
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
  .leaflet-control-layers-toggle:hover {
    background-color: #f8f9fa !important;
  }
  .leaflet-control-layers-expanded {
    padding: 12px 16px !important;
    border-radius: 12px !important;
    background: #ffffff !important;
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
    color: #3f4254;
    transition: color 0.2s ease;
  }
  .leaflet-control-layers-base label:hover {
    color: #9d4141;
  }
  .leaflet-control-layers-base input[type="radio"] {
    appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid #e4e6ef;
    border-radius: 50%;
    outline: none;
    position: relative;
    cursor: pointer;
    margin: 0;
    transition: all 0.2s ease;
  }
  .leaflet-control-layers-base input[type="radio"]:checked {
    border-color: #9d4141;
  }
  .leaflet-control-layers-base input[type="radio"]:checked::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    background-color: #9d4141;
    border-radius: 50%;
  }
`;

// Fix leaflet icon issue in react (fallback)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Premium Animated Custom Marker
const premiumMarkerIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 50px; height: 60px; display: flex; justify-content: center; align-items: flex-end;">
      <!-- Pulsing shadow base -->
      <div style="
        position: absolute;
        bottom: 2px;
        width: 16px;
        height: 6px;
        background-color: rgba(0, 0, 0, 0.6);
        border-radius: 50%;
        filter: blur(2px);
        animation: shadow-pulse 1.5s infinite alternate ease-in-out;
      "></div>
      
      <!-- Floating Pin -->
      <div style="
        background: linear-gradient(135deg, #ff4b4b 0%, #cc0000 100%);
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        border: 2.5px solid white;
        box-shadow: inset 0 2px 4px rgba(255,255,255,0.6), 0 6px 12px rgba(0,0,0,0.3);
        z-index: 2;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pin-float 1.5s infinite alternate ease-in-out;
        margin-bottom: 12px;
      ">
        <!-- Inner core -->
        <div style="
          width: 8px; height: 8px;
          background: white;
          border-radius: 50%;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      </div>
      
      <style>
        @keyframes pin-float {
          0% { transform: translateY(0px) rotate(-45deg); }
          100% { transform: translateY(-10px) rotate(-45deg); }
        }
        @keyframes shadow-pulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(0.5); opacity: 0.2; }
        }
        .custom-map-marker {
           background: transparent;
           border: none;
        }
      </style>
    </div>
  `,
  iconSize: [50, 60],
  iconAnchor: [25, 60], // Anchor exactly at the bottom shadow
});

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const OPEN_CAGE_API_KEY = import.meta.env.VITE_APP_OPEN_CAGE_API_KEY;

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

interface SmartLocationPickerProps {
  index: number;
  countryOptions: any[];
  handleAddressCountryChange: (index: number, countryId: any, setFieldValue: any) => void;
  handleAddressStateChange: (index: number, stateId: any, countryId: any, setFieldValue: any) => void;
}

// MapEvents Component to handle clicks on the map
const MapEvents = ({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e);
    },
  });
  return null;
};

// Component to intercept layer changes and cache the user's preference
const LayerTracker = () => {
  useMapEvents({
    baselayerchange(e: any) {
      localStorage.setItem("preferredMapStyle", e.name);
    }
  });
  return null;
};

// MapUpdater Component to smoothly pan the map
const MapUpdater = ({ center, zoom, bounds }: { center: { lat: number; lng: number }; zoom: number; bounds?: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { animate: true });
    } else {
      map.setView([center.lat, center.lng], zoom, { animate: true });
    }
  }, [center, map, zoom, bounds]);
  return null;
};

// Forces Leaflet to recalculate tile coverage after the container finishes layout
const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    if (container) {
      observer.observe(container);
    }
    return () => {
      observer.disconnect();
    };
  }, [map]);
  return null;
};

export const SmartLocationPicker: React.FC<SmartLocationPickerProps> = ({
  index,
  countryOptions,
  handleAddressCountryChange,
  handleAddressStateChange
}) => {
  const { values, setFieldValue } = useFormikContext<any>();
  
  const addressPath = `addresses.${index}`;
  const addressData = values.addresses?.[index] || {};
  
  const states = values.addressStatesOptions?.[index] || [];
  const cities = values.addressCitiesOptions?.[index] || [];

  const [center, setCenter] = useState({ lat: 19.0760, lng: 72.8777 }); // Default: Mumbai
  const [markerPosition, setMarkerPosition] = useState<{lat: number, lng: number} | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);
  
  const [searchQuery, setSearchQuery] = useState(addressData.projectAddress || "");
  const [isResolving, setIsResolving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [pendingGeoState, setPendingGeoState] = useState<string | null>(null);
  const [pendingGeoCity, setPendingGeoCity] = useState<string | null>(null);

  const [locationVerified, setLocationVerified] = useState<boolean>(
    !isNaN(parseFloat(addressData.latitude)) && !isNaN(parseFloat(addressData.longitude))
  );
  const [copied, setCopied] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  // Prevents the link→coords resolver from firing on links WE generated (no loop).
  const skipNextLinkResolve = useRef(false);
  const lastPincodeLookup = useRef<string>("");

  // Sync pending state when states array loads
  useEffect(() => {
    if (pendingGeoState && states && states.length > 0) {
      const foundState = states.find((s: any) => 
        s.name.toLowerCase() === pendingGeoState.toLowerCase() || 
        pendingGeoState.toLowerCase().includes(s.name.toLowerCase())
      );
      if (foundState) {
        if (addressData.state !== foundState.id) {
           handleAddressStateChange(index, foundState.id, addressData.country, setFieldValue);
        }
        setPendingGeoState(null);
      }
    }
  }, [states, pendingGeoState, addressData.country]);

  // Try to match pending city with available cities
  const tryMatchPendingCity = React.useCallback(() => {
    if (!pendingGeoCity || !cities || cities.length === 0) return;

    const pendingLower = pendingGeoCity.toLowerCase().trim();

    // Try exact match first
    let foundCity = cities.find((c: any) =>
      c.name.toLowerCase().trim() === pendingLower
    );

    // If no exact match, try partial/contains match
    if (!foundCity) {
      foundCity = cities.find((c: any) => {
        const cityNameLower = c.name.toLowerCase().trim();
        return pendingLower.includes(cityNameLower) ||
               cityNameLower.includes(pendingLower);
      });
    }

    // If still no match, try first letter match (for cases like "Mumbai" vs "Mumbai City")
    if (!foundCity && pendingLower.length > 0) {
      foundCity = cities.find((c: any) =>
        c.name.toLowerCase().startsWith(pendingLower.charAt(0))
      );
    }

    // Last resort: if there's only one city, select it
    if (!foundCity && cities.length === 1) {
      foundCity = cities[0];
    }

    if (foundCity && addressData.city !== foundCity.id) {
      setFieldValue(`${addressPath}.city`, foundCity.id);
      setPendingGeoCity(null);
    }
  }, [pendingGeoCity, cities, addressData.city, setFieldValue, addressPath]);

  // Sync pending city when cities array loads
  useEffect(() => {
    tryMatchPendingCity();
  }, [cities, pendingGeoCity, tryMatchPendingCity]);

  // Initialize marker and center based on existing form data
  useEffect(() => {
    const lat = parseFloat(addressData.latitude);
    const lng = parseFloat(addressData.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
    }
  }, []);

  // Sync a pasted Google Map Link → Lat/Lng (handles short maps.app.goo.gl links).
  useEffect(() => {
    let active = true;
    const resolveLink = async () => {
      const link = addressData.googleMapLink;
      if (!link) return;
      // Ignore links we generated ourselves (avoids a resolve↔sync loop).
      if (skipNextLinkResolve.current) {
        skipNextLinkResolve.current = false;
        return;
      }
      if (isResolving) return;
      setIsResolving(true);
      try {
        if (link.includes("maps.app.goo.gl") || link.includes("goo.gl")) {
           const { data } = await axios.get(`${API_BASE_URL}/api/employee/resolve-map-link?url=${encodeURIComponent(link)}`, {
             headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
           });
           if (active && data?.data?.finalUrl) {
              const coords = parseCoordsFromUrl(data.data.finalUrl);
              if (coords) updateLocation(coords.lat, coords.lng, undefined, { keepLink: true });
           }
        } else {
           const coords = parseCoordsFromUrl(link);
           if (active && coords) updateLocation(coords.lat, coords.lng, undefined, { keepLink: true });
        }
      } catch (error) {
        console.error("Failed to resolve link", error);
      }
      if (active) setIsResolving(false);
    };
    resolveLink();
    return () => { active = false; };
  }, [addressData.googleMapLink]);

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
    setFieldValue(`${addressPath}.latitude`, lat.toString());
    setFieldValue(`${addressPath}.longitude`, lng.toString());

    // ⭐ Auto-sync the Google Maps link from the pin (unless we're resolving FROM a
    // pasted link, in which case we keep what the user pasted).
    if (!opts?.keepLink) {
      skipNextLinkResolve.current = true;
      setFieldValue(`${addressPath}.googleMapLink`, buildGoogleMapsLink(lat, lng));
    }

    if (placeData) {
       // If bounds exist, use them for smart zoom
       // Nominatim returns boundingbox as string array: [latMin, latMax, lonMin, lonMax]
       if (placeData.boundingbox) {
         setMapBounds([
           [parseFloat(placeData.boundingbox[0]), parseFloat(placeData.boundingbox[2])],
           [parseFloat(placeData.boundingbox[1]), parseFloat(placeData.boundingbox[3])]
         ]);
       } else {
         setMapBounds(null);
       }
       // If placeData is from Search, it might not have detailed address components. 
       // We'll do a reverseGeocode on its exact lat/lon to get perfect Formik fields.
       reverseGeocode(lat, lng);
    } else {
       setMapBounds(null);
       reverseGeocode(lat, lng);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    // Prefer OpenCage when an API key is configured (richer, more reliable
    // components); silently fall back to free Nominatim on any error/quota.
    if (OPEN_CAGE_API_KEY) {
      try {
        const { data } = await axios.get(
          `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPEN_CAGE_API_KEY}&no_annotations=1&limit=1&language=en`,
          { withCredentials: false }
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
      const { data } = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`, { withCredentials: false });
      if (data && data.address) {
        parseAddressComponents(data);
      }
    } catch (error) {
      console.error("Reverse geocoding error", error);
    }
  };

  // ── Pincode → auto City/State (India Post; free, no key) ────────────────────
  const lookupPincode = async (pin: string) => {
    const code = (pin || "").trim();
    if (!/^\d{6}$/.test(code) || code === lastPincodeLookup.current) return;
    lastPincodeLookup.current = code;
    setPincodeLoading(true);
    try {
      const { data } = await axios.get(`https://api.postalpincode.in/pincode/${code}`, { withCredentials: false });
      const postOffices = data?.[0]?.PostOffice || [];

      if (postOffices.length > 0) {
        // Get the first/main post office entry
        const po = postOffices[0];

        // India Post → mirror into the same auto-sync path used by geocoding.
        const country = po.Country || "India";
        const foundCountry = countryOptions.find(
          (c) => c.label.toLowerCase() === country.toLowerCase()
        );
        if (foundCountry && addressData.country !== foundCountry.value) {
          handleAddressCountryChange(index, foundCountry.value, setFieldValue);
        }
        if (po.State) setPendingGeoState(po.State);

        // Prefer Division/District over Name/Block for better city matching
        const cityName = po.Division || po.District || po.Block || po.Name || "";
        if (cityName) setPendingGeoCity(cityName);
      }
    } catch (error) {
      console.warn("Pincode lookup failed", error);
    } finally {
      setPincodeLoading(false);
    }
  };

  // Auto-lookup once a full 6-digit pincode is present.
  useEffect(() => {
    const code = (addressData.pincode || "").trim();
    if (/^\d{6}$/.test(code)) lookupPincode(code);
  }, [addressData.pincode]);

  const copyCoordinates = () => {
    const lat = addressData.latitude;
    const lng = addressData.longitude;
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
    ["latitude", "longitude", "googleMapLink"].forEach((f) =>
      setFieldValue(`${addressPath}.${f}`, "")
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowDropdown(true);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          // Add &addressdetails=1 to get address components in search results
          // Add &countrycodes=in to prioritize India (for Indian locations)
          const { data } = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1&countrycodes=in`,
            { withCredentials: false }
          );
          if (data && data.length > 0) {
            setSearchResults(data);
          }
        } catch (error) {
          console.error("Geocoding error", error);
        }
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults.length > 0) {
        selectPlace(searchResults[0]);
      } else if (searchQuery.length > 2) {
        // Force immediate search if they press enter before debounce finishes
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        try {
          const { data } = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=in`,
            { withCredentials: false }
          );
          if (data && data.length > 0) {
            setSearchResults(data);
            selectPlace(data[0]);
          }
        } catch (error) {
          console.error("Geocoding error", error);
        }
      }
    }
  };

  const selectPlace = (place: any) => {
    setSearchQuery(place.display_name);
    setShowDropdown(false);
    // Set project address and reverse geocode to get detailed address components
    setFieldValue(`${addressPath}.projectAddress`, place.display_name);
    updateLocation(parseFloat(place.lat), parseFloat(place.lon), place);
  };

  const parseAddressComponents = (result: any) => {
    // Parse address components from Nominatim result (both reverse geocode and search with addressdetails=1)
    const components = result.address || {};
    const display = result.display_name || "";

    // ALWAYS set the formatted address (display_name) from Nominatim
    // This ensures auto-fill works every time the user updates the pin
    if (display) {
      setFieldValue(`${addressPath}.projectAddress`, display);
    }

    // Extract address fields with multiple fallbacks
    // Prefer city over district to get the most recognizable city name
    const city = components.city ||
                 components.town ||
                 components.municipality ||
                 components.county ||
                 components.village ||
                 components.district ||
                 "";

    const state = components.state ||
                  components.province ||
                  components.region ||
                  "";

    const country = components.country || "";
    const pincode = components.postcode || "";

    // Set pincode if available
    if (pincode) {
      setFieldValue(`${addressPath}.pincode`, pincode);
    }

    // Auto-sync country, state, and city
    if (country) {
       const foundCountry = countryOptions.find(c =>
         c.label.toLowerCase() === country.toLowerCase() ||
         country.toLowerCase().includes(c.label.toLowerCase())
       );

       if (foundCountry && addressData.country !== foundCountry.value) {
          handleAddressCountryChange(index, foundCountry.value, setFieldValue);
       }

       // Queue state and city to be synced once the dropdown options load from the backend
       if (state) setPendingGeoState(state);

       // For city, prefer the one from components, but also try extracting from display_name
       let cityToSet = city;
       if (!cityToSet && display) {
         // Try to extract city from display name (usually second or third component)
         const parts = display.split(',').map((p: string) => p.trim());
         // Filter out short parts and get a reasonable city name
         cityToSet = parts.find((p: string) => p.length > 2 && p.length < 30) || "";
       }

       if (cityToSet) setPendingGeoCity(cityToSet);
    }
  };

  const onMapClick = (e: L.LeafletMouseEvent) => {
    updateLocation(e.latlng.lat, e.latlng.lng);
  };

  const locateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          alert(`Error getting location: ${error.message}`);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="p-0 border rounded bg-white mb-6 overflow-hidden shadow-sm">
      <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-light">
         <h5 className="mb-0 fw-bold d-flex align-items-center text-primary gap-2" style={{ fontFamily: 'Inter' }}>
            <LocationOn className="me-1" /> Smart Location Details
            {locationVerified ? (
              <span className="badge d-inline-flex align-items-center gap-1" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                <CheckCircle style={{ fontSize: 14 }} /> Location set
              </span>
            ) : (
              <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                Not set
              </span>
            )}
         </h5>
         <Tooltip title="Use My Current Location">
           <IconButton color="primary" onClick={locateMe} size="small" style={{ backgroundColor: '#e1f0ff' }}>
             <MyLocation fontSize="small" />
           </IconButton>
         </Tooltip>
      </div>

      <div className="p-5">
        <div className="position-relative mb-5">
          <label className="form-label fw-bold mb-2">Search Address</label>
          <input
            type="text"
            className="form-control form-control-lg form-control-solid border"
            placeholder="Start typing an address, building, or area (press Enter to select)..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ paddingLeft: '45px', fontWeight: 500, fontSize: '15px' }}
          />
          <LocationOn style={{ position: 'absolute', top: '44px', left: '15px', color: '#B5B5C3' }} />
          
          {showDropdown && searchResults.length > 0 && (
            <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
              {searchResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className="p-3 border-bottom cursor-pointer text-dark"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => { e.preventDefault(); selectPlace(result); }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <LocationOn fontSize="small" className="me-2 text-muted" />
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: "450px", borderRadius: "12px", overflow: "hidden", border: "1px solid #E4E6EF", marginBottom: "24px", boxShadow: "0px 4px 12px rgba(0,0,0,0.05)", position: 'relative', zIndex: 1 }}>
          <MapContainer 
            center={[center.lat, center.lng]} 
            zoom={markerPosition ? 16 : 11} 
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer 
                name="Carto Light" 
                checked={(localStorage.getItem("preferredMapStyle") || "Google Satellite (Hybrid)") === "Carto Light"}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer 
                name="Esri Street Map" 
                checked={(localStorage.getItem("preferredMapStyle") || "Google Satellite (Hybrid)") === "Esri Street Map"}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer 
                name="Google Satellite (Hybrid)" 
                checked={(localStorage.getItem("preferredMapStyle") || "Google Satellite (Hybrid)") === "Google Satellite (Hybrid)"}
              >
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxZoom={20}
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer 
                name="OpenStreetMap" 
                checked={(localStorage.getItem("preferredMapStyle") || "Google Satellite (Hybrid)") === "OpenStreetMap"}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>
           
            {/* Show all search results as clickable markers */}
            {searchResults.length > 0 && !markerPosition && (
              searchResults.map((result, idx) => (
                <Marker
                  key={idx}
                  position={[parseFloat(result.lat), parseFloat(result.lon)]}
                  title={result.display_name}
                  eventHandlers={{
                    click: () => selectPlace(result),
                  }}
                >
                </Marker>
              ))
            )}

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
            <MapEvents onMapClick={onMapClick} />
            <MapUpdater center={center} zoom={markerPosition ? 16 : 11} bounds={mapBounds} />
            <LayerTracker />
            <MapInvalidator />
          </MapContainer>

          {!markerPosition && (
            <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', pointerEvents: 'none', zIndex: 1000 }}>
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

        <div className="accordion mt-5" id={`advancedLocation-${index}`}>
          <div className="accordion-item border rounded">
            <h2 className="accordion-header">
              <button className="accordion-button collapsed bg-light fw-bold" type="button" data-bs-toggle="collapse" data-bs-target={`#collapseLocation-${index}`}>
                Advanced Location Details (Manual Override)
              </button>
            </h2>
            <div id={`collapseLocation-${index}`} className="accordion-collapse collapse" data-bs-parent={`#advancedLocation-${index}`}>
               <Grid container spacing={4} className="bg-white p-5 rounded">
                  <Grid item xs={12} md={4}>
                    <DropDownInput
                      isRequired={false}
                      formikField={`${addressPath}.country`}
                      inputLabel="Country"
                      options={countryOptions}
                      onChange={(val: any) => handleAddressCountryChange(index, val?.value, setFieldValue)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DropDownInput
                      isRequired={false}
                      formikField={`${addressPath}.state`}
                      inputLabel="State"
                      options={(states || []).map((x: any) => ({ value: x.id, label: x.name }))}
                      onChange={(val: any) => handleAddressStateChange(index, val?.value, addressData.country, setFieldValue)}
                      disabled={!addressData.country}
                    />
                    {!addressData.country && (
                      <span className="text-muted mt-1 d-block" style={{ fontSize: 11 }}>
                        Select a country first
                      </span>
                    )}
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DropDownInput
                      isRequired={false}
                      formikField={`${addressPath}.city`}
                      inputLabel="City"
                      options={(cities || []).map((x: any) => ({ value: x.id, label: x.name }))}
                      disabled={!addressData.state}
                    />
                    {!addressData.state && (
                      <span className="text-muted mt-1 d-block" style={{ fontSize: 11 }}>
                        Select a state first
                      </span>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextInput formikField={`${addressPath}.pincode`} label="Pincode" isRequired={false} />
                    {pincodeLoading ? (
                      <span className="text-muted d-inline-flex align-items-center gap-1 mt-1" style={{ fontSize: 12 }}>
                        <CircularProgress size={12} /> Looking up city & state…
                      </span>
                    ) : (
                      <span className="text-muted mt-1 d-block" style={{ fontSize: 11 }}>
                        Enter a 6-digit Indian pincode to auto-fill City &amp; State.
                      </span>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                     <TextInput formikField={`${addressPath}.projectAddress`} label="Formatted Address" isRequired={false} />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextInput formikField={`${addressPath}.latitude`} label="Latitude" isRequired={false} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextInput formikField={`${addressPath}.longitude`} label="Longitude" isRequired={false} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextInput
                      formikField={`${addressPath}.googleMapLink`}
                      label="Google Map Link"
                      isRequired={false}
                    />
                  </Grid>
               </Grid>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
