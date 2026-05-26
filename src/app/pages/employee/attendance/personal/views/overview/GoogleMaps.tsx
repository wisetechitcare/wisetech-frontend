import { useCallback, useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { mapStyles } from "../../../../companies/companyOverview/components/mapTheme";
import "leaflet/dist/leaflet.css";

// leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// This component handles map center updates when position changes
function MapUpdater({ position }: { position: any }) {
  const map = useMap();

  useEffect(() => {
    if (position && position.latitude && position.longitude) {
      map.setView([position.latitude, position.longitude], 16);
    }
  }, [map, position]);

  return null;
}

function GoogleMaps(): JSX.Element {
  const { position, currentAddress } = useSelector((state: RootState) => ({
    position: state.attendance.position,
    currentAddress: state.attendance.currentAddress,
  }));

  const [infoWindowShown, setInfoWindowShown] = useState<boolean>(false);
  const mapRef = useRef(null);

  // Check if position is valid
  const isValidPosition = position &&
    typeof position.latitude === 'number' &&
    typeof position.longitude === 'number' &&
    !isNaN(position.latitude) &&
    !isNaN(position.longitude);

  // Default center for initial map load
  const defaultCenter = isValidPosition
    ? [position.latitude, position.longitude]
    : [0, 0];  // Fallback coordinates if position is invalid

  const handleMarkerClick = useCallback(() => {
    setInfoWindowShown((prev) => !prev);
  }, []);

  return (
    <div className="leaflet-map-container" style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
      <style>{`
        ${mapStyles}
      `}</style>
      {isValidPosition ? (
        <MapContainer
          center={defaultCenter as [number, number]}
          zoom={16}
          scrollWheelZoom={true}
          dragging={true}
          touchZoom={true}
          zoomControl={true}
          style={{
            height: '100%',
            width: '100%',
            minHeight: '400px',
            zIndex: 1
          }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[position.latitude, position.longitude]}
            eventHandlers={{ click: handleMarkerClick }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -10]}
              className="google-style-label"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontWeight: 700 }}>My Location</span>
                <span style={{ fontSize: "11px", color: "#666" }}>
                  {currentAddress && currentAddress.length > 35 ? `${currentAddress.substring(0, 35)}...` : currentAddress || "Current Location"}
                </span>
              </div>
            </Tooltip>
            {infoWindowShown && (
              <Popup
                eventHandlers={{ remove: () => setInfoWindowShown(false) }}
                closeButton={true}
              >
                <div>{currentAddress || "Current Location"}</div>
              </Popup>
            )}
          </Marker>
          <MapUpdater position={position} />
        </MapContainer>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading map... Waiting for valid position data.
        </div>
      )}
    </div>
  );
}

export default GoogleMaps;