import React, { useState, useEffect, useRef } from "react";
import { Grid, CircularProgress, IconButton, Tooltip } from "@mui/material";
import { MyLocation, LocationOn } from "@mui/icons-material";
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
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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

  // Sync pending city when cities array loads
  useEffect(() => {
    if (pendingGeoCity && cities && cities.length > 0) {
      const foundCity = cities.find((c: any) => 
        c.name.toLowerCase() === pendingGeoCity.toLowerCase() || 
        pendingGeoCity.toLowerCase().includes(c.name.toLowerCase())
      );
      if (foundCity) {
        if (addressData.city !== foundCity.id) {
           setFieldValue(`${addressPath}.city`, foundCity.id);
        }
        setPendingGeoCity(null);
      }
    }
  }, [cities, pendingGeoCity]);

  // Initialize marker and center based on existing form data
  useEffect(() => {
    const lat = parseFloat(addressData.latitude);
    const lng = parseFloat(addressData.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
    }
  }, []);

  // Sync Google Map Link to Lat/Lng (if user pastes short link)
  useEffect(() => {
    let active = true;
    const resolveLink = async () => {
      const link = addressData.googleMapLink;
      if (!link) return;
      
      if (isResolving) return;
      
      setIsResolving(true);
      
      try {
        if (link.includes("maps.app.goo.gl") || link.includes("goo.gl")) {
           const { data } = await axios.get(`${API_BASE_URL}/api/employee/resolve-map-link?url=${encodeURIComponent(link)}`, {
             headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
           });
           if (active && data?.data?.finalUrl) {
              extractCoordinatesFromUrl(data.data.finalUrl);
           }
        } else {
           if (active) extractCoordinatesFromUrl(link);
        }
      } catch (error) {
        console.error("Failed to resolve link", error);
      }
      if (active) setIsResolving(false);
    };
    
    resolveLink();
    return () => { active = false; };
  }, [addressData.googleMapLink]);

  const extractCoordinatesFromUrl = (url: string) => {
     const exactMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
     if (exactMatch) {
       updateLocation(parseFloat(exactMatch[1]), parseFloat(exactMatch[2]));
       return;
     }
     const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
     if (atMatch) {
       updateLocation(parseFloat(atMatch[1]), parseFloat(atMatch[2]));
     }
  };

  const updateLocation = (lat: number, lng: number, placeData?: any) => {
    setCenter({ lat, lng });
    setMarkerPosition({ lat, lng });
    setFieldValue(`${addressPath}.latitude`, lat.toString());
    setFieldValue(`${addressPath}.longitude`, lng.toString());

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
    try {
      const { data } = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (data && data.address) {
        parseAddressComponents(data);
      }
    } catch (error) {
      console.error("Reverse geocoding error", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowDropdown(true);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const { data } = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
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
          const { data } = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
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
    updateLocation(parseFloat(place.lat), parseFloat(place.lon), place);
  };

  const parseAddressComponents = (result: any) => {
    // If it's from reverse geocode it has .address directly. 
    // If from search, we need to do a quick reverse geocode to get the address details cleanly, 
    // or just use whatever address parts Nominatim returned if available (add &addressdetails=1 to search).
    // Let's assume result.address is populated.
    const components = result.address || {};
    
    const formatted = result.display_name || "";
    setSearchQuery(formatted);
    setFieldValue(`${addressPath}.projectAddress`, formatted);
    
    const city = components.city || components.town || components.village || components.county || "";
    const state = components.state || "";
    const country = components.country || "";
    const pincode = components.postcode || "";

    if (pincode) setFieldValue(`${addressPath}.pincode`, pincode);
    
    // Auto-sync country, state, and city
    if (country) {
       const foundCountry = countryOptions.find(c => 
         c.label.toLowerCase() === country.toLowerCase() || 
         country.toLowerCase().includes(c.label.toLowerCase())
       );
       
       if (foundCountry) {
          if (addressData.country !== foundCountry.value) {
             handleAddressCountryChange(index, foundCountry.value, setFieldValue);
          }
          
          // Queue state and city to be synced once the dropdown options load from the backend
          if (state) setPendingGeoState(state);
          if (city) setPendingGeoCity(city);
       }
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
         <h5 className="mb-0 fw-bold d-flex align-items-center text-primary" style={{ fontFamily: 'Inter' }}>
            <LocationOn className="me-2" /> Smart Location Details
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
           
            {markerPosition && (
              <Marker position={[markerPosition.lat, markerPosition.lng]} icon={premiumMarkerIcon} />
            )}
            <MapEvents onMapClick={onMapClick} />
            <MapUpdater center={center} zoom={markerPosition ? 16 : 11} bounds={mapBounds} />
            <LayerTracker />
            <MapInvalidator />
          </MapContainer>

          {!markerPosition && (
            <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', pointerEvents: 'none', zIndex: 1000 }}>
               Click anywhere on the map to drop a pin
            </div>
          )}
        </div>

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
                      formikField={`${addressPath}.country`}
                      inputLabel="Country"
                      options={countryOptions}
                      onChange={(val: any) => handleAddressCountryChange(index, val?.value, setFieldValue)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DropDownInput
                      formikField={`${addressPath}.state`}
                      inputLabel="State"
                      options={(states || []).map((x: any) => ({ value: x.id, label: x.name }))}
                      onChange={(val: any) => handleAddressStateChange(index, val?.value, addressData.country, setFieldValue)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DropDownInput
                      formikField={`${addressPath}.city`}
                      inputLabel="City"
                      options={(cities || []).map((x: any) => ({ value: x.id, label: x.name }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextInput formikField={`${addressPath}.pincode`} label="Pincode" />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                     <TextInput formikField={`${addressPath}.projectAddress`} label="Formatted Address" />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextInput formikField={`${addressPath}.latitude`} label="Latitude" isRequired={false} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextInput formikField={`${addressPath}.longitude`} label="Longitude" isRequired={false} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextInput
                      formikField={`${addressPath}.googleMapLink`}
                      label="Google Map Link"
                      isRequired={false}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextInput
                      formikField={`${addressPath}.gmbLink`}
                      label="Google Business Link"
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
