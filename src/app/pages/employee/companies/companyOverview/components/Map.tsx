import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { fetchAddressDetails } from "@services/location";

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ZoomHandler({ setZoom }: { setZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  return null;
}

export default function Maps({
  points,
  projectData,
}: {
  points: { lat: number; lng: number; projectId?: string }[];
  projectData: any[];
}) {
  const [zoom, setZoom] = useState(4);
  const [locations, setLocations] = useState<
    { lat: number; lng: number; name?: string; project?: any }[]
  >([]);

  // Cache to avoid fetching the same address multiple times
  const addressCache = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!points || points.length === 0) {
      setLocations([]);
      return;
    }

    let isCancelled = false;

    // Filter & map valid points with project details
    const validPoints = points
      .filter(
        (point) =>
          point &&
          typeof point.lat === "number" &&
          typeof point.lng === "number" &&
          !isNaN(point.lat) &&
          !isNaN(point.lng)
      )
      .map((point) => {
        const matchedProject = projectData.find((proj) => {
          if (point.projectId && proj.id === point.projectId) return true;
          return (
            parseFloat(proj.latitude) === point.lat &&
            parseFloat(proj.longitude) === point.lng
          );
        });

        return {
          ...point,
          name:
            addressCache.current[`${point.lat},${point.lng}`] || "Loading...",
          project: matchedProject || null,
        };
      });

    setLocations(validPoints);

    // Fetch missing addresses sequentially
    async function fetchNamesSequentially() {
      const updated = [...validPoints];

      for (let i = 0; i < updated.length; i++) {
        if (isCancelled) return;

        const key = `${updated[i].lat},${updated[i].lng}`;
        if (addressCache.current[key]) {
          updated[i].name = addressCache.current[key];
          setLocations([...updated]);
          continue;
        }

        try {
          const res = await fetchAddressDetails(updated[i].lat, updated[i].lng);
          const address = res?.data?.address || "Unknown Location";
          addressCache.current[key] = address;
          updated[i].name = address;
        } catch {
          addressCache.current[key] = "Unknown Location";
          updated[i].name = "Unknown Location";
        }

        setLocations([...updated]);
        await new Promise((resolve) => setTimeout(resolve, 1100)); // 1.1s delay to avoid API block
      }
    }

    fetchNamesSequentially();

    return () => {
      isCancelled = true;
    };
  }, [points, projectData]);

  const filteredLocations = locations;

  return (
    <div style={{ height: "100vh", width: "100%", fontFamily: "Inter, sans-serif" }}>
    <div
      style={{
        fontWeight: 600,
        fontSize: "1.75rem",
        padding: "1rem 1.5rem",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #e9ecef",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        marginBottom: "0.5rem",
        color: "#2c3e50",
      }}
    >
      Project by Location
    </div>
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={4}
      style={{ height: "calc(100% - 3rem)", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ZoomHandler setZoom={setZoom} />
      {filteredLocations.map((loc, idx) => (
        <Marker key={idx} position={[loc.lat, loc.lng]}>
          <Popup maxWidth={300} minWidth={280}>
            <div
              
            >
              {/* Card Container */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {/* Project Name (Card Header) */}
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "16px",
                    color: "#2c3e50",
                    paddingBottom: "8px",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  {loc.project?.title || "No Project Title"}
                </div>
  
                {/* Card Body */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* Cost */}
                  {loc.project?.cost && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>💰</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Cost:</strong> ₹{loc.project.cost.toLocaleString()}
                      </div>
                    </div>
                  )}
  
                  {/* Status */}
                  {loc.project?.status?.name && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>📌</span>
                      <span
                        style={{
                          backgroundColor: loc.project.status.color || "#6c757d",
                          color: "white",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        {loc.project.status.name}
                      </span>
                    </div>
                  )}
  
                  {/* Company */}
                  {loc.project?.company?.companyName && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>🏢</span>
                      <div style={{ fontSize: "14px", color: "#495057" }}>
                        <strong>Company:</strong> {loc.project.company.companyName}
                      </div>
                    </div>
                  )}
  
                  {/* Address */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span style={{ fontSize: "16px", marginTop: "2px" }}>📍</span>
                    <div style={{ fontSize: "14px", color: "#495057" }}>
                      <strong>Address:</strong> {loc.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  </div>
  
  );
}
