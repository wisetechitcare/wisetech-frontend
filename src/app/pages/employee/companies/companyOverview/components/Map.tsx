import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useNavigate } from "react-router-dom";

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

const getInitials = (name: string) => {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase() || "??";
};

const createCustomIcon = (initials: string, color: string, imageUrl?: string) => {
  try {
    // If we have no initials and no image, fallback to theme-colored circle
    const finalColor = color || "#3498db";
    
    // FALLBACK LEVEL 1 & 2: Custom Avatar or Initials
    const html = `
      <div style="position: relative; width: 34px; height: 34px; transition: all 0.3s ease-in-out;">
        <div style="
          width: 34px; 
          height: 34px; 
          border-radius: 50% 50% 50% 0; 
          background: ${finalColor}; 
          position: absolute; 
          transform: rotate(-45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
        <div style="
          width: 28px; 
          height: 28px; 
          position: absolute; 
          top: 3px; 
          left: 3px; 
          background: white; 
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 1;
        ">
          <span style="color: ${finalColor}; font-weight: bold; font-size: 11px; z-index: 1;">${initials || "??"}</span>
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
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
      tooltipAnchor: [17, -17],
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
  handleGoToLocation
}: { 
  loc: any; 
  isContact: boolean; 
  isCompany: boolean; 
  isProject: boolean; 
  zoom: number; 
  handleGoToLocation: (item: any) => void;
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
  const itemTitle = isContact 
    ? (loc.item?.fullName || loc.item?.name) 
    : isCompany 
      ? (loc.item?.companyName || loc.item?.name) 
      : loc.item?.title;
  
  const imageUrl = isContact ? loc.item?.profilePhoto : isCompany ? loc.item?.logo : undefined;
  const initials = useMemo(() => getInitials(itemTitle || ""), [itemTitle]);
  
  // 3. Country-based Color Logic
  const markerColor = useMemo(() => {
    if (!isProject) return "#e74c3c"; 
    return getCountryColor(loc.country);
  }, [isProject, loc.country]);

  // 4. Safe Icon handling
  const icon = useMemo(() => {
    try {
      const generatedIcon = createCustomIcon(initials, markerColor, imageUrl);
      return generatedIcon;
    } catch (error) {
      return L.divIcon({ html: '<div style="background: #3498db; width: 20px; height: 20px; border-radius: 50%;"></div>' });
    }
  }, [initials, markerColor, imageUrl]);

  const handleTitleClick = () => {
    if (isProject && (loc.projectId || loc.item?.id)) {
      navigate(`/projects/${loc.projectId || loc.item?.id}`);
    }
  };

  return (
    <Marker position={position} icon={icon}>
      {zoom >= 12 && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -10]}
          className="custom-marker-label"
        >
          {/* Visual Debug: Show country in tooltip */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 700 }}>
              {isContact ? (loc.item?.fullName || loc.item?.name || "Contact") : isCompany ? (loc.item?.companyName || loc.item?.name || "Company") : (loc.item?.title || "Project")}
            </span>
            <span style={{ fontSize: "10px", color: "#666" }}>
              {loc.country || "NO COUNTRY"}
            </span>
          </div>
        </Tooltip>
      )}
      <Popup maxWidth={300} minWidth={280}>
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {isProject ? (
              <h3
                style={{
                  cursor: "pointer",
                  color: "#2c7be5",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "16px",
                  margin: 0,
                  paddingBottom: "8px",
                  borderBottom: "1px solid #f0f0f0"
                }}
                onClick={() => loc.item?.id && navigate(`/projects/${loc.item.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                {loc.item?.title || "No Project Title"}
              </h3>
            ) : (
              <div 
                style={{ 
                  fontWeight: 600, 
                  fontSize: "16px", 
                  color: "#2c3e50", 
                  paddingBottom: "8px", 
                  borderBottom: "1px solid #f0f0f0" 
                }}
              >
                {isContact ? (loc.item?.fullName || loc.item?.name || "No Contact Name") : (loc.item?.companyName || loc.item?.name || "No Company Name")}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(!isCompany && !isContact) && (
                <>
                  {loc.item?.cost && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>💰</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Cost:</strong> ₹{loc.item.cost.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {loc.item?.status?.name && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>📌</span>
                      <span style={{ backgroundColor: loc.item.status.color || "#6c757d", color: "white", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
                        {loc.item.status.name}
                      </span>
                    </div>
                  )}
                  {loc.item?.company?.companyName && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>🏢</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Company:</strong> {loc.item.company.companyName}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isCompany && (
                <>
                  {loc.item?.type && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>🏢</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Type:</strong> {loc.item.type}
                      </div>
                    </div>
                  )}
                  {loc.item?.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>✉️</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Email:</strong> {loc.item.email}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isContact && (
                <>
                  {loc.item?.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>📞</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Phone:</strong> {loc.item.phone}
                      </div>
                    </div>
                  )}
                  {loc.item?.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>✉️</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Email:</strong> {loc.item.email}
                      </div>
                    </div>
                  )}
                  {loc.item?.roleInCompany && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>💼</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Role:</strong> {loc.item.roleInCompany}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ fontSize: "16px", marginTop: "2px" }}>📍</span>
                <div style={{ fontSize: "14px", color: "#495057" }}>
                  <strong>Address:</strong> {loc.name || "Unknown Address"}
                </div>
              </div>

              <button
                onClick={() => handleGoToLocation(loc.item)}
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  backgroundColor: "#3498db",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 4px rgba(52, 152, 219, 0.2)",
                }}
              >
                <span style={{ fontSize: "16px" }}>🚗</span>
                Go to Location
              </button>
            </div>
          </div>
        </div>
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
  points: { lat: number; lng: number; id?: string; projectId?: string }[];
  projectData?: any[];
  companyData?: any[];
  contactData?: any[];
}) {
  const [zoom, setZoom] = useState(4);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isWorldFilter, setIsWorldFilter] = useState(false);

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
    const validPoints = points
      .filter(p => p && typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng))
      .map((point) => {
        const matchedItem = currentData.find((item) => {
          if (!item) return false;
          if (point.id && item.id === point.id) return true;
          if (point.projectId && item.id === point.projectId) return true;
          const itemLat = parseFloat(item.latitude);
          const itemLng = parseFloat(item.longitude);
          return Math.abs(itemLat - point.lat) < 0.001 && Math.abs(itemLng - point.lng) < 0.001;
        });

        // Use structured data from form/database directly
        return {
          ...point,
          country: matchedItem?.country?.trim() || "Unknown",
          state: matchedItem?.state?.trim() || null,
          city: matchedItem?.city?.trim() || null,
          name: matchedItem?.title || "Unknown Location",
          item: matchedItem || {},
        };
      });

    setLocations(validPoints);
    return () => { isCancelled = true; };
  }, [points, projectData, companyData, contactData]);

  const handleGoToLocation = useCallback((item: any) => {
    if (!item || !item.latitude || !item.longitude) return;
    const destLat = item.latitude;
    const destLng = item.longitude;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}`;
          window.open(url, "_blank");
        },
        () => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
          window.open(url, "_blank");
        }
      );
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
      window.open(url, "_blank");
    }
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <style>{`
        .custom-marker-label {
          background-color: white !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          font-size: 12px !important;
          color: #2c3e50 !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          white-space: nowrap;
        }
        .leaflet-tooltip-top:before { display: none !important; }
        .custom-marker-icon { background: none !important; border: none !important; }
        
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
        .pill-select:hover { background-color: rgba(255, 255, 255, 0.85); }
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
        .pill-button:hover { background: rgba(255, 255, 255, 0.85); }
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
        {filteredLocations.map((loc, idx) => (
          <LocationMarker 
            key={loc.id || loc.projectId || `marker-${loc.lat}-${loc.lng}-${idx}`}
            loc={loc}
            isContact={isContact}
            isCompany={isCompany}
            isProject={isProject}
            zoom={zoom}
            handleGoToLocation={handleGoToLocation}
          />
        ))}
      </MapContainer>
    </div>
  );
}


