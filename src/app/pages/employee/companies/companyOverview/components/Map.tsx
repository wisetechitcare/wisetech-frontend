import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMapEvents,
  useMap,
  Polyline
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useNavigate } from "react-router-dom";
import {
  LocationOn as MapPinIcon,
  Phone as PhoneIcon,
  Email as MailIcon,
  Work as BriefcaseIcon,
  CurrencyRupee as RupeeIcon,
  Business as CompanyIcon,
  PushPin as PinIcon,
  Navigation as NavigationIcon
} from "@mui/icons-material";
import { flagLocationError } from "@services/companies";

// Leaflet icon fix for React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// 1. Color Pool for Automatic Country Mapping
const COLOR_POOL = [
  "#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6",
  "#e67e22", "#1abc9c", "#34495e", "#d35400", "#27ae60",
  "#8e44ad", "#2980b9", "#f39c12", "#c0392b", "#16a085"
];

// 2. Deterministic Hash-Based Color Mapping (No collisions, No storage)
const getCountryColor = (country?: string) => {
  if (!country || typeof country !== "string" || country === "Unknown") {
    return "#95a5a6"; // neutral fallback
  }

  const normalized = country.trim().toUpperCase();

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Pick color from pool using absolute hash
  return COLOR_POOL[Math.abs(hash) % COLOR_POOL.length];
};

// Define a stable default icon to avoid recreations and provide a safe fallback
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

function ZoomHandler({ setZoom }: { setZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  return null;
}

function MapCenterHandler({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (userLocation && !hasCentered.current) {
      map.setView([userLocation.lat, userLocation.lng], 13);
      hasCentered.current = true;
    }
  }, [userLocation, map]);

  return null;
}

const userIcon = L.divIcon({
  className: "user-location-marker",
  html: '<div class="dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// 3. Relationship Visualization Helpers
const createCurve = (from: [number, number], to: [number, number]) => {
  const midLat = (from[0] + to[0]) / 2;
  const midLng = (from[1] + to[1]) / 2;

  // Calculate dynamic offset based on distance for a professional curve
  const dist = Math.sqrt(Math.pow(to[0] - from[0], 2) + Math.pow(to[1] - from[1], 2));
  const curveOffset = dist * 0.15; 

  // Control point for quadratic bezier
  const controlPoint: [number, number] = [midLat + curveOffset, midLng];

  // Generate smooth points
  const points: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const lat = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * controlPoint[0] + t * t * to[0];
    const lng = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * controlPoint[1] + t * t * to[1];
    points.push([lat, lng]);
  }
  return points;
};

function MapClickHandler({ onClick }: { onClick: () => void }) {
  useMapEvents({
    click: (e) => {
      // Only clear if we clicked the map background, not a marker
      if ((e.originalEvent.target as HTMLElement).classList.contains('leaflet-container')) {
        onClick();
      }
    },
  });
  return null;
}

const getInitials = (name: string) => {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase() || "??";
};

const createCustomIcon = (initials: string, color: string, imageUrl?: string, entityType?: string, isRelated: boolean = false, isDimmed: boolean = false) => {
  try {
    // If we have no initials and no image, fallback to theme-colored circle
    const finalColor = color || "#3498db";

    // Scale based on entity type
    let size = 34;
    let innerSize = 28;
    let offset = 3;
    let fontSize = 11;

    if (entityType === 'sub-company') {
      size = 30;
      innerSize = 24;
      offset = 3;
      fontSize = 10;
    } else if (entityType === 'branch') {
      size = 24;
      innerSize = 18;
      offset = 3;
      fontSize = 8;
    }

    // FALLBACK LEVEL 1 & 2: Custom Avatar or Initials
    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(${isRelated ? 1.4 : 1}); z-index: ${isRelated ? 1000 : 0}; opacity: ${isDimmed ? 0.4 : 1};">
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          border-radius: 50% 50% 50% 0; 
          background: ${finalColor}; 
          position: absolute; 
          transform: rotate(-45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: ${entityType === 'sub-company' ? '2px solid white' : 'none'};
        "></div>
        <div style="
          width: ${innerSize}px; 
          height: ${innerSize}px; 
          position: absolute; 
          top: ${offset}px; 
          left: ${offset}px; 
          background: white; 
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 1;
        ">
          <span style="color: ${finalColor}; font-weight: bold; font-size: ${fontSize}px; z-index: 1;">${initials || "??"}</span>
          ${imageUrl ?
        `<div style="
              position: absolute;
              top: 0; left: 0;
              width: 100%; height: 100%;
              background-image: url('${imageUrl}');
              background-size: cover;
              background-position: center;
              z-index: 2;
            "></div>` : ""
      }
        </div>
      </div>
    `;

    return L.divIcon({
      className: "custom-marker-icon",
      html: html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
      tooltipAnchor: [size / 2, -size / 2],
    });
  } catch (error) {
    console.error("Critical: Failed to create custom icon", error);
    return L.divIcon({ html: '<div style="background: #3498db; width: 20px; height: 20px; border-radius: 50%;"></div>' });
  }
};

// Extracted Marker component with enhanced safety and crash-proofing
const LocationMarker = React.memo(({
  loc,
  isContact,
  isCompany,
  isProject,
  zoom,
  handleGoToLocation,
  activeMarkerId,
  setActiveMarkerId,
  activeCompany,
  setActiveCompany
}: {
  loc: any;
  isContact: boolean;
  isCompany: boolean;
  isProject: boolean;
  zoom: number;
  handleGoToLocation: (item: any) => void;
  activeMarkerId: string | null;
  setActiveMarkerId: React.Dispatch<React.SetStateAction<string | null>>;
  activeCompany: any | null;
  setActiveCompany: (company: any | null) => void;
}) => {
  const navigate = useNavigate();

  // 1. Position Validation
  const position: [number, number] = [loc?.lat, loc?.lng];
  if (
    typeof position[0] !== "number" ||
    typeof position[1] !== "number" ||
    isNaN(position[0]) ||
    isNaN(position[1])
  ) {
    return null;
  }

  // 2. Safe Data Extraction
  const item = loc.item || loc;
  const itemTitle =
    item.name ||
    item.companyName ||
    item.subCompanyName ||
    item.branchName ||
    item.fullName ||
    item.title ||
    "Unnamed";

  const imageUrl = isContact ? loc.item?.profilePhoto : isCompany ? loc.item?.logo : undefined;
  const initials = useMemo(() => getInitials(itemTitle || ""), [itemTitle]);

  // 3. Country-based Color Logic
  const markerColor = useMemo(() => {
    if (!isProject) return "#e74c3c";
    return getCountryColor(loc.country);
  }, [isProject, loc.country]);

  // Related state for visual highlighting
  const isRelated = useMemo(() => {
    if (!activeCompany) return false;
    return (
      item.id === activeCompany.id ||
      item.mainCompanyId === activeCompany.id ||
      item.companyId === activeCompany.id
    );
  }, [activeCompany, item]);

  const isDimmed = activeCompany && !isRelated;

  // 5. Location Error State (explicit submit — no auto-save)
  // ⚠️ Must be declared BEFORE the icon memo so the icon reacts to live state
  const [isError, setIsError] = useState<boolean>(
    (loc.item?.isLocationIncorrect ?? false) as boolean
  );
  const [remark, setRemark] = useState<string>(
    (loc.item?.locationRemark ?? "") as string
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConnection, setShowConnection] = useState(false);

  // 4. Safe Icon handling — warning marker reacts to live isError state
  const icon = useMemo(() => {
    if (isError) {
      return L.divIcon({
        className: "custom-warning-marker",
        html: `
          <div class="warning-wrapper" style="transform: scale(${isRelated ? 1.4 : 1}); opacity: ${isDimmed ? 0.4 : 1};">
            <svg viewBox="0 0 24 24" class="warning-icon-svg">
              <path fill="white" d="M1 21h22L12 2 1 21zm11-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    }
    try {
      const generatedIcon = createCustomIcon(initials, markerColor, imageUrl, loc.entityType, isRelated, isDimmed as boolean);
      return generatedIcon;
    } catch (error) {
      return L.divIcon({ html: '<div style="background: #3498db; width: 20px; height: 20px; border-radius: 50%;"></div>' });
    }
  }, [initials, markerColor, imageUrl, isError, isRelated, isDimmed]);

  const id = loc.id || loc.projectId || loc.item?.id;
  const isActive = activeMarkerId === id;

  const popupAddress = useMemo(() => {
    const rawAddress = item.address || item.fullAddress || item.addressLine1;
    if (rawAddress && rawAddress.trim() !== "") return rawAddress.trim();

    const parts = [
      item.locality || item.area,
      item.city,
      item.state,
      item.country,
      item.zipCode || item.postalCode
    ].filter(p => p && typeof p === "string" && p.trim() !== "");

    return parts.join(", ");
  }, [item]);

  // 4. Interaction Handlers
  const eventHandlers = useMemo(() => ({
    mouseover: () => setActiveMarkerId(id),
    mouseout: () => setActiveMarkerId(null),
    click: () => {
      setActiveMarkerId(id);
      // If it's a company, set it as the active hub for relationship visualization
      if (loc.entityType === 'company') {
        setActiveCompany(item);
      }
    },
  }), [id, setActiveMarkerId, setActiveCompany, item, loc.entityType]);

  const handleNavigation = () => {
    if (!id) return;
    if (isProject) navigate(`/projects/${id}`);
    else if (isCompany) navigate(`/companies/${id}`);
    else if (isContact) navigate(`/contacts/${id}`);
  };

  // (state is declared above the icon memo — see line ~300)

  // 6. Relationship Data (Sub-company / Branch connections)
  const parent = loc.item?.mainCompany || loc.item?.company;
  const parentName = parent?.companyName || "Unknown";
  const parentLat = parent ? parseFloat(parent.latitude) : NaN;
  const parentLng = parent ? parseFloat(parent.longitude) : NaN;
  const hasParentCoords = !isNaN(parentLat) && !isNaN(parentLng);

  const childLat = position[0];
  const childLng = position[1];

  const handleSubmitError = async () => {
    const itemId = loc.item?.id || loc.id;
    if (!itemId) return;
    setIsSubmitting(true);
    try {
      const payload = {
        isLocationIncorrect: isError,
        // Clear remark when error is unchecked
        locationRemark: isError ? (remark || "") : "",
      };

      // Determine entity type for the unified API
      let type = 'company';
      if (isProject) {
        type = 'project';
      } else if (isContact) {
        type = 'contact';
      } else if (loc.entityType === 'sub-company' || loc.entityType === 'subCompany') {
        type = 'subCompany';
      } else if (loc.entityType === 'branch') {
        type = 'branch';
      } else {
        type = 'company';
      }

      await flagLocationError(type, itemId, payload);

      // Persist state into item object so re-mounts don't revert
      if (loc.item) {
        loc.item.isLocationIncorrect = isError;
        loc.item.locationRemark = isError ? remark : "";
      }
      // If error was cleared, also clear local remark state
      if (!isError) setRemark("");
    } catch (err) {
      console.error("Failed to save location error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-saves false immediately when user unchecks the error toggle
  const handleClearError = async () => {
    const itemId = loc.item?.id || loc.id;
    if (!itemId) return;
    setIsError(false);
    setRemark("");
    setIsSubmitting(true);
    try {
      let type = 'company';
      if (isProject) type = 'project';
      else if (isContact) type = 'contact';
      else if (loc.entityType === 'sub-company' || loc.entityType === 'subCompany') type = 'subCompany';
      else if (loc.entityType === 'branch') type = 'branch';

      await flagLocationError(type, itemId, { isLocationIncorrect: false, locationRemark: "" });

      if (loc.item) {
        loc.item.isLocationIncorrect = false;
        loc.item.locationRemark = "";
      }
    } catch (err) {
      // Revert UI if save fails
      setIsError(true);
      console.error("Failed to clear location error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={eventHandlers}
      zIndexOffset={isActive ? 1000 : 0}
    >
      {showConnection && hasParentCoords && (
        <Polyline
          positions={[
            [childLat, childLng],
            [parentLat, parentLng],
          ]}
          pathOptions={{
            color: "#2563eb",
            weight: 2,
            dashArray: "6, 6",
          }}
        />
      )}
      {isActive && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -10]}
          className={`custom-marker-label ${isActive ? 'active' : ''}`}
        >
          {/* Visual Debug: Show country in tooltip */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 700 }}>
              {itemTitle || "Unknown"}
            </span>
            <span style={{ fontSize: "10px", color: "#666", textTransform: "capitalize" }}>
              {loc.entityType || loc.country || "Location"}
            </span>
          </div>
        </Tooltip>
      )}
      <Popup maxWidth={300} minWidth={280}>
        {isCompany ? (
          /* Specialized Company UI */
          <div className={`company-popup${isError ? " popup-error" : ""}`}>
            <div className="company-header">
              <div className="company-avatar">
                {(loc.item?.companyName || loc.item?.name || loc.item?.subCompanyName || loc.item?.branchName || "C").charAt(0).toUpperCase()}
              </div>
              <div className="company-title-block">
                <h3 className="company-name" onClick={handleNavigation}>
                  {loc.item?.companyName || loc.item?.name || loc.item?.subCompanyName || loc.item?.branchName || "No Name"}
                </h3>
                <span className="company-type">
                  {loc.entityType === 'branch' ? 'Branch' : loc.entityType === 'sub-company' ? 'Sub Company' : 'Company'}
                </span>
              </div>
            </div>

            <div className="company-body">
              {/* Saved remark (read-only display) */}
              {isError && remark && (
                <div className="error-remark">⚠ {remark}</div>
              )}

              {loc.item?.email && (
                <div className="company-row">
                  <MailIcon style={{ fontSize: "14px", color: "#64748b" }} />
                  <span style={{ fontSize: "12px" }}>{loc.item.email}</span>
                </div>
              )}

                <div className="company-row">
                  <MapPinIcon style={{ fontSize: "16px", color: "#64748b" }} />
                  <span>
                    {popupAddress && popupAddress.trim() !== ""
                      ? popupAddress
                      : "Address not available"}
                  </span>
                </div>

                {/* Relationship Visualization UI */}
                {(loc.entityType === 'sub-company' || loc.entityType === 'branch') && parent && (
                  <div className="relation-info">
                    <div className="relation-text">
                      {loc.entityType === 'sub-company' ? 'Sub-company of: ' : 'Branch of: '}
                      <span className="relation-name">{parentName}</span>
                    </div>
                    {hasParentCoords && (
                      <label className="relation-toggle">
                        <input
                          type="checkbox"
                          checked={showConnection}
                          onChange={() => setShowConnection(!showConnection)}
                        />
                        Show Main Company
                      </label>
                    )}
                  </div>
                )}
              </div>

            {/* Location Error Section */}
            <div className="error-section">
              <label className="error-toggle">
                <input
                  type="checkbox"
                  checked={isError}
                  onChange={() => setIsError(!isError)}
                  style={{ accentColor: "#ef4444", cursor: "pointer" }}
                />
                <span style={{ color: isError ? "#dc2626" : "#64748b" }}>⚠ Location Error</span>
              </label>
              {isError && (
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Describe the issue (optional)"
                  rows={2}
                  style={{
                    width: "100%", marginTop: "6px",
                    fontSize: "11px", border: "1px solid #fca5a5",
                    borderRadius: "6px", padding: "4px 8px",
                    resize: "none", outline: "none",
                    color: "#374151", background: "white",
                    boxSizing: "border-box",
                  }}
                />
              )}
              <button
                className="submit-btn"
                disabled={isSubmitting}
                onClick={handleSubmitError}
              >
                {isSubmitting ? "Saving..." : "Submit"}
              </button>
            </div>

            <button className="go-button" onClick={() => handleGoToLocation(loc.item)}>
              <NavigationIcon style={{ fontSize: "16px" }} />
              Go to Location
            </button>
          </div>
        ) : (
          /* Unified Layout for Projects and Contacts */
          <div className={`popup-card${isError ? " popup-error" : ""}`}>
            <div className="popup-header">
              <h3 className="popup-title" onClick={handleNavigation}>
                {isContact
                  ? (loc.item?.fullName || loc.item?.name || "No Contact Name")
                  : (loc.item?.title || "No Project Title")
                }
              </h3>
            </div>

            <div className="popup-body">
              {/* Saved remark (read-only display) */}
              {isError && remark && (
                <div className="error-remark">⚠ {remark}</div>
              )}

              {/* Status Row */}
              {loc.item?.status?.name && (
                <div className="status-row">
                  <span className="status-badge" style={{ backgroundColor: loc.item.status.color || "#3b82f6" }}>
                    {loc.item.status.name}
                  </span>
                </div>
              )}

              {/* Additional Info Rows (Compact) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {isProject && loc.item?.cost && (
                  <div className="info-row">
                    <RupeeIcon style={{ fontSize: "14px", color: "#64748b" }} />
                    <span style={{ fontWeight: 500, color: "#1e293b" }}>
                      ₹{loc.item.cost.toLocaleString()}
                    </span>
                  </div>
                )}

                {isProject && loc.item?.company?.companyName && (
                  <div className="info-row">
                    <CompanyIcon style={{ fontSize: "14px", color: "#64748b" }} />
                    <span>{loc.item.company.companyName}</span>
                  </div>
                )}

                {isContact && loc.item?.roleInCompany && (
                  <div className="info-row">
                    <BriefcaseIcon style={{ fontSize: "14px", color: "#64748b" }} />
                    <span>{loc.item.roleInCompany}</span>
                  </div>
                )}

                {isContact && loc.item?.email && (
                  <div className="info-row">
                    <MailIcon style={{ fontSize: "14px", color: "#64748b" }} />
                    <span style={{ fontSize: "12px" }}>{loc.item.email}</span>
                  </div>
                )}

                {isContact && loc.item?.phone && (
                  <div className="info-row">
                    <PhoneIcon style={{ fontSize: "14px", color: "#64748b" }} />
                    <span style={{ fontSize: "12px" }}>{loc.item.phone}</span>
                  </div>
                )}
              </div>

              {/* Address Row */}
              <div className="address-row">
                <MapPinIcon style={{ fontSize: "16px" }} className="address-icon" />
                <span>
                  {popupAddress && popupAddress.trim() !== ""
                    ? popupAddress
                    : "Address not available"}
                </span>
              </div>
            </div>

            {/* Location Error Section */}
            <div className="error-section">
              <label className="error-toggle">
                <input
                  type="checkbox"
                  checked={isError}
                  onChange={() => isError ? handleClearError() : setIsError(true)}
                  disabled={isSubmitting}
                  style={{ accentColor: "#ef4444", cursor: "pointer" }}
                />
                <span style={{ color: isError ? "#dc2626" : "#64748b" }}>
                  {isSubmitting ? "Saving..." : "⚠ Location Error"}
                </span>
              </label>
              {isError && (
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Describe the issue (optional)"
                  rows={2}
                  style={{
                    width: "100%", marginTop: "6px",
                    fontSize: "11px", border: "1px solid #fca5a5",
                    borderRadius: "6px", padding: "4px 8px",
                    resize: "none", outline: "none",
                    color: "#374151", background: "white",
                    boxSizing: "border-box",
                  }}
                />
              )}
              {isError && (
                <button
                  className="submit-btn"
                  disabled={isSubmitting}
                  onClick={handleSubmitError}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              )}
            </div>

            <button className="go-button" onClick={() => handleGoToLocation(loc.item)}>
              <NavigationIcon style={{ fontSize: "16px" }} />
              Go to Location
            </button>
          </div>
        )}
      </Popup>
    </Marker>
  );
});

export default function Maps({
  points,
  projectData,
  companyData,
  contactData,
}: {
  points: { lat: number; lng: number; id?: string; projectId?: string; entityType?: 'company' | 'sub-company' | 'branch' }[];
  projectData?: any[];
  companyData?: any[];
  contactData?: any[];
}) {
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(4);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isWorldFilter, setIsWorldFilter] = useState(false);
  const [activeCompany, setActiveCompany] = useState<any | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Location error:", error);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const [locations, setLocations] = useState<
    {
      lat: number;
      lng: number;
      name?: string;
      country?: string;
      state?: string;
      city?: string;
      item?: any;
      id?: string;
      projectId?: string
    }[]
  >([]);

  const isCompany = !!companyData;
  const isContact = !!contactData;
  const isProject = !companyData && !contactData;
  const currentData = contactData || companyData || projectData || [];
  const displayTitle = isContact ? "Contact by Location" : isCompany ? "Company by Location" : "Project by Location";

  const worldCount = useMemo(() => {
    return locations.filter(loc => loc.country !== "India" && loc.country !== "Unknown").length;
  }, [locations]);

  // Hierarchical Filter Data
  const filterOptions = useMemo(() => {
    if (!isProject) return { countries: {}, states: {}, cities: {} };

    const countries: Record<string, number> = {};
    const states: Record<string, number> = {};
    const cities: Record<string, number> = {};

    locations.forEach(loc => {
      // World Filter Logic: If active, exclude India from list
      if (isWorldFilter && loc.country === "India") return;

      // Exclude fallback values from dropdowns
      if (loc.country && loc.country !== "Unknown") {
        countries[loc.country] = (countries[loc.country] || 0) + 1;
      }
      if (loc.country === selectedCountry && loc.state && loc.state !== "Unknown") {
        states[loc.state] = (states[loc.state] || 0) + 1;
      }
      if (loc.state === selectedState && loc.city && loc.city !== "Unknown") {
        cities[loc.city] = (cities[loc.city] || 0) + 1;
      }
    });

    return { countries, states, cities };
  }, [locations, isProject, selectedCountry, selectedState]);

  // TRUE FILTERING (No Highlighting)
  const filteredLocations = useMemo(() => {
    if (!isProject) return locations;
    return locations.filter(loc => {
      // World Filter: Exclude India
      if (isWorldFilter && loc.country === "India") return false;

      // If World Filter is NOT active, use standard country filter
      if (!isWorldFilter && selectedCountry && loc.country !== selectedCountry) return false;

      if (selectedState && loc.state !== selectedState) return false;
      if (selectedCity && loc.city !== selectedCity) return false;
      return true;
    });
  }, [locations, isProject, selectedCountry, selectedState, selectedCity, isWorldFilter]);

  const addressCache = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!points || !Array.isArray(points) || points.length === 0) {
      setLocations([]);
      return;
    }

    let isCancelled = false;

    // 1. Map initial points (DIRECT DATA SOURCE - NO API)
    const coordCounts: Record<string, number> = {};
    const validPoints = points
      .filter(p => p && typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng))
      .map((point) => {
        // ✅ FIX MATCHING LOGIC: Use unique identifier
        const matchedItem = currentData.find((item) => {
          if (!item) return false;
          return item.id === point.id || item.id === point.projectId;
        });

        // ✅ HANDLE SAME LOCATION VISUALLY: Apply slight offset for overlapping items
        const coordKey = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
        const count = coordCounts[coordKey] || 0;
        coordCounts[coordKey] = count + 1;

        const offset = count * 0.00005;

        return {
          ...point,
          lat: point.lat + offset,
          lng: point.lng + offset,
          country: matchedItem?.country?.trim() || "Unknown",
          state: matchedItem?.state?.trim() || null,
          city: matchedItem?.city?.trim() || null,
          name: matchedItem?.name || matchedItem?.companyName || matchedItem?.subCompanyName || matchedItem?.branchName || matchedItem?.title || "Unknown Location",
          entityType: point.entityType,
          item: matchedItem || point, // ✅ DO NOT MERGE: Use matchedItem or fallback to point
        };
      });

    setLocations(validPoints);
    return () => { isCancelled = true; };
  }, [points, projectData, companyData, contactData]);

  const handleGoToLocation = useCallback((item: any) => {
    const data = item || {};
    const lat = parseFloat(data.latitude);
    const lng = parseFloat(data.longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    if (userLocation) {
      url += `&origin=${userLocation.lat},${userLocation.lng}`;
    }

    window.open(url, "_blank");
  }, [userLocation]);

  return (
    <div style={{ height: "100vh", width: "100%", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <style>{`
        .custom-marker-label {
          background-color: white !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 6px 12px !important;
          font-size: 13px !important;
          color: #1e293b !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.12) !important;
          white-space: nowrap;
          border: 1px solid rgba(0,0,0,0.05) !important;
        }
        .custom-marker-label.active {
          z-index: 2000 !important;
        }
        .leaflet-tooltip-top:before { display: none !important; }
        .custom-marker-icon { 
          background: none !important; 
          border: none !important;
        }

        .user-location-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000 !important;
        }

        .user-location-marker .dot {
          width: 12px;
          height: 12px;
          background: #2563eb;
          border-radius: 50%;
          box-shadow: 
            0 0 0 4px rgba(37, 99, 235, 0.2),
            0 0 15px rgba(37, 99, 235, 0.6);
          position: relative;
        }

        .user-location-marker .dot::after {
          content: '';
          position: absolute;
          top: -4px; left: -4px; right: -4px; bottom: -4px;
          border-radius: 50%;
          border: 2px solid #2563eb;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        
        /* Floating Pill UI */
        .floating-filter-bar {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 999px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.3);
          max-width: 90vw;
          overflow-x: auto;
          scrollbar-width: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .floating-filter-bar:hover {
          box-shadow: 
            0 12px 48px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          transform: translateX(-50%) translateY(-2px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.25);
        }
        .floating-filter-bar::-webkit-scrollbar { display: none; }
        
        .pill-select {
          padding: 6px 36px 6px 14px;
          border-radius: 999px;
          border: none;
          background-color: rgba(255, 255, 255, 0.6);
          background-image: url("data:image/svg+xml;utf8,<svg fill='%23334155' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M5.5 7.5l4.5 5 4.5-5z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 14px;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }
        .pill-select:hover { 
          background-color: rgba(255, 255, 255, 0.95); 
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .pill-select:focus { box-shadow: 0 0 0 2px rgba(44, 123, 229, 0.2); }
        .pill-select.active { 
          background-color: #2c7be5; 
          color: white;
          background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M5.5 7.5l4.5 5 4.5-5z'/></svg>");
        }
        
        .pill-button {
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .pill-button:hover { 
          background: rgba(255, 255, 255, 0.95); 
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .pill-button.active { background: #2c7be5; color: white; }

        .total-badge {
          background: linear-gradient(135deg, #2c7be5, #1d4ed8);
          color: white;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(44, 123, 229, 0.3);
          transition: all 0.2s ease;
        }
        .total-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(44, 123, 229, 0.4);
        }

        /* Compact Card Popup UI */
        .popup-card {
          padding: 8px 4px;
        }
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .popup-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          cursor: pointer;
          transition: color 0.2s;
        }
        .popup-title:hover { color: #2c7be5; }
        
        .popup-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .status-row {
          display: flex;
          align-items: center;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          background: #3b82f6;
        }
        .address-row {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 13px;
          line-height: 1.4;
        }
        .address-icon {
          color: #64748b;
          flex-shrink: 0;
        }
        .info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #475569;
        }
        .go-button {
          margin-top: 12px;
          padding: 10px;
          background: linear-gradient(135deg, #2c7be5, #1d4ed8);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(44, 123, 229, 0.2);
          width: 100%;
        }
        .go-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(44, 123, 229, 0.3);
        }

        /* Company Specialized Popup UI */
        .company-popup {
          padding: 8px 4px;
        }
        .company-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 12px;
        }
        .company-avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #2c7be5;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
          margin-bottom: 6px;
        }
        .company-title-block {
          display: flex;
          flex-direction: column;
        }
        .company-name {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          cursor: pointer;
        }
        .company-name:hover { color: #2c7be5; }
        .company-type {
          font-size: 12px;
          color: #64748b;
          margin-top: 1px;
        }
        .company-body {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .company-row {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 13px;
        }

        /* Location Error Feature */
        .warning-marker { background: none !important; border: none !important; }
        .warning-pin {
          width: 30px;
          height: 30px;
          background: #ef4444;
          color: white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.5);
        }
        .warning-pin::after {
          content: '\u26a0';
          transform: rotate(45deg);
          display: block;
        }
        .popup-error {
          border: 1.5px solid #ef4444 !important;
          background: #fff5f5 !important;
          border-radius: 12px;
        }
        .error-remark {
          font-size: 12px;
          color: #991b1b;
          background: #fee2e2;
          border-radius: 6px;
          padding: 4px 8px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .error-section {
          margin-top: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        .error-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .submit-btn {
          margin-top: 6px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        }
        .submit-btn:hover { background: #dc2626; }
        .submit-btn:disabled { background: #fca5a5; cursor: not-allowed; }
      `}</style>

      {/* Floating Google Maps-Style Filter Bar */}
      {isProject && (
        <div className="floating-filter-bar">
          <div
            className={`pill-button ${isWorldFilter ? "active" : ""}`}
            onClick={() => {
              setIsWorldFilter(prev => !prev);
              setSelectedCountry(null);
              setSelectedState(null);
              setSelectedCity(null);
            }}
          >
            🌍 World ({worldCount})
          </div>

          <div className="total-badge">
            {filteredLocations.length} Projects
          </div>

          {/* Country Dropdown */}
          {!isWorldFilter && (
            <select
              className={`pill-select ${selectedCountry ? 'active' : ''}`}
              value={selectedCountry || ""}
              onChange={(e) => {
                setSelectedCountry(e.target.value || null);
                setSelectedState(null);
                setSelectedCity(null);
              }}
            >
              <option value="">All Countries</option>
              {Object.entries(filterOptions.countries).sort().map(([name, count]) => (
                <option key={name} value={name}>{name} ({count})</option>
              ))}
            </select>
          )}

          {/* State Dropdown (Hierarchical) */}
          {selectedCountry && (
            <select
              className={`pill-select ${selectedState ? 'active' : ''}`}
              value={selectedState || ""}
              onChange={(e) => {
                setSelectedState(e.target.value || null);
                setSelectedCity(null);
              }}
            >
              <option value="">All States</option>
              {Object.entries(filterOptions.states).sort().map(([name, count]) => (
                <option key={name} value={name}>{name} ({count})</option>
              ))}
            </select>
          )}

          {/* City Dropdown (Hierarchical) */}
          {selectedState && (
            <select
              className={`pill-select ${selectedCity ? 'active' : ''}`}
              value={selectedCity || ""}
              onChange={(e) => setSelectedCity(e.target.value || null)}
            >
              <option value="">All Cities</option>
              {Object.entries(filterOptions.cities).sort().map(([name, count]) => (
                <option key={name} value={name}>{name} ({count})</option>
              ))}
            </select>
          )}

          {(selectedCountry || selectedState || selectedCity || isWorldFilter) && (
            <button
              onClick={() => {
                setSelectedCountry(null);
                setSelectedState(null);
                setSelectedCity(null);
                setIsWorldFilter(false);
              }}
              style={{ border: "none", background: "none", color: "#ef4444", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginLeft: "8px" }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Legacy Header (Only for non-projects) */}
      {!isProject && (
        <div style={{ padding: "1rem 1.5rem", backgroundColor: "#f8f9fa", borderBottom: "1px solid #e9ecef" }}>
          <div style={{ fontWeight: 600, fontSize: "1.75rem", color: "#2c3e50" }}>{displayTitle}</div>
        </div>
      )}

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={4}
        style={{ height: isProject ? "100%" : "calc(100% - 4.5rem)", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <ZoomHandler setZoom={setZoom} />
        <MapCenterHandler userLocation={userLocation} />
        <MapClickHandler onClick={() => setActiveCompany(null)} />

        {/* Relationship Arcs (Curved Polylines) */}
        {activeCompany && (
          <>
            {locations
              .filter(loc => loc.item?.mainCompanyId === activeCompany.id)
              .map((sc, idx) => (
                <Polyline
                  key={`arc-sub-${sc.id}-${idx}`}
                  positions={createCurve(
                    [parseFloat(activeCompany.latitude), parseFloat(activeCompany.longitude)],
                    [sc.lat, sc.lng]
                  )}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 3,
                    opacity: 0.9,
                    lineCap: "round",
                    dashArray: "5, 8",
                  }}
                  pane="shadowPane"
                />
              ))}

            {locations
              .filter(loc => loc.item?.companyId === activeCompany.id)
              .map((br, idx) => (
                <Polyline
                  key={`arc-branch-${br.id}-${idx}`}
                  positions={createCurve(
                    [parseFloat(activeCompany.latitude), parseFloat(activeCompany.longitude)],
                    [br.lat, br.lng]
                  )}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 3,
                    opacity: 0.9,
                    lineCap: "round",
                    dashArray: "5, 8",
                  }}
                  pane="shadowPane"
                />
              ))}
          </>
        )}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {filteredLocations.map((loc, idx) => (
          <LocationMarker
            key={`${loc.id || loc.projectId || 'marker'}-${idx}`}
            loc={loc}
            isContact={isContact}
            isCompany={isCompany}
            isProject={isProject}
            zoom={zoom}
            handleGoToLocation={handleGoToLocation}
            activeMarkerId={activeMarkerId}
            setActiveMarkerId={setActiveMarkerId}
            activeCompany={activeCompany}
            setActiveCompany={setActiveCompany}
          />
        ))}
      </MapContainer>
    </div>
  );
}


