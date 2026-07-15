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
import { createPortal } from "react-dom";
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
  Navigation as NavigationIcon,
  ReportProblemOutlined as ReportIcon,
  LayersOutlined as LayersIcon
} from "@mui/icons-material";
import { flagLocationError } from "@services/companies";
import { Modal, Form, Button } from "react-bootstrap";
import { successConfirmation } from "@utils/modal";
import { mapStyles } from "./mapTheme";

// Leaflet icon fix for React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const PROJECT_FILTER_THEME = {
  primary: "#b43f45",
  primaryDark: "#9f353b",
  primaryLight: "#f7e4e6",
  border: "#ffffff",
  shadow: "rgba(180, 63, 69, 0.32)",
};

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

const getStoredLabelMode = (): 'smart' | 'all' | 'none' => {
  try {
    const stored = localStorage.getItem('mapLabelMode');
    return stored === 'smart' || stored === 'all' || stored === 'none' ? stored : 'smart';
  } catch {
    return 'smart';
  }
};

const WORLD_PAN_BOUNDS: L.LatLngBoundsExpression = [
  [-85, -360],
  [85, 360],
];

function ZoomHandler({ setZoom }: { setZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  return null;
}

// Reports the current visible bounds so the parent can render ONLY the markers on
// screen (viewport culling). Every marker still sits exactly where it belongs — the
// DOM just never holds more than the handful actually in view, which is what keeps
// panning/zooming smooth no matter how many projects exist.
function ViewportTracker({ onChange }: { onChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMap();
  useEffect(() => {
    let raf: number | null = null;
    const report = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => onChange(map.getBounds()));
    };
    report();
    map.on("moveend", report);
    map.on("zoomend", report);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      map.off("moveend", report);
      map.off("zoomend", report);
    };
  }, [map, onChange]);
  return null;
}

// Forces Leaflet to recalculate tile coverage after the container finishes layout
function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    // Small delay lets the parent container finish its CSS layout before invalidation
    const t = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 150);
    return () => clearTimeout(t);
  }, [map]);
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

function MapZoomSyncHandler({ setZoom }: { setZoom: (zoom: number) => void }) {
  const map = useMap();

  useEffect(() => {
    setZoom(map.getZoom());
  }, [map, setZoom]);

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

// A fly target is either a point+zoom (search / city / locality) or a bounding box
// to frame (country / state — so every project in the selection ends up on screen).
type FlyTarget =
  | { lat: number; lng: number; zoom: number; duration?: number }
  | { bounds: L.LatLngBoundsExpression; duration?: number; maxZoom?: number };

function MapFlyHandler({ target, onDone }: {
  target: FlyTarget | null;
  onDone: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    if ("bounds" in target) {
      map.flyToBounds(target.bounds, {
        padding: [60, 60],
        duration: target.duration ?? 1.2,
        maxZoom: target.maxZoom,
      });
    } else {
      map.flyTo([target.lat, target.lng], target.zoom, { duration: target.duration ?? 1.2 });
    }
    onDone();
  }, [target]);
  return null;
}

// Stable per-marker key — independent of array position, so viewport culling
// (which changes how many markers are mapped) never reshuffles identities.
const getMarkerKey = (loc: any) =>
  `marker-${loc.id ?? loc.projectId ?? loc.item?.id ?? "x"}-${loc.lat}-${loc.lng}`;

const getInitials = (name: string) => {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase() || "??";
};

const createCustomIcon = (initials: string, color: string, imageUrl?: string, entityType?: string, isRelated: boolean = false, isDimmed: boolean = false, isAnimating: boolean = false, zoom: number = 4, alwaysShowInitials: boolean = false) => {
  try {
    // If we have no initials and no image, fallback to theme-colored circle
    const finalColor = color || "#3498db";

    // Dynamic sizing based on zoom level to prevent clutter when zoomed out
    let baseSize = 28;
    if (zoom < 5) {
      baseSize = alwaysShowInitials ? 22 : 14;
    } else if (zoom < 7) {
      baseSize = alwaysShowInitials ? 24 : 18;
    } else if (zoom < 10) {
      baseSize = 22;
    } else if (zoom < 13) {
      baseSize = 28;
    } else {
      baseSize = 34;
    }

    // Scale based on entity type
    let size = baseSize;
    if (entityType === 'sub-company') {
      size = Math.max(10, Math.round(baseSize * 0.85));
    } else if (entityType === 'branch') {
      size = Math.max(8, Math.round(baseSize * 0.7));
    }

    const showDetails = alwaysShowInitials || size >= 20;
    let innerSize = Math.max(0, size - 6);
    let offset = 3;
    const fontSize = Math.max(alwaysShowInitials ? 8 : 6, Math.floor(size * 0.32));

    if (size < 18) {
      innerSize = Math.max(0, size - 4);
      offset = 2;
    }

    // FALLBACK LEVEL 1 & 2: Custom Avatar or Initials
    const html = `
      <div class="${isAnimating ? 'search-marker-bounce' : ''}" style="position: relative; width: ${size}px; height: ${size}px; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease; transform: scale(${isRelated ? 1.4 : 1}); z-index: ${isRelated ? 1000 : 0}; opacity: ${isDimmed ? 0.4 : 1};">
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
          ${showDetails ? `<span style="color: ${finalColor}; font-weight: 800; font-size: ${fontSize}px; line-height: 1; z-index: 1; letter-spacing: 0;">${initials || "??"}</span>` : ''}
          ${showDetails && imageUrl ?
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
  uniqueId,
  isContact,
  isCompany,
  isProject,
  zoomBucket,
  labelMode,
  showLabel,
  handleGoToLocation,
  activeMarkerId,
  setActiveMarkerId,
  activeCompany,
  setActiveCompany,
  isAnimating,
}: {
  loc: any;
  uniqueId: string;
  isContact: boolean;
  isCompany: boolean;
  isProject: boolean;
  zoomBucket: number;
  labelMode: 'smart' | 'all' | 'none';
  showLabel: boolean;
  handleGoToLocation: (item: any) => void;
  activeMarkerId: string | null;
  setActiveMarkerId: React.Dispatch<React.SetStateAction<string | null>>;
  activeCompany: any | null;
  setActiveCompany: (company: any | null) => void;
  isAnimating?: boolean;
}) => {
  const navigate = useNavigate();
  const markerRef = useRef<L.Marker>(null);

  const id = uniqueId;
  const entityId = loc.id || loc.projectId || loc.item?.id;
  const isActive = activeMarkerId === id;

  useEffect(() => {
    if (isActive && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isActive]);

  // 1. Position Validation
  const position: [number, number] = [loc?.lat, loc?.lng];

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
  const [isReporting, setIsReporting] = useState(false);

  // zoomBucket (0–4) is computed once in the parent from the live zoom. Because it only
  // changes when the icon SIZE tier actually changes, this marker doesn't re-render on
  // every zoom tick — only when crossing a tier boundary. repZoom is a representative
  // zoom for the bucket so createCustomIcon lands in the matching size branch.
  const repZoom = [4, 6, 9, 12, 14][zoomBucket] ?? 4;

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
      const generatedIcon = createCustomIcon(initials, markerColor, imageUrl, loc.entityType, isRelated, isDimmed as boolean, isAnimating, repZoom, isProject);
      return generatedIcon;
    } catch (error) {
      return L.divIcon({ html: '<div style="background: #3498db; width: 20px; height: 20px; border-radius: 50%;"></div>' });
    }
  }, [initials, markerColor, imageUrl, isError, isRelated, isDimmed, isAnimating, repZoom, isProject, loc.entityType]);


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

  useEffect(() => {
    return () => {
      if (activeMarkerId === id) setActiveMarkerId(null);
    };
  }, []);

  // 4. Interaction Handlers — popup/label only on click, never on hover
  const eventHandlers = useMemo(() => ({
    click: () => {
      setActiveMarkerId(id);
      if (loc.entityType === 'company') {
        setActiveCompany(item);
      }
    },
  }), [id, setActiveMarkerId, setActiveCompany, item, loc.entityType]);

  // Position Validation (moved after hooks to satisfy rules-of-hooks)
  if (
    typeof position[0] !== "number" ||
    typeof position[1] !== "number" ||
    isNaN(position[0]) ||
    isNaN(position[1])
  ) {
    return null;
  }

  const handleNavigation = () => {
    if (!entityId) return;
    if (isProject) navigate(`/projects/${entityId}`);
    else if (isCompany) navigate(`/companies/${entityId}`);
    else if (isContact) navigate(`/contacts/${entityId}`);
  };

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

      // Show success toast
      successConfirmation(isError ? "Issue reported successfully!" : "Location issue cleared.");

      // Close modal
      setIsReporting(false);

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
      successConfirmation("Location issue cleared.");
      setIsReporting(false);
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
      ref={markerRef}
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
      {/* Label visibility is decided by the parent's decluttering pass (grid-thinned +
          capped) and passed down as showLabel — so we never paint hundreds of
          overlapping permanent tooltips. The active marker always keeps its label. */}
      {labelMode !== 'none' && (showLabel || isActive) && (
        <Tooltip
          key={`tooltip-${id}-${position[0]}-${position[1]}`}
          permanent
          direction="top"
          offset={[0, -10]}
          className={`google-style-label ${isActive ? 'active' : ''} ${activeMarkerId && !isActive ? 'dimmed' : ''}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 700 }}>
              {itemTitle && itemTitle.length > 25 ? `${itemTitle.substring(0, 25)}...` : itemTitle}
            </span>
            {(zoomBucket >= 4 || isActive) && (
              <span style={{ fontSize: "10px", color: isActive ? "#ffffff" : "#666", textTransform: "capitalize" }}>
                {loc.entityType || loc.country || "Location"}
              </span>
            )}
          </div>
        </Tooltip>
      )}
      <Popup maxWidth={320} minWidth={300} className="custom-popup">
        {isCompany ? (
          /* Specialized Company UI */
          <div className={`company-popup-container${isError ? " popup-error" : ""}`}>
            <div className="popup-header-section centered-header">
              <div className="header-action-left">
                <button 
                  className="report-ghost-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsReporting(true);
                  }}
                  title="Report Issue"
                >
                  <ReportIcon style={{ fontSize: '20px' }} />
                </button>
              </div>

              <div className="header-center-content">
                <div className="avatar-wrapper">
                  {(loc.item?.companyName || loc.item?.name || loc.item?.subCompanyName || loc.item?.branchName || "C").charAt(0).toUpperCase()}
                </div>
                <div className="title-wrapper">
                  <h3 className="entity-name" onClick={handleNavigation}>
                    {loc.item?.companyName || loc.item?.name || loc.item?.subCompanyName || loc.item?.branchName || "No Name"}
                  </h3>
                  <span className="entity-label">
                    {loc.entityType === 'branch' ? 'Branch Office' : loc.entityType === 'sub-company' ? 'Sub Company' : 'Main Company'}
                  </span>
                </div>
              </div>
            </div>

            <div className="popup-content-body">
              {/* Saved remark (read-only display) */}
              {isError && remark && (
                <div className="error-badge-container">
                  <ReportIcon style={{ fontSize: "14px" }} />
                  <span>{remark}</span>
                </div>
              )}

              <div className="info-grid">
                {loc.item?.email && (
                  <div className="info-item">
                    <MailIcon className="info-icon" />
                    <span className="info-text">{loc.item.email}</span>
                  </div>
                )}

                <div className="info-item">
                  <MapPinIcon className="info-icon" />
                  <span className="info-text">
                    {popupAddress && popupAddress.trim() !== ""
                      ? popupAddress
                      : `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
                  </span>
                </div>

                {/* Relationship Visualization UI */}
                {(loc.entityType === 'sub-company' || loc.entityType === 'branch') && parent && (
                  <div className="relationship-card">
                    <div className="rel-header">
                      {loc.entityType === 'sub-company' ? 'Sub-company of' : 'Branch of'}
                    </div>
                    <div className="rel-name">{parentName}</div>
                    
                    {hasParentCoords && (
                      <label className="toggle-container">
                        <input
                          type="checkbox"
                          checked={showConnection}
                          onChange={() => setShowConnection(!showConnection)}
                        />
                        <span className="toggle-label">Show main office connection</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="popup-actions">
              <button className="primary-go-btn" onClick={() => handleGoToLocation(loc.item)}>
                <NavigationIcon style={{ fontSize: "18px" }} />
                <span>Go to Location</span>
              </button>
            </div>
          </div>
        ) : (
          /* Unified Layout for Projects and Contacts */
          <div className={`card-popup-container${isError ? " popup-error" : ""}`}>
            <div className="popup-header-section centered-header">
              <div className="header-action-left">
                <button 
                  className="report-ghost-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsReporting(true);
                  }}
                  title="Report Issue"
                >
                  <ReportIcon style={{ fontSize: '20px' }} />
                </button>
              </div>

              <div className="header-center-content">
                <div className="avatar-wrapper" style={{ background: isContact ? '#8b5cf6' : '#10b981' }}>
                  {isContact ? <BriefcaseIcon style={{ fontSize: '18px' }} /> : <PinIcon style={{ fontSize: '18px' }} />}
                </div>
                <div className="title-wrapper">
                  <h3 className="entity-name" onClick={handleNavigation}>
                    {isContact
                      ? (loc.item?.fullName || loc.item?.name || "No Contact Name")
                      : (loc.item?.title || "No Project Title")
                    }
                  </h3>
                  <span className="entity-label">
                    {isContact ? 'Contact Person' : 'Project Location'}
                  </span>
                </div>
              </div>
            </div>

            <div className="popup-content-body">
              {isError && remark && (
                <div className="error-badge-container">
                  <ReportIcon style={{ fontSize: "14px" }} />
                  <span>{remark}</span>
                </div>
              )}

              {/* Status Row */}
              {loc.item?.status?.name && (
                <div className="status-container">
                  <span className="status-dot" style={{ backgroundColor: loc.item.status.color || "#3b82f6" }}></span>
                  <span className="status-name">{loc.item.status.name}</span>
                </div>
              )}

              <div className="info-grid">
                {isProject && loc.item?.cost && (
                  <div className="info-item">
                    <RupeeIcon className="info-icon" />
                    <span className="info-text highlight">₹{loc.item.cost.toLocaleString()}</span>
                  </div>
                )}

                {isProject && loc.item?.company?.companyName && (
                  <div className="info-item">
                    <CompanyIcon className="info-icon" />
                    <span className="info-text">{loc.item.company.companyName}</span>
                  </div>
                )}

                {isContact && loc.item?.roleInCompany && (
                  <div className="info-item">
                    <BriefcaseIcon className="info-icon" />
                    <span className="info-text">{loc.item.roleInCompany}</span>
                  </div>
                )}

                {isContact && (loc.item?.email || loc.item?.phone) && (
                  <div className="contact-info-group">
                    {loc.item?.email && (
                      <div className="info-item">
                        <MailIcon className="info-icon" />
                        <span className="info-text small">{loc.item.email}</span>
                      </div>
                    )}
                    {loc.item?.phone && (
                      <div className="info-item">
                        <PhoneIcon className="info-icon" />
                        <span className="info-text small">{loc.item.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="info-item">
                  <MapPinIcon className="info-icon" />
                  <span className="info-text">
                    {popupAddress && popupAddress.trim() !== ""
                      ? popupAddress
                      : `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="popup-actions">
              <button className="primary-go-btn" onClick={() => handleGoToLocation(loc.item)}>
                <NavigationIcon style={{ fontSize: "18px" }} />
                <span>Go to Location</span>
              </button>
            </div>
          </div>
        )}
      </Popup>

      {/* Report Issue Modal */}
      <Modal 
        show={isReporting} 
        onHide={() => setIsReporting(false)} 
        centered
        backdrop="static"
        style={{ zIndex: 9999 }} // Ensure it's above everything
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '18px', fontWeight: 600 }}>
            Report Location Issue
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
              Reporting an issue for: <strong>{itemTitle}</strong>
            </p>
          </div>
          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              id="location-error-checkbox"
              label="Location is incorrect"
              checked={isError}
              onChange={(e) => setIsError(e.target.checked)}
              style={{ fontWeight: 500, color: isError ? '#ef4444' : '#475569' }}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: '13px', fontWeight: 500 }}>Remarks / Description</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Please describe what is wrong with this location..."
              style={{ fontSize: '13px' }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setIsReporting(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            size="sm"
            onClick={handleSubmitError}
            disabled={isSubmitting || (!isError && remark.trim() === "" && !loc.item?.isLocationIncorrect)}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Marker>
  );
});

// Premium custom filter dropdown — replaces the native <select> so the options
// panel isn't at the mercy of the OS (which painted it red, inheriting the active
// pill's background). The panel is portaled to <body> so it escapes both the pills'
// horizontal overflow clipping and the filter bar's transform context.
type PillOption = { name: string; count: number };

const PillDropdown = ({
  value,
  options,
  placeholder,
  disabled = false,
  active = false,
  minWidth = 140,
  ariaLabel,
  disabledText,
  onChange,
}: {
  value: string | null;
  options: PillOption[];
  placeholder: string;
  disabled?: boolean;
  active?: boolean;
  minWidth?: number;
  ariaLabel?: string;
  disabledText?: string;
  onChange: (val: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 230);
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    setPos({ top: r.bottom + 6, left, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    reposition();
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 30);
    const onScroll = () => reposition();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, reposition]);

  const selected = value ? options.find(o => o.name === value) : undefined;
  const label = value ? `${value}${selected ? ` (${selected.count})` : ""}` : placeholder;

  // Type-to-search inside the dropdown
  const q = query.trim().toLowerCase();
  const filteredOptions = q ? options.filter(o => o.name.toLowerCase().includes(q)) : options;
  const searchLabel = (ariaLabel || "").replace(/^filter by\s*/i, "") || "options";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`pill-dd ${active ? "active" : ""}`}
        disabled={disabled}
        style={{ minWidth }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={disabled ? disabledText : undefined}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
      >
        <span className="pill-dd-label">{label}</span>
        <i className="bi bi-chevron-down pill-dd-caret" />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="pill-dd-panel"
          role="listbox"
          aria-label={ariaLabel}
          style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          <div className="pill-dd-search-row">
            <i className="bi bi-search pill-dd-search-icon" />
            <input
              ref={searchRef}
              className="pill-dd-search"
              type="text"
              placeholder={`Search ${searchLabel}…`}
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
                // Enter selects the only match for a fast keyboard flow
                if (e.key === "Enter" && filteredOptions.length === 1) {
                  onChange(filteredOptions[0].name); setOpen(false);
                }
              }}
            />
            {query && (
              <button className="pill-dd-search-clear" onMouseDown={(e) => { e.preventDefault(); setQuery(""); searchRef.current?.focus(); }} aria-label="Clear search">×</button>
            )}
          </div>

          <div className="pill-dd-list">
            {!q && (
              <button
                type="button"
                className={`pill-dd-option ${!value ? "selected" : ""}`}
                role="option"
                aria-selected={!value}
                onClick={() => { onChange(null); setOpen(false); }}
              >
                <span className="pill-dd-check">{!value ? "✓" : ""}</span>
                <span className="pill-dd-name">{placeholder}</span>
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="pill-dd-empty">No matches for “{query}”</div>
            ) : (
              filteredOptions.map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  className={`pill-dd-option ${value === name ? "selected" : ""}`}
                  role="option"
                  aria-selected={value === name}
                  title={name}
                  onClick={() => { onChange(name); setOpen(false); }}
                >
                  <span className="pill-dd-check">{value === name ? "✓" : ""}</span>
                  <span className="pill-dd-name">{name}</span>
                  <span className="pill-dd-count">{count}</span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

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
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null);
  const [isWorldFilter, setIsWorldFilter] = useState(false);
  const [activeCompany, setActiveCompany] = useState<any | null>(null);
  const [labelMode, setLabelMode] = useState<'smart' | 'all' | 'none'>(getStoredLabelMode);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [viewBounds, setViewBounds] = useState<L.LatLngBounds | null>(null);

  const [isLabelPanelExpanded, setIsLabelPanelExpanded] = useState(false);
  const labelPanelRef = useRef<HTMLDivElement>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // ── Custom map search ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFocusIndex, setSearchFocusIndex] = useState(-1);
  const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);
  const [animatedProjectId, setAnimatedProjectId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLabelModeChange = (mode: 'smart' | 'all' | 'none') => {
    setLabelMode(mode);
  };

  useEffect(() => {
    try {
      localStorage.setItem('mapLabelMode', labelMode);
    } catch (e) {
      console.error("Failed to store mapLabelMode", e);
    }
  }, [labelMode]);

  // Read filter state from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const country = params.get('mapCountry');
    const state = params.get('mapState');
    const city = params.get('mapCity');
    const locality = params.get('mapLocality');
    const world = params.get('mapWorld');
    if (country) setSelectedCountry(country);
    if (state) setSelectedState(state);
    if (city) setSelectedCity(city);
    if (locality) setSelectedLocality(locality);
    if (world === '1') setIsWorldFilter(true);
  }, []);

  // Debounced URL sync — writes filter state to URL without triggering navigation
  const urlSyncRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    urlSyncRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      selectedCountry ? params.set('mapCountry', selectedCountry) : params.delete('mapCountry');
      selectedState ? params.set('mapState', selectedState) : params.delete('mapState');
      selectedCity ? params.set('mapCity', selectedCity) : params.delete('mapCity');
      selectedLocality ? params.set('mapLocality', selectedLocality) : params.delete('mapLocality');
      isWorldFilter ? params.set('mapWorld', '1') : params.delete('mapWorld');
      const search = params.toString();
      window.history.replaceState({}, '', search ? `${window.location.pathname}?${search}` : window.location.pathname);
    }, 300);
    return () => { if (urlSyncRef.current) clearTimeout(urlSyncRef.current); };
  }, [selectedCountry, selectedState, selectedCity, selectedLocality, isWorldFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (labelPanelRef.current && !labelPanelRef.current.contains(event.target as Node)) {
        setIsLabelPanelExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      locality?: string;
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
  // Entity word drives the search placeholder / empty-state copy across all three maps.
  const entityWord = isContact ? "contact" : isCompany ? "company" : "project";

  const worldCount = useMemo(() => {
    return locations.filter(loc => loc.country !== "India" && loc.country !== "Unknown").length;
  }, [locations]);

  const activeFilterCount = useMemo(() =>
    [selectedCountry, selectedState, selectedCity, selectedLocality, isWorldFilter ? 'world' : null].filter(Boolean).length,
    [selectedCountry, selectedState, selectedCity, selectedLocality, isWorldFilter]
  );

  // Hierarchical Filter Data
  const filterOptions = useMemo(() => {
    if (!isProject) return { countries: {}, states: {}, cities: {}, localities: {} };

    const countries: Record<string, number> = {};
    const states: Record<string, number> = {};
    const cities: Record<string, number> = {};
    const localities: Record<string, number> = {};

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
      if (loc.city === selectedCity && loc.locality && loc.locality !== "Unknown") {
        localities[loc.locality] = (localities[loc.locality] || 0) + 1;
      }
    });

    return { countries, states, cities, localities };
  }, [locations, isProject, selectedCountry, selectedState, selectedCity, isWorldFilter]);

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
      if (selectedLocality && loc.locality !== selectedLocality) return false;
      return true;
    });
  }, [locations, isProject, selectedCountry, selectedState, selectedCity, selectedLocality, isWorldFilter]);

  // Viewport culling: render only the markers inside the visible area (+ 40% buffer
  // so markers just off-screen are ready before they scroll into view). Every marker
  // stays exactly where it belongs — we simply never mount the ones you can't see,
  // which keeps panning/zooming smooth however large the dataset grows.
  const visibleLocations = useMemo(() => {
    if (!viewBounds) return filteredLocations;
    const padded = viewBounds.pad(0.4);
    return filteredLocations.filter(loc =>
      padded.contains([loc.lat, loc.lng] as L.LatLngTuple)
    );
  }, [filteredLocations, viewBounds]);

  // Icon size tier (0–4). Passing this to markers instead of the raw zoom means they
  // only re-render when the tier actually changes — not on every zoom tick — so zooming
  // stays smooth even with the whole dataset on screen.
  const zoomBucket = zoom < 5 ? 0 : zoom < 7 ? 1 : zoom < 10 ? 2 : zoom < 13 ? 3 : 4;

  // ── Label decluttering (the "magic spell" for All Labels) ──────────────────────
  // Rendering a permanent tooltip per marker is what crashes/lags "All labels" over a
  // dense region — Leaflet repositions every tooltip on every pan frame. Enterprise maps
  // never do that; they show a NON-OVERLAPPING, capped subset. We bucket the visible
  // markers into a viewport grid and keep at most one label per cell (so labels never
  // stack), hard-capped. Zoom in → each cell covers less ground → more labels resolve,
  // until (in a city) effectively all of them show. Smart mode only labels once zoomed in.
  const MAX_LABELS = 70;
  const labeledIds = useMemo(() => {
    const set = new Set<string>();
    if (labelMode === 'none') return set;
    if (labelMode === 'smart' && zoomBucket < 3) return set;
    if (!viewBounds) return set;

    const sw = viewBounds.getSouthWest();
    const ne = viewBounds.getNorthEast();
    const latSpan = (ne.lat - sw.lat) || 1;
    const lngSpan = (ne.lng - sw.lng) || 1;
    const COLS = 12, ROWS = 8; // ≤96 cells → labels stay sparse and non-overlapping
    const occupied = new Set<string>();

    for (const loc of visibleLocations) {
      if (set.size >= MAX_LABELS) break;
      const col = Math.floor(((loc.lng - sw.lng) / lngSpan) * COLS);
      const row = Math.floor(((loc.lat - sw.lat) / latSpan) * ROWS);
      const cell = `${col}:${row}`;
      if (occupied.has(cell)) continue;
      occupied.add(cell);
      set.add(getMarkerKey(loc));
    }
    return set;
  }, [labelMode, zoomBucket, viewBounds, visibleLocations]);

  useEffect(() => {
    if (!points || !Array.isArray(points) || points.length === 0) {
      setLocations([]);
      return;
    }

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
          // Read location from the top-level fields OR fall back to the nested
          // additionalDetails (projects/leads store them there). This keeps marker
          // colours + filters working regardless of whether the backend hoisting
          // deploy has gone out yet — the map API already returns additionalDetails.
          country: (matchedItem?.country ?? matchedItem?.additionalDetails?.country)?.trim() || "Unknown",
          state: (matchedItem?.state ?? matchedItem?.additionalDetails?.state)?.trim() || null,
          city: (matchedItem?.city ?? matchedItem?.additionalDetails?.city)?.trim() || null,
          locality: (matchedItem?.locality ?? matchedItem?.additionalDetails?.locality)?.trim() || null,
          name: matchedItem?.name || matchedItem?.companyName || matchedItem?.subCompanyName || matchedItem?.branchName || matchedItem?.title || "Unknown Location",
          entityType: point.entityType,
          item: matchedItem || point, // ✅ DO NOT MERGE: Use matchedItem or fallback to point
        };
      });

    setLocations(validPoints);
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

  const computeCentroid = useCallback((locs: typeof locations) => {
    if (!locs.length) return null;
    const lat = locs.reduce((sum, l) => sum + l.lat, 0) / locs.length;
    const lng = locs.reduce((sum, l) => sum + l.lng, 0) / locs.length;
    return { lat, lng };
  }, []);

  // Bounding box of a set of locations — used to frame a whole country/state so all
  // its projects fit on screen (better than centre+fixed-zoom for large regions).
  const computeBounds = useCallback((locs: typeof locations): L.LatLngBoundsExpression | null => {
    if (!locs.length) return null;
    let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
    for (const l of locs) {
      if (l.lat < minLat) minLat = l.lat;
      if (l.lat > maxLat) maxLat = l.lat;
      if (l.lng < minLng) minLng = l.lng;
      if (l.lng > maxLng) maxLng = l.lng;
    }
    return [[minLat, minLng], [maxLat, maxLng]];
  }, []);

  // After filteredLocations updates, resolve a pending marker highlight from search
  useEffect(() => {
    if (!pendingHighlightId) return;
    const idx = filteredLocations.findIndex(loc =>
      String(loc.id) === pendingHighlightId ||
      String(loc.projectId) === pendingHighlightId ||
      (loc.item?.id && String(loc.item.id) === pendingHighlightId)
    );
    if (idx >= 0) {
      const loc = filteredLocations[idx];
      setActiveMarkerId(getMarkerKey(loc));
      setPendingHighlightId(null);
    }
  }, [filteredLocations, pendingHighlightId]);

  // Instant multi-field scored search — no debounce needed for 200 local items
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as typeof locations;

    const toStr = (v: unknown): string =>
      v != null && typeof v === 'string' ? v.toLowerCase() : String(v ?? '').toLowerCase();

    const single = q.length === 1;

    const scored = locations.map(loc => {
      const name    = toStr(loc.name);
      const words   = name.split(/\s+/);
      const code    = toStr(loc.item?.code);
      const company = toStr(loc.item?.companyName ?? loc.item?.client);
      const city    = toStr(loc.city);
      const state   = toStr(loc.state);
      const country = toStr(loc.country);

      let score = 0;

      if (single) {
        // Single character — only prefix matches (keeps results meaningful)
        if (name.startsWith(q))                    score += 300;
        else if (words.some(w => w.startsWith(q))) score += 200;
        else if (code.startsWith(q))               score += 150;
        else if (company.startsWith(q))            score += 80;
        else if (city.startsWith(q))               score += 60;
        else if (state.startsWith(q))              score += 40;
        else if (country.startsWith(q))            score += 30;
      } else {
        // Multi-character — full ranked scoring across all fields
        if (name === q)                            score += 400;
        else if (name.startsWith(q))               score += 250;
        else if (words.some(w => w.startsWith(q))) score += 160;
        else if (name.includes(q))                 score += 100;

        if (code === q)                            score += 300;
        else if (code.startsWith(q))               score += 180;
        else if (code.includes(q))                 score += 90;

        if (company.startsWith(q))                 score += 70;
        else if (company.includes(q))              score += 45;

        if (city.startsWith(q))                    score += 55;
        else if (city.includes(q))                 score += 30;

        if (state.includes(q))                     score += 20;
        if (country.includes(q))                   score += 15;
      }

      return { loc, score };
    });

    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(r => r.loc);
  }, [searchQuery, locations]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Highlight matched text in search results
  const highlightMatch = useCallback((text: string, query: string): React.ReactNode => {
    const q = query.trim();
    if (!q || !text) return text;
    const escaped = q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase()
            ? <mark key={i} style={{ background: '#fef08a', color: '#713f12', padding: '0 1px', borderRadius: 2, fontWeight: 700 }}>{part}</mark>
            : part
        )}
      </>
    );
  }, []);

  // Navigate to a search result: flyTo + sync filters + highlight marker
  const handleSearchSelect = useCallback((loc: (typeof locations)[0]) => {
    const entityId = String(loc.id || loc.projectId || loc.item?.id || '');
    setSearchQuery(loc.name || '');
    setIsSearchOpen(false);
    setSearchFocusIndex(-1);
    setIsWorldFilter(false);
    setSelectedCountry(loc.country && loc.country !== 'Unknown' ? loc.country : null);
    setSelectedState(loc.state || null);
    setSelectedCity(loc.city || null);
    setSelectedLocality(loc.locality || null);
    setFlyTarget({ lat: loc.lat, lng: loc.lng, zoom: 16, duration: 1.5 });
    if (entityId) {
      setPendingHighlightId(entityId);
      setAnimatedProjectId(entityId);
      setTimeout(() => setAnimatedProjectId(null), 2500);
    }
  }, []);

  // Keyboard navigation inside search dropdown
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsSearchOpen(true);
      setSearchFocusIndex(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchFocusIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchFocusIndex >= 0 && searchResults[searchFocusIndex]) {
        handleSearchSelect(searchResults[searchFocusIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setIsSearchOpen(false);
      setSearchFocusIndex(-1);
    }
  }, [searchResults, searchFocusIndex, handleSearchSelect]);

  // Shared search box — same behaviour for projects, companies and contacts.
  // Rendered inside the project filter bar AND the company/contact header so the
  // search works everywhere. Only one instance mounts at a time (isProject toggle),
  // so the single searchRef stays valid.
  const renderMapSearch = () => (
    <div className="map-search-wrapper" ref={searchRef}>
      <div className="map-search-row">
        <i className="bi bi-search" style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0 }} />
        <input
          type="text"
          className="map-search-input"
          placeholder={`Search ${entityWord}...`}
          value={searchQuery}
          autoComplete="off"
          onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); setSearchFocusIndex(-1); }}
          onFocus={() => { if (searchQuery.trim()) setIsSearchOpen(true); }}
          onKeyDown={handleSearchKeyDown}
          aria-label={`Search ${entityWord}s`}
          aria-autocomplete="list"
          aria-expanded={isSearchOpen}
        />
        {searchQuery && (
          <button
            className="map-search-clear"
            onMouseDown={e => { e.preventDefault(); setSearchQuery(''); setIsSearchOpen(false); setSearchFocusIndex(-1); }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {isSearchOpen && searchQuery.trim() && (
        <div className="map-search-dropdown" role="listbox">
          {searchResults.length === 0 ? (
            <div className="map-search-empty">No {entityWord}s found for "{searchQuery}"</div>
          ) : (
            searchResults.map((loc, idx) => {
              const sub = [
                loc.item?.code,
                loc.item?.companyName || loc.item?.client,
                loc.city,
                loc.country !== 'Unknown' ? loc.country : null
              ].filter(Boolean).join(' · ');
              return (
                <div
                  key={String(loc.id || loc.projectId || idx)}
                  className={`map-search-item${idx === searchFocusIndex ? ' focused' : ''}`}
                  role="option"
                  aria-selected={idx === searchFocusIndex}
                  onMouseDown={e => { e.preventDefault(); handleSearchSelect(loc); }}
                >
                  <div className="map-search-item-name">
                    {highlightMatch(loc.name || 'Unnamed', searchQuery)}
                  </div>
                  {sub && <div className="map-search-item-sub">{sub}</div>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="map-outer-wrapper" style={{ height: "calc(100vh - 160px)", minHeight: "560px", fontFamily: "Inter, sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        ${mapStyles}

        /* ── Reduce Bootstrap parent padding, keep small 1rem buffer ── */
        .map-outer-wrapper {
          width: calc(100% + 4rem);
          margin-left: -2rem;
          margin-top: -1.5rem;
        }
        @media (min-width: 992px) {
          .map-outer-wrapper {
            width: calc(100% + 7rem);
            margin-left: -3.5rem;
            margin-top: -1.5rem;
          }
        }

        /* Leaflet background while tiles load — matches CartoDB Voyager ocean colour */
        .leaflet-container { background: #d4e8f2 !important; }

        /* ── Small / medium screens: full-width bar, filter button + search only.
           Collapse early (≤992px) so the cascading dropdowns never overlap. ── */
        @media (max-width: 992px) {
          .floating-filter-bar {
            /* Override centered positioning — pin edge-to-edge instead */
            left: 10px !important;
            right: 10px !important;
            transform: none !important;          /* CRITICAL: kills translateX(-50%) */
            animation: none !important;          /* entrance keyframe uses translateX(-50%) — off on mobile */
            display: flex !important;            /* stretch to fill left→right */
            padding: 6px 10px !important;
            border-radius: 12px !important;
            max-width: none !important;
          }
          /* Pills handled by the bottom-sheet; hide them */
          .filter-pills-scroll { display: none !important; }
          .filter-divider { display: none !important; }
          /* Search stretches to fill remaining space */
          .filter-search-area {
            border-left: none !important;
            padding-left: 0 !important;
            flex: 1 1 auto !important;
          }
          .map-search-wrapper { width: 100% !important; }
          /* Reveal the filter button */
          .mobile-filter-btn-wrap { display: flex !important; }
          /* Push label panel below the filter bar on mobile */
          .map-control-panel { top: 72px !important; }
        }

        /* ── Mobile filter trigger button ── */
        .mobile-filter-btn-wrap {
          display: none;
          align-items: center;
          flex-shrink: 0;
          margin-right: 8px;
        }
        .mobile-filter-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 13px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
          position: relative;
        }
        .mobile-filter-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .mobile-filter-btn.has-filters {
          background: ${PROJECT_FILTER_THEME.primary};
          border-color: ${PROJECT_FILTER_THEME.primaryDark};
          color: #ffffff;
        }
        .mobile-filter-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 9px;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
        }
        .mobile-filter-btn:not(.has-filters) .mobile-filter-badge {
          background: ${PROJECT_FILTER_THEME.primary};
          color: white;
        }

        /* ── Mobile filter bottom-sheet ── */
        .mobile-filter-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          animation: mfOverlayIn 0.2s ease;
        }
        @keyframes mfOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .mobile-filter-sheet {
          background: #ffffff;
          border-radius: 20px 20px 0 0;
          max-height: 88vh;
          overflow-y: auto;
          animation: mfSheetUp 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @keyframes mfSheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .mobile-filter-drag-handle {
          width: 36px; height: 4px;
          background: #e2e8f0; border-radius: 2px;
          margin: 10px auto 0;
        }
        .mobile-filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .mobile-filter-title {
          font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;
        }
        .mobile-filter-close {
          background: #f1f5f9; border: none; border-radius: 50%;
          width: 30px; height: 30px;
          font-size: 18px; color: #64748b;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; line-height: 1;
          transition: background 0.15s;
        }
        .mobile-filter-close:hover { background: #e2e8f0; }
        .mobile-filter-body {
          padding: 16px 20px;
          display: flex; flex-direction: column; gap: 18px;
        }
        .mf-row { display: flex; flex-direction: column; gap: 6px; }
        .mf-label {
          font-size: 11px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .mf-toggle-row { display: flex; gap: 8px; }
        .mf-toggle-btn {
          flex: 1; padding: 10px 8px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: #f8fafc;
          font-size: 13px; font-weight: 500; color: #1e293b;
          cursor: pointer; text-align: center;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .mf-toggle-btn.active {
          background: ${PROJECT_FILTER_THEME.primary}; border-color: ${PROJECT_FILTER_THEME.primaryDark}; color: #ffffff;
        }
        .mf-select {
          width: 100%;
          padding: 11px 38px 11px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          background-image: url("data:image/svg+xml;utf8,<svg fill='%23475569' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M5.5 7.5l4.5 5 4.5-5z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          font-size: 14px; color: #1e293b;
          appearance: none; -webkit-appearance: none;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .mf-select:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .mf-select:disabled { opacity: 0.45; cursor: not-allowed; color: #94a3b8; }
        .mobile-filter-footer {
          display: flex; gap: 10px;
          padding: 12px 20px 24px;
          border-top: 1px solid #f1f5f9;
        }
        .mf-btn-reset {
          flex: 1; padding: 12px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: #f8fafc;
          font-size: 14px; font-weight: 600; color: #64748b;
          cursor: pointer; transition: background 0.15s;
        }
        .mf-btn-reset:hover { background: #f1f5f9; }
        .mf-btn-apply {
          flex: 2; padding: 12px; border-radius: 10px;
          border: none; background: ${PROJECT_FILTER_THEME.primary};
          font-size: 14px; font-weight: 600; color: #ffffff;
          cursor: pointer; transition: background 0.15s;
        }
        .mf-btn-apply:hover { background: ${PROJECT_FILTER_THEME.primaryDark}; }

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
        
        /* Filter Bar — centered auto-width, two sections: scrollable pills + fixed search */
        @keyframes filterBarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .floating-filter-bar {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 7px 12px;
          /* Frosted-glass map overlay — sits over the tiles like a premium control */
          background: rgba(255, 255, 255, 0.72);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          backdrop-filter: blur(16px) saturate(180%);
          border-radius: 16px;
          box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.14),
            0 2px 8px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.6);
          min-height: 48px;
          animation: filterBarIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          /* The map wrapper bleeds 7rem past the visible area (negative margins), and the
             layers control sits top-right — so reserve 15rem of horizontal room. Otherwise
             the bar grows wider than what's on screen, the pills don't trigger their scroll,
             and they crowd the search. On wide screens the bar is still auto-width/centered;
             this cap only engages when space is tight, switching the pills to scroll. */
          max-width: calc(100% - 15rem);
          /* No overflow here — let filter-pills-scroll handle it so search dropdown is never clipped */
        }

        /* Scrollable pills strip */
        .filter-pills-scroll {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          /* Thin visible scrollbar so users can tell the pills scroll when space is tight */
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          flex: 1 1 auto;
          min-width: 0;
        }
        .filter-pills-scroll::-webkit-scrollbar { height: 4px; }
        .filter-pills-scroll::-webkit-scrollbar-track { background: transparent; }
        .filter-pills-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .filter-pills-scroll:hover::-webkit-scrollbar-thumb { background: #94a3b8; }

        /* Fixed search section — sits outside the overflow container so dropdown is never clipped */
        .filter-search-area {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding-left: 8px;
          margin-left: 2px;
          border-left: 1px solid #e2e8f0;
          position: relative;
        }

        .filter-divider {
          width: 1px;
          height: 20px;
          background: linear-gradient(to bottom, transparent, #dbe1ea 22%, #dbe1ea 78%, transparent);
          flex-shrink: 0;
          margin: 0 4px;
        }

        /* ── Custom filter dropdown (trigger pill) ─────────────────── */
        .pill-dd {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 13px;
          border-radius: 999px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          max-width: 260px;
          outline: none;
          transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
        }
        .pill-dd:hover:not(:disabled) {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.10);
          transform: translateY(-1px);
        }
        .pill-dd:focus-visible {
          border-color: ${PROJECT_FILTER_THEME.primary};
          box-shadow: 0 0 0 3px ${PROJECT_FILTER_THEME.shadow};
        }
        .pill-dd.active {
          background: ${PROJECT_FILTER_THEME.primary};
          border-color: ${PROJECT_FILTER_THEME.primaryDark};
          color: #ffffff;
          box-shadow: 0 4px 14px ${PROJECT_FILTER_THEME.shadow};
        }
        .pill-dd.active:hover {
          background: ${PROJECT_FILTER_THEME.primaryDark};
          transform: translateY(-1px);
          box-shadow: 0 6px 18px ${PROJECT_FILTER_THEME.shadow};
        }
        .pill-dd:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: rgba(248, 250, 252, 0.6);
          color: #94a3b8;
          border-color: #e8edf3;
        }
        .pill-dd-label { overflow: hidden; text-overflow: ellipsis; }
        .pill-dd-caret { font-size: 10px; opacity: 0.6; transition: transform 0.2s ease; }
        .pill-dd[aria-expanded="true"] .pill-dd-caret { transform: rotate(180deg); }

        /* ── Custom filter dropdown (options panel — neutral & premium) ── */
        .pill-dd-panel {
          z-index: 4000;
          background: #ffffff;
          border: 1px solid #e6eaf0;
          border-radius: 14px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08);
          padding: 6px;
          overflow: hidden;
          transform-origin: top center;
          animation: pillDdIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes pillDdIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Search box pinned at the top; only the list below it scrolls */
        .pill-dd-search-row {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 9px;
          margin-bottom: 4px;
          border-radius: 9px;
          background: #f1f5f9;
          border: 1px solid transparent;
          transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .pill-dd-search-row:focus-within {
          background: #ffffff;
          border-color: ${PROJECT_FILTER_THEME.primary};
          box-shadow: 0 0 0 3px ${PROJECT_FILTER_THEME.shadow};
        }
        .pill-dd-search-icon { font-size: 12px; color: #94a3b8; flex-shrink: 0; }
        .pill-dd-search {
          flex: 1 1 auto;
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          color: #1e293b;
          min-width: 0;
        }
        .pill-dd-search::placeholder { color: #94a3b8; }
        .pill-dd-search-clear {
          border: none; background: none; cursor: pointer;
          color: #94a3b8; font-size: 16px; line-height: 1; padding: 0 2px; flex-shrink: 0;
        }
        .pill-dd-search-clear:hover { color: #475569; }
        .pill-dd-list {
          max-height: 260px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #d7dee7 transparent;
        }
        .pill-dd-list::-webkit-scrollbar { width: 10px; }
        .pill-dd-list::-webkit-scrollbar-track { background: transparent; }
        .pill-dd-list::-webkit-scrollbar-thumb { background: #d7dee7; border-radius: 999px; border: 3px solid #ffffff; }
        .pill-dd-list::-webkit-scrollbar-thumb:hover { background: #c2cbd6; }
        .pill-dd-empty { padding: 14px 10px; text-align: center; font-size: 12px; color: #94a3b8; }
        .pill-dd-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px 10px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          text-align: left;
          font-family: inherit;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .pill-dd-option:hover { background: #f1f5f9; color: #0f172a; }
        .pill-dd-option.selected { background: #f3f5f9; color: #0f172a; font-weight: 600; }
        .pill-dd-option.selected:hover { background: #eaeef4; }
        .pill-dd-check {
          width: 14px;
          flex-shrink: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          justify-content: center;
        }
        .pill-dd-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pill-dd-count {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          background: #eef2f7;
          border-radius: 999px;
          padding: 1px 8px;
          min-width: 24px;
          text-align: center;
        }
        .pill-dd-option:hover .pill-dd-count { background: #e2e8f0; }
        .pill-dd-option.selected .pill-dd-count { background: #e2e8f0; }

        .pill-button {
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(226, 232, 240, 0.9);
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
          white-space: nowrap;
          line-height: 1.4;
          display: flex;
          align-items: center;
        }
        .pill-button:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.10);
          transform: translateY(-1px);
        }
        .pill-button.active {
          background: linear-gradient(135deg, #c6474b 0%, ${PROJECT_FILTER_THEME.primary} 55%, ${PROJECT_FILTER_THEME.primaryDark} 100%);
          border-color: ${PROJECT_FILTER_THEME.primaryDark};
          color: #ffffff;
          box-shadow: 0 4px 14px ${PROJECT_FILTER_THEME.shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .pill-button.active:hover {
          background: linear-gradient(135deg, #cf4d51 0%, ${PROJECT_FILTER_THEME.primaryDark} 100%);
          border-color: ${PROJECT_FILTER_THEME.primaryDark};
          transform: translateY(-1px);
          box-shadow: 0 6px 18px ${PROJECT_FILTER_THEME.shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .pill-button:active { transform: translateY(0); }
        .total-badge {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 5px 13px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          letter-spacing: -0.1px;
          flex-shrink: 0;
        }

        /* ── Search Input ─────────────────────────────────────────── */
        /* ── Custom map project search ────────────────────────────────── */
        .map-search-wrapper {
          position: relative;
          width: 220px;
          flex-shrink: 0;
        }
        .map-search-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.7);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .map-search-row:hover {
          border-color: #cbd5e1;
          background: #ffffff;
        }
        .map-search-row:focus-within {
          border-color: ${PROJECT_FILTER_THEME.primary};
          box-shadow: 0 0 0 3px ${PROJECT_FILTER_THEME.shadow};
          background: #ffffff;
        }
        .map-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          width: 100%;
          min-width: 0;
        }
        .map-search-input::placeholder { color: #94a3b8; font-size: 12px; }
        .map-search-clear {
          background: none;
          border: none;
          padding: 0;
          color: #94a3b8;
          cursor: pointer;
          font-size: 15px;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.1s;
        }
        .map-search-clear:hover { color: #475569; }
        /* Dropdown panel */
        .map-search-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 300px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
          z-index: 9999;
          overflow: hidden;
          max-height: 360px;
          overflow-y: auto;
        }
        .map-search-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 9px 14px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.1s;
        }
        .map-search-item:last-child { border-bottom: none; }
        .map-search-item:hover, .map-search-item.focused {
          background: #f0f7ff;
        }
        .map-search-item-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .map-search-item-sub {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .map-search-empty {
          padding: 18px 14px;
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
        }

        /* ── Company / Contact map header (title + search) ──────────────── */
        .entity-map-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0.75rem 1.5rem;
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          min-height: 4.5rem;
        }
        .entity-map-title {
          font-weight: 600;
          font-size: 1.5rem;
          color: #2c3e50;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .entity-map-search { flex-shrink: 0; }
        .entity-map-search .map-search-wrapper { width: 260px; }

        /* Map height: project map fills the wrapper; entity maps leave room for the header. */
        .map-leaflet--project { height: 100%; }
        .map-leaflet--entity { height: calc(100% - 4.5rem); }
        @media (max-width: 640px) {
          .map-leaflet--entity { height: calc(100% - 7rem); }
        }
        /* Anchor the dropdown to the search box's right edge on these maps */
        .entity-map-search .map-search-dropdown { right: 0; left: auto; }

        @media (max-width: 640px) {
          .entity-map-header {
            flex-wrap: wrap;
            align-items: stretch;
            padding: 0.6rem 1rem;
            min-height: 7rem;
          }
          .entity-map-title { font-size: 1.15rem; width: 100%; }
          .entity-map-search { width: 100%; }
          .entity-map-search .map-search-wrapper { width: 100%; }
        }

        @keyframes search-marker-bounce-pulse {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-12px) scale(1.1); }
          50% { transform: translateY(0) scale(1); }
          70% { transform: translateY(-6px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        .search-marker-bounce {
          animation: search-marker-bounce-pulse 1.2s ease-in-out infinite;
        }

        /* ── Mobile label panel shift ───────────────────────────────── */
        @media (max-width: 992px) {
          .map-control-panel { top: 80px !important; }
        }

        /* ----------------------------------------------------------- */
        /* Clean & Modern Leaflet Popup Overhaul */
        /* ----------------------------------------------------------- */
        
        .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: 320px !important;
        }
        .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
          color: #94a3b8 !important;
          font-size: 20px !important;
          z-index: 100;
        }
        .leaflet-popup-close-button:hover {
          color: #ef4444 !important;
          background: transparent !important;
        }

        .company-popup-container, .card-popup-container {
          padding: 0;
          display: flex;
          flex-direction: column;
          background: #ffffff;
        }

        .popup-header-section {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px 16px 16px;
          border-bottom: 1px solid #f1f5f9;
          text-align: center;
        }

        .header-action-left {
          position: absolute;
          left: 10px;
          top: 10px;
          z-index: 101;
        }

        .header-center-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .avatar-wrapper {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2c7be5, #1d4ed8);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(44, 123, 229, 0.2);
        }

        .title-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          padding: 0 10px;
        }

        .entity-name {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          cursor: pointer;
          line-height: 1.3;
          word-break: break-word;
        }
        .entity-name:hover { color: #2c7be5; }

        .entity-label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-top: 4px;
        }

        .report-ghost-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .report-ghost-btn:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .popup-content-body {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .error-badge-container {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-container {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .status-name {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }

        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .info-icon {
          color: #94a3b8;
          font-size: 18px !important;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .info-text {
          font-size: 13px;
          color: #334155;
          line-height: 1.4;
          word-break: break-word;
        }
        .info-text.highlight {
          font-weight: 600;
          color: #0f172a;
          font-size: 14px;
        }
        .info-text.small {
          font-size: 12px;
        }

        .contact-info-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: #f8fafc;
          padding: 8px;
          border-radius: 8px;
        }

        .relationship-card {
          margin-top: 4px;
          padding: 10px;
          background: #f1f5f9;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .rel-header {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .rel-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          cursor: pointer;
          user-select: none;
        }

        .toggle-container input {
          width: 14px;
          height: 14px;
          accent-color: #2c7be5;
          cursor: pointer;
        }

        .toggle-label {
          font-size: 11px;
          font-weight: 500;
          color: #475569;
        }

        .popup-actions {
          padding: 12px 16px 16px 16px;
        }

        .primary-go-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #2c7be5, #1d4ed8);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(44, 123, 229, 0.3);
        }
        .primary-go-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(44, 123, 229, 0.4);
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        .primary-go-btn:active {
          transform: translateY(0);
        }

        .popup-error {
          border-top: 4px solid #ef4444 !important;
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .leaflet-popup-content {
            width: 280px !important;
          }
        }
      `}</style>

      {/* Filter Bar — pills scroll independently; search area sits outside overflow so dropdown is never clipped */}
      {isProject && (
        <div className="floating-filter-bar" role="toolbar" aria-label="Project filters">

          {/* Mobile-only: filter trigger button (hidden on desktop via CSS) */}
          <div className="mobile-filter-btn-wrap">
            <button
              className={`mobile-filter-btn${activeFilterCount > 0 ? ' has-filters' : ''}`}
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            >
              <i className="bi bi-sliders2" style={{ fontSize: 13 }} />
              Filters
              {activeFilterCount > 0 && (
                <span className="mobile-filter-badge">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Scrollable pills — All, World, count, cascading dropdowns, Clear */}
          <div className="filter-pills-scroll">

            <div
              className={`pill-button pill-button--all ${!isWorldFilter && !selectedCountry && !selectedState && !selectedCity && !selectedLocality ? "active" : ""}`}
              onClick={() => {
                setIsWorldFilter(false);
                setSelectedCountry(null);
                setSelectedState(null);
                setSelectedCity(null);
                setSelectedLocality(null);
                setFlyTarget({ lat: 20, lng: 10, zoom: 2 });
              }}
              aria-label={`Show all ${locations.length} projects`}
              title="Show all projects"
            >
              <BriefcaseIcon style={{ fontSize: 14, marginRight: 4 }} />
              All Projects ({locations.length})
            </div>

            <div className="filter-divider" />

            <div
              className={`pill-button ${isWorldFilter ? "active" : ""}`}
              onClick={() => {
                setIsWorldFilter(prev => !prev);
                setSelectedCountry(null);
                setSelectedState(null);
                setSelectedCity(null);
                setSelectedLocality(null);
              }}
              title="Show only international (non-India) projects"
            >
              <i className="bi bi-globe2 me-1" style={{ fontSize: 11 }} />
              World ({worldCount})
            </div>

            <div className="filter-divider" />

            {/* Country */}
            <PillDropdown
              ariaLabel="Filter by country"
              placeholder={isWorldFilter ? "N/A" : "All Countries"}
              disabled={isWorldFilter}
              disabledText="Disabled in World view"
              active={!!selectedCountry}
              value={selectedCountry}
              minWidth={150}
              options={isWorldFilter ? [] : Object.entries(filterOptions.countries).sort().map(([name, count]) => ({ name, count: count as number }))}
              onChange={(val) => {
                setSelectedCountry(val);
                setSelectedState(null);
                setSelectedCity(null);
                setSelectedLocality(null);
                if (val) {
                  const countryLocs = locations.filter(loc => loc.country === val);
                  const bounds = computeBounds(countryLocs);
                  if (bounds) setFlyTarget({ bounds, maxZoom: 6 });
                }
              }}
            />

            {/* State */}
            <PillDropdown
              ariaLabel="Filter by state"
              placeholder={isWorldFilter ? "N/A" : "All States"}
              disabled={isWorldFilter || !selectedCountry}
              disabledText={isWorldFilter ? "Disabled in World view" : "Select a country first"}
              active={!!selectedState}
              value={selectedState}
              minWidth={140}
              options={selectedCountry && !isWorldFilter ? Object.entries(filterOptions.states).sort().map(([name, count]) => ({ name, count: count as number })) : []}
              onChange={(val) => {
                setSelectedState(val);
                setSelectedCity(null);
                setSelectedLocality(null);
                if (val) {
                  const stateLocs = locations.filter(loc => loc.state === val && loc.country === selectedCountry);
                  const bounds = computeBounds(stateLocs);
                  if (bounds) setFlyTarget({ bounds, maxZoom: 9 });
                }
              }}
            />

            {/* City */}
            <PillDropdown
              ariaLabel="Filter by city"
              placeholder={isWorldFilter ? "N/A" : "All Cities"}
              disabled={isWorldFilter || !selectedState}
              disabledText={isWorldFilter ? "Disabled in World view" : "Select a state first"}
              active={!!selectedCity}
              value={selectedCity}
              minWidth={130}
              options={selectedState && !isWorldFilter ? Object.entries(filterOptions.cities).sort().map(([name, count]) => ({ name, count: count as number })) : []}
              onChange={(city) => {
                setSelectedCity(city);
                setSelectedLocality(null);
                if (city) {
                  const cityLocs = locations.filter(loc => loc.city === city && loc.state === selectedState);
                  const centroid = computeCentroid(cityLocs);
                  if (centroid) setFlyTarget({ ...centroid, zoom: 11 });
                }
              }}
            />

            {/* Locality */}
            <PillDropdown
              ariaLabel="Filter by locality"
              placeholder={isWorldFilter ? "N/A" : "All Localities"}
              disabled={isWorldFilter || !selectedCity}
              disabledText={isWorldFilter ? "Disabled in World view" : "Select a city first"}
              active={!!selectedLocality}
              value={selectedLocality}
              minWidth={130}
              options={selectedCity && !isWorldFilter ? Object.entries(filterOptions.localities).sort().map(([name, count]) => ({ name, count: count as number })) : []}
              onChange={(locality) => {
                setSelectedLocality(locality);
                if (locality) {
                  const localityLocs = locations.filter(loc => loc.locality === locality && loc.city === selectedCity);
                  const centroid = computeCentroid(localityLocs);
                  if (centroid) setFlyTarget({ ...centroid, zoom: 14 });
                }
              }}
            />

            {/* Clear — visible when any filter is active */}
            {(selectedCountry || selectedState || selectedCity || selectedLocality || isWorldFilter) && (
              <button
                onClick={() => {
                  setSelectedCountry(null);
                  setSelectedState(null);
                  setSelectedCity(null);
                  setSelectedLocality(null);
                  setIsWorldFilter(false);
                }}
                style={{ border: "none", background: "none", color: "#ef4444", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, paddingLeft: 4 }}
                aria-label="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>{/* end filter-pills-scroll */}

          {/* Search — outside pills scroll so dropdown is never clipped */}
          <div className="filter-search-area">
            {renderMapSearch()}
          </div>

        </div>
      )}

      {/* ── Mobile filter bottom-sheet (position:fixed escapes the overflow:hidden wrapper) ── */}
      {isMobileFilterOpen && isProject && (
        <div className="mobile-filter-overlay" onClick={() => setIsMobileFilterOpen(false)}>
          <div className="mobile-filter-sheet" onClick={e => e.stopPropagation()}>
            <div className="mobile-filter-drag-handle" />
            <div className="mobile-filter-header">
              <h3 className="mobile-filter-title">Filters</h3>
              <button className="mobile-filter-close" onClick={() => setIsMobileFilterOpen(false)} aria-label="Close filters">×</button>
            </div>
            <div className="mobile-filter-body">

              {/* View */}
              <div className="mf-row">
                <span className="mf-label">View</span>
                <div className="mf-toggle-row">
                  <button
                    className={`mf-toggle-btn${!isWorldFilter ? ' active' : ''}`}
                    onClick={() => { setIsWorldFilter(false); setSelectedCountry(null); setSelectedState(null); setSelectedCity(null); setSelectedLocality(null); }}
                  >
                    <BriefcaseIcon style={{ fontSize: 15, marginRight: 4 }} />
                    All ({locations.length})
                  </button>
                  <button
                    className={`mf-toggle-btn${isWorldFilter ? ' active' : ''}`}
                    onClick={() => { setIsWorldFilter(true); setSelectedCountry(null); setSelectedState(null); setSelectedCity(null); setSelectedLocality(null); }}
                  >
                    <i className="bi bi-globe2 me-1" style={{ fontSize: 12 }} />
                    International ({worldCount})
                  </button>
                </div>
              </div>

              {/* Country */}
              <div className="mf-row">
                <span className="mf-label">Country</span>
                <select
                  className="mf-select"
                  value={selectedCountry || ""}
                  disabled={isWorldFilter}
                  onChange={e => { setSelectedCountry(e.target.value || null); setSelectedState(null); setSelectedCity(null); setSelectedLocality(null); }}
                >
                  <option value="">{isWorldFilter ? 'N/A' : 'All Countries'}</option>
                  {!isWorldFilter && Object.entries(filterOptions.countries).sort().map(([n, c]) => (
                    <option key={n} value={n}>{n} ({c})</option>
                  ))}
                </select>
              </div>

              {/* State */}
              <div className="mf-row">
                <span className="mf-label">State / Province</span>
                <select
                  className="mf-select"
                  value={selectedState || ""}
                  disabled={isWorldFilter || !selectedCountry}
                  onChange={e => { setSelectedState(e.target.value || null); setSelectedCity(null); setSelectedLocality(null); }}
                >
                  <option value="">{isWorldFilter ? 'N/A' : selectedCountry ? 'All States' : 'Select Country first'}</option>
                  {selectedCountry && !isWorldFilter && Object.entries(filterOptions.states).sort().map(([n, c]) => (
                    <option key={n} value={n}>{n} ({c})</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div className="mf-row">
                <span className="mf-label">City</span>
                <select
                  className="mf-select"
                  value={selectedCity || ""}
                  disabled={isWorldFilter || !selectedState}
                  onChange={e => {
                    const city = e.target.value || null;
                    setSelectedCity(city); setSelectedLocality(null);
                    if (city) {
                      const cl = locations.filter(l => l.city === city && l.state === selectedState);
                      const ct = computeCentroid(cl);
                      if (ct) setFlyTarget({ ...ct, zoom: 11 });
                    }
                  }}
                >
                  <option value="">{isWorldFilter ? 'N/A' : selectedState ? 'All Cities' : 'Select State first'}</option>
                  {selectedState && !isWorldFilter && Object.entries(filterOptions.cities).sort().map(([n, c]) => (
                    <option key={n} value={n}>{n} ({c})</option>
                  ))}
                </select>
              </div>

              {/* Locality */}
              <div className="mf-row">
                <span className="mf-label">Locality</span>
                <select
                  className="mf-select"
                  value={selectedLocality || ""}
                  disabled={isWorldFilter || !selectedCity}
                  onChange={e => {
                    const loc = e.target.value || null;
                    setSelectedLocality(loc);
                    if (loc) {
                      const ll = locations.filter(l => l.locality === loc && l.city === selectedCity);
                      const ct = computeCentroid(ll);
                      if (ct) setFlyTarget({ ...ct, zoom: 14 });
                    }
                  }}
                >
                  <option value="">{isWorldFilter ? 'N/A' : selectedCity ? 'All Localities' : 'Select City first'}</option>
                  {selectedCity && !isWorldFilter && Object.entries(filterOptions.localities).sort().map(([n, c]) => (
                    <option key={n} value={n}>{n} ({c})</option>
                  ))}
                </select>
              </div>

            </div>
            <div className="mobile-filter-footer">
              <button
                className="mf-btn-reset"
                onClick={() => { setSelectedCountry(null); setSelectedState(null); setSelectedCity(null); setSelectedLocality(null); setIsWorldFilter(false); }}
              >
                Reset All
              </button>
              <button className="mf-btn-apply" onClick={() => setIsMobileFilterOpen(false)}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header for company / contact maps — title + working, responsive search */}
      {!isProject && (
        <div className="entity-map-header">
          <div className="entity-map-title">{displayTitle}</div>
          <div className="entity-map-search">
            {renderMapSearch()}
          </div>
        </div>
      )}

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={4}
        minZoom={2}
        maxBounds={WORLD_PAN_BOUNDS}
        maxBoundsViscosity={0.65}
        worldCopyJump={true}
        className={isProject ? "map-leaflet--project" : "map-leaflet--entity"}
        style={{ width: "100%", minHeight: "500px" }}
        zoomControl={false}
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <MapInvalidator />
        <MapZoomSyncHandler setZoom={setZoom} />
        <ZoomHandler setZoom={setZoom} />
        <MapCenterHandler userLocation={userLocation} />
        <MapClickHandler onClick={() => setActiveCompany(null)} />
        <MapFlyHandler target={flyTarget} onDone={() => setFlyTarget(null)} />

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

        {/* Viewport culling keeps this fast: only the markers currently on screen
            are mounted, but each one sits exactly where it's placed (no clustering). */}
        <ViewportTracker onChange={setViewBounds} />
        {visibleLocations.map((loc) => {
          const uniqueId = getMarkerKey(loc);
          const isAnimating = animatedProjectId === String(loc.id || loc.projectId || loc.item?.id);
          return (
            <LocationMarker
              key={uniqueId}
              uniqueId={uniqueId}
              loc={loc}
              isContact={isContact}
              isCompany={isCompany}
              isProject={isProject}
              zoomBucket={zoomBucket}
              labelMode={labelMode}
              showLabel={labeledIds.has(uniqueId)}
              handleGoToLocation={handleGoToLocation}
              activeMarkerId={activeMarkerId}
              setActiveMarkerId={setActiveMarkerId}
              activeCompany={activeCompany}
              setActiveCompany={setActiveCompany}
              isAnimating={isAnimating}
            />
          );
        })}
      </MapContainer>

      {/* Floating Collapsible Map Labels Control Panel */}
      <div 
        ref={labelPanelRef}
        className={`map-control-panel ${isLabelPanelExpanded ? 'expanded' : 'collapsed'}`}
      >
        {!isLabelPanelExpanded ? (
          <button
            className="map-control-toggle-btn"
            onClick={() => setIsLabelPanelExpanded(true)}
            title="Label Display"
            aria-label="Toggle map label settings"
          >
            <LayersIcon
              style={{
                fontSize: '20px',
                color: labelMode !== 'none' ? '#2c7be5' : '#94a3b8'
              }}
            />
            {labelMode !== 'none' && <div className="active-indicator-dot" />}
          </button>
        ) : (
          <div className="map-control-expanded-content" role="group" aria-label="Map label options">
            <div className="map-control-header">
              <span className="map-control-title">Map Labels</span>
              <button
                className="map-control-close-btn"
                onClick={() => setIsLabelPanelExpanded(false)}
                aria-label="Close label settings"
              >
                &times;
              </button>
            </div>

            <label className="map-control-option">
              <input
                type="radio"
                name="labelMode"
                checked={labelMode === 'smart'}
                onChange={() => handleLabelModeChange('smart')}
              />
              Smart labels
            </label>
            <label className="map-control-option">
              <input
                type="radio"
                name="labelMode"
                checked={labelMode === 'all'}
                onChange={() => handleLabelModeChange('all')}
              />
              All labels
            </label>
            <label className="map-control-option">
              <input
                type="radio"
                name="labelMode"
                checked={labelMode === 'none'}
                onChange={() => handleLabelModeChange('none')}
              />
              No labels
            </label>
          </div>
        )}
      </div>
    </div>
  );
}


