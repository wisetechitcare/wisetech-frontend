import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, LayersControl, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Box, Chip, CircularProgress, IconButton, InputAdornment, TextField, Typography, Paper, List, ListItemButton, ListItemText } from "@mui/material";
import { LocationOn, MyLocation } from "@mui/icons-material";

// Leaflet ships its marker images as separate assets that the bundler rewrites;
// without this the default icon 404s and the pin renders invisible.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Geocoding runs on Nominatim (OpenStreetMap) — no key, no billing.
 *
 * Both keys this app carries are dead: VITE_APP_OPEN_CAGE_API_KEY returns
 * "401 unknown API key" and VITE_APP_GOOGLE_MAP_KEY returns REQUEST_DENIED
 * (billing disabled). Map TILES still draw because Google's tile endpoint
 * ignores the key, which is why the map looked fine while every field stayed
 * blank. Nominatim asks for ≤1 request/sec — the search below is debounced and
 * a pin drop is one call, so a form stays well inside that.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org";

/** Where the pin lands when nothing is set yet — roughly the middle of India. */
const DEFAULT_CENTER: [number, number] = [19.076, 72.8777];

/**
 * Reverse-geocoding detail levels.
 *
 * POINT_ZOOM (18, building) resolves the street under the pin. Nominatim happens to
 * default to it, but the default is not contractual and a coarser one would quietly
 * return a suburb centroid instead of the address.
 *
 * AREA_ZOOM (14, suburb/locality) is only used to read the postcode. Postcodes tagged
 * on individual buildings are sparse and inconsistent in OSM, so reading them at
 * building level makes the same locality report different codes from click to click;
 * the locality boundary carries one code for the whole area.
 */
const POINT_ZOOM = 18;
const AREA_ZOOM = 14;

export interface GeoPick {
  lat: number;
  lng: number;
  /** Nominatim's full display_name — street through to country. */
  formatted: string;
  /**
   * Just the street line: house number, road, and the named place it sits in.
   *
   * `formatted` repeats the city, district, state, postcode and country that a form
   * already collects in their own fields, so writing it into an "Address" input
   * duplicates half the form. Callers that have those fields separately want this.
   */
  street: string;
  country: string;
  state: string;
  city: string;
  locality: string;
  postcode: string;
  googleMapLink: string;
}

interface SmartLocationPickerProps {
  lat?: number | string | null;
  lng?: number | string | null;
  onPick: (geo: GeoPick) => void;
  /** Rendered under the map — the caller's manual-override fields. */
  children?: React.ReactNode;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Nominatim's `address` bag varies by country — a city arrives as `city`, `town`,
 * `village` or `municipality` depending on how OSM classifies the place. Collapse
 * those to the single field the form actually has.
 */
const toGeoPick = (result: any): GeoPick => {
  const a = result?.address ?? {};
  const lat = Number(result?.lat);
  const lng = Number(result?.lon);

  // Street line, most specific first. `name` catches a named building or complex that
  // OSM records without a house number. Duplicates are dropped because Nominatim often
  // repeats the same string across name/road/neighbourhood for a single-entity result.
  const street = Array.from(
    new Set(
      [
        result?.name,
        [a.house_number, a.road].filter(Boolean).join(" "),
        a.neighbourhood ?? a.residential,
        a.suburb,
      ]
        .map((part) => (part ?? "").toString().trim())
        .filter(Boolean)
    )
  ).join(", ");

  return {
    lat,
    lng,
    formatted: result?.display_name ?? "",
    street,
    country: a.country ?? "",
    state: a.state ?? a.province ?? "",
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "",
    locality: a.suburb ?? a.neighbourhood ?? a.city_district ?? a.residential ?? "",
    postcode: a.postcode ?? "",
    googleMapLink: `https://www.google.com/maps/@${lat},${lng},17z`,
  };
};

/** Keeps the map centred on the pin when it moves from outside (search, GPS). */
function Recenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 15));
  }, [position?.[0], position?.[1]]);
  return null;
}

/** Leaflet measures its container on mount; inside a wizard step that container is
 *  still laying out, so tiles render into a stale size until we invalidate. */
function Invalidate() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize({ animate: false }), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function ClickToDrop({ onDrop }: { onDrop: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onDrop(e.latlng.lat, e.latlng.lng) });
  return null;
}

export const SmartLocationPicker: React.FC<SmartLocationPickerProps> = ({ lat, lng, onPick, children }) => {
  const latNum = num(lat);
  const lngNum = num(lng);
  const hasPin = latNum !== null && lngNum !== null;
  const position: [number, number] | null = hasPin ? [latNum, lngNum] : null;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Third-party geocoding goes through plain fetch, never the app's axios — that
  // instance carries our JWT and treats any 401 as a session end, so a geocoder
  // rejecting our request would otherwise log the user out mid-form.
  const searchPlaces = useCallback(async (q: string): Promise<any[]> => {
    const res = await fetch(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const reverseGeocode = useCallback(async (
    pointLat: number,
    pointLng: number,
    zoom: number = POINT_ZOOM,
  ): Promise<any | null> => {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=${zoom}&lat=${pointLat}&lon=${pointLng}`
    );
    const data = await res.json();
    return data?.address ? data : null;
  }, []);

  // Debounced forward search — one request per pause in typing, not per keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchPlaces(q);
        if (!cancelled) {
          setSuggestions(results);
          setShowSuggestions(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchPlaces]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const resolvePoint = useCallback(
    async (pointLat: number, pointLng: number) => {
      setResolving(true);
      try {
        const result = await reverseGeocode(pointLat, pointLng);
        if (result) {
          const pick = toGeoPick(result);

          /**
           * Take the postcode from the enclosing AREA, not from whatever element the
           * pin happened to land on.
           *
           * A building-level match returns that element's own `postcode` tag, and OSM
           * tags those sparsely and inconsistently — so two clicks a street apart in
           * one locality can come back with different PIN codes, or one with none.
           * The suburb/locality boundary carries a single code for the whole area,
           * which is the one a form actually wants.
           *
           * Sequential, not parallel: Nominatim asks for ≤1 request/second, and
           * awaiting the first spaces the second by its own round-trip. A pin drop is
           * one deliberate user action, so this stays well inside the policy.
           *
           * Best-effort — the precise postcode is kept if the area lookup gives none.
           */
          try {
            const area = await reverseGeocode(pointLat, pointLng, AREA_ZOOM);
            const areaPostcode = area?.address?.postcode;
            if (areaPostcode) pick.postcode = String(areaPostcode);
          } catch {
            /* keep the fine-grained postcode */
          }

          onPick(pick);
          return;
        }
      } catch {
        /* fall through to the coordinates-only pick below */
      } finally {
        setResolving(false);
      }
      // Reverse geocoding can fail or come back empty (ocean, quota). The pin is
      // still a real answer, so record the coordinates rather than dropping it.
      onPick({
        lat: pointLat,
        lng: pointLng,
        formatted: "",
        street: "",
        country: "",
        state: "",
        city: "",
        locality: "",
        postcode: "",
        googleMapLink: `https://www.google.com/maps/@${pointLat},${pointLng},17z`,
      });
    },
    [reverseGeocode, onPick],
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setResolving(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolvePoint(pos.coords.latitude, pos.coords.longitude),
      () => setResolving(false),
      { enableHighAccuracy: true },
    );
  };

  const markerHandlers = useMemo(
    () => ({
      dragend: (e: any) => {
        const p = e.target.getLatLng();
        resolvePoint(p.lat, p.lng);
      },
    }),
    [resolvePoint],
  );

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          bgcolor: "action.hover",
          borderRadius: "8px 8px 0 0",
          border: 1,
          borderColor: "divider",
        }}
      >
        <LocationOn fontSize="small" color="primary" />
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Smart Location Details</Typography>
        <Chip
          size="small"
          label={hasPin ? "Set" : "Not set"}
          color={hasPin ? "success" : "default"}
          variant="outlined"
          sx={{ height: 20, fontSize: 11 }}
        />
        <Box sx={{ flex: 1 }} />
        {resolving && <CircularProgress size={16} />}
        <IconButton size="small" onClick={useMyLocation} title="Use my current location">
          <MyLocation fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ border: 1, borderTop: 0, borderColor: "divider", borderRadius: "0 0 8px 8px", p: 2 }}>
        {/* Search */}
        <Box ref={boxRef} sx={{ position: "relative", mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>Search Address</Typography>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Start typing an address, building, or area (press Enter to select)..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn fontSize="small" color="disabled" />
                </InputAdornment>
              ),
              endAdornment: searching ? (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ) : undefined,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestions[0]) {
                  onPick(toGeoPick(suggestions[0]));
                  setQuery(suggestions[0].display_name ?? "");
                  setShowSuggestions(false);
                }
              }
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <Paper elevation={4} sx={{ position: "absolute", zIndex: 1200, left: 0, right: 0, mt: 0.5, maxHeight: 260, overflowY: "auto" }}>
              <List dense disablePadding>
                {suggestions.map((s, i) => (
                  <ListItemButton
                    key={`${s.place_id ?? s.display_name}-${i}`}
                    onClick={() => {
                      onPick(toGeoPick(s));
                      setQuery(s.display_name ?? "");
                      setShowSuggestions(false);
                    }}
                  >
                    <ListItemText primary={s.display_name} primaryTypographyProps={{ fontSize: 13 }} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        {/* The wrapper carries the height on purpose: a global
            `.leaflet-container { height: 100% !important }` in _init.scss beats any
            height set on the map itself, so without a sized parent the 100% resolves
            against nothing and the map collapses to zero height (invisible). */}
        <Box sx={{ position: "relative", height: 340, borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider" }}>
          <MapContainer
            center={position ?? DEFAULT_CENTER}
            zoom={position ? 16 : 10}
            style={{ width: "100%" }}
            scrollWheelZoom
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Map">
                <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={["mt0", "mt1", "mt2", "mt3"]} attribution="&copy; Google Maps" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={["mt0", "mt1", "mt2", "mt3"]} attribution="&copy; Google Maps" />
              </LayersControl.BaseLayer>
            </LayersControl>
            <Invalidate />
            <Recenter position={position} />
            <ClickToDrop onDrop={resolvePoint} />
            {position && <Marker position={position} draggable eventHandlers={markerHandlers} />}
          </MapContainer>
          <Box
            sx={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 500,
              bgcolor: "rgba(15,23,42,0.85)",
              color: "#fff",
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              fontSize: 12,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            Click anywhere on the map to drop a pin — drag the pin to fine-tune
          </Box>
        </Box>

        {children}
      </Box>
    </Box>
  );
};

export default SmartLocationPicker;
