import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AntPath } from 'leaflet-ant-path';

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

// Custom Uber-like Car Icon
const CarIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png', // Simple top-down car
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

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
            map.flyTo(center, map.getZoom(), {
                animate: true,
                duration: 1.5 // Smooth fly animation
            });
        }
    }, [center, map]);
    return null;
};

// Animated Route Component (Ant Algorithm Visualization)
const AnimatedRoute = ({ geometry }) => {
    const map = useMap();

    useEffect(() => {
        if (!geometry || !geometry.coordinates) return;

        // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
        const latLngs = geometry.coordinates.map(coord => [coord[1], coord[0]]);

        const antPath = new AntPath(latLngs, {
            "delay": 400,
            "dashArray": [10, 20],
            "weight": 5,
            "color": "#3b82f6", // Blue route
            "pulseColor": "#ffffff", // White ants
            "paused": false,
            "reverse": false,
            "hardwareAccelerated": true
        });

        antPath.addTo(map);

        // Fit bounds to route
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50] });

        return () => {
            map.removeLayer(antPath);
        };
    }, [geometry, map]);

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
                zoomControl={false}
            >
                {/* Dark Mode Style for OSM - High contrast for 'Uber' feel */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Cleaner, lighter map like Uber
                />

                <ChangeView center={mapCenter} />

                {onMapClick && <MapEvents onMapClick={onMapClick} />}

                {/* Animated Ant Path Route */}
                {routeGeometry && (
                    <AnimatedRoute geometry={routeGeometry} />
                )}

                {markers.map((marker, idx) => (
                    <Marker
                        key={`${marker.id}-${idx}`}
                        position={[marker.lat, marker.lng]}
                        icon={marker.type === 'car' ? CarIcon : DefaultIcon}
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

            {/* Gradient Overlay for better text visibility on top - refined */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent pointer-events-none z-[400]"></div>
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent pointer-events-none z-[400]"></div>
        </div>
    );
};

export default MapBackground;
