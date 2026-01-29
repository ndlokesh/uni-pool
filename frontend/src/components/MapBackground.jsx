import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Don't forget CSS

// Fix for default marker icon issues in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Sub-component to handle map clicks
const MapEvents = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });
    return null;
};

// Sub-component to update center
const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.flyTo(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const MapBackground = ({ center, markers = [], routeGeometry, onMapClick, className = "h-screen w-full fixed top-0 left-0 -z-10" }) => {

    // Default center if none provided (Hyderabad)
    const defaultCenter = [17.4447, 78.6500];
    const mapCenter = (center && center[0] && center[1]) ? center : defaultCenter;

    return (
        <div className={className}>
            <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} // Minimalist look
            >
                {/* Dark Mode Style for OSM */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <ChangeView center={mapCenter} />

                {onMapClick && <MapEvents onMapClick={onMapClick} />}

                {/* Draw Route if available */}
                {routeGeometry && (
                    <GeoJSON
                        data={routeGeometry}
                        style={{ color: "#3b82f6", weight: 5, opacity: 0.8 }}
                    />
                )}

                {markers.map((marker, idx) => (
                    <Marker
                        key={`${marker.id}-${idx}`}
                        position={[marker.lat, marker.lng]}
                    >
                        <Popup>
                            <div className="text-gray-800 font-bold p-2 text-center">
                                {marker.label || "Location"} <br />
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-500 text-xs underline mt-2 inline-block"
                                >
                                    Navigate
                                </a>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Gradient Overlay for better text visibility on top */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/90 to-transparent pointer-events-none z-[400]"></div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white/90 to-transparent pointer-events-none z-[400]"></div>
        </div>
    );
};

export default MapBackground;
