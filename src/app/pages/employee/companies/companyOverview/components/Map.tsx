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
  Navigation as NavigationIcon,
  ReportProblemOutlined as ReportIcon
} from "@mui/icons-material";
import { flagLocationError } from "@services/companies";
import { Modal, Form, Button } from "react-bootstrap";
import { successConfirmation } from "@utils/modal";

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
  const [isReporting, setIsReporting] = useState(false);

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
            disabled={isSubmitting || (!isError && remark.trim() === "")}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </Modal.Footer>
      </Modal>
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


