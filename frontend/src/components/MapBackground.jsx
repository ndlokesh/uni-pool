import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ─────────────────────────────────────────────────────────────
   Leaflet default icon fix
───────────────────────────────────────────────────────────── */
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/* ─────────────────────────────────────────────────────────────
   Helper: Build a divIcon so we can rotate the car with CSS
───────────────────────────────────────────────────────────── */
const makeCarIcon = (heading = 0, isMe = false) =>
    L.divIcon({
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24],
        html: `
        <div style="
            width:44px;height:44px;
            display:flex;align-items:center;justify-content:center;
            background:${isMe ? '#1a1a2e' : '#4f46e5'};
            border-radius:50%;
            border:3px solid ${isMe ? '#60a5fa' : '#a5b4fc'};
            box-shadow:0 4px 15px rgba(79,70,229,0.5);
            transform:rotate(${heading}deg);
            transition:transform 0.4s ease;
        ">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="white" width="22" height="22">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                <circle cx="7.5" cy="14.5" r="1.5"/>
                <circle cx="16.5" cy="14.5" r="1.5"/>
            </svg>
        </div>`,
    });

const makePassengerIcon = (isMe = false) =>
    L.divIcon({
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
        html: `
        <div style="
            width:38px;height:38px;
            display:flex;align-items:center;justify-content:center;
            background:${isMe ? '#065f46' : '#0e7490'};
            border-radius:50%;
            border:3px solid ${isMe ? '#6ee7b7' : '#67e8f9'};
            box-shadow:0 4px 12px rgba(14,116,144,0.45);
        ">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="white" width="20" height="20">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
        </div>`,
    });

const makeLocationPin = (isStart = true) =>
    L.divIcon({
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        html: `
        <div style="
            width:36px;height:36px;
            display:flex;align-items:center;justify-content:center;
            background:${isStart ? '#16a34a' : '#dc2626'};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 4px 12px rgba(0,0,0,0.3);
        ">
            <span style="transform:rotate(45deg);font-size:16px">
                ${isStart ? '🟢' : '🔴'}
            </span>
        </div>`,
    });

/* ─────────────────────────────────────────────────────────────
   Smooth animated marker (uses leaflet marker.setLatLng)
   We move the Leaflet marker itself rather than re-mounting it.
───────────────────────────────────────────────────────────── */
const AnimatedMarker = ({ marker }) => {
    const markerRef = useRef(null);
    const prevPos = useRef([marker.lat, marker.lng]);

    // Choose icon
    const getIcon = () => {
        if (marker.type === 'car') return makeCarIcon(marker.heading || 0, marker.isMe);
        if (marker.type === 'person') return makePassengerIcon(marker.isMe);
        if (marker.type === 'location') return makeLocationPin(marker.id === 'source');
        return DefaultIcon;
    };

    // Animate movement when lat/lng changes
    useEffect(() => {
        if (!markerRef.current) return;
        const [lat, lng] = [marker.lat, marker.lng];
        const [prevLat, prevLng] = prevPos.current;
        if (lat === prevLat && lng === prevLng) return;

        // Smooth glide in 500 ms steps
        const STEPS = 25;
        const INTERVAL = 20; // ms ≈ 500ms total
        let step = 0;
        const interval = setInterval(() => {
            step++;
            const t = step / STEPS;
            const interpLat = prevLat + (lat - prevLat) * t;
            const interpLng = prevLng + (lng - prevLng) * t;
            if (markerRef.current) {
                markerRef.current.setLatLng([interpLat, interpLng]);
                // Also update heading icon during move
                if (marker.type === 'car') {
                    markerRef.current.setIcon(makeCarIcon(marker.heading || 0, marker.isMe));
                }
            }
            if (step >= STEPS) {
                clearInterval(interval);
                prevPos.current = [lat, lng];
            }
        }, INTERVAL);

        return () => clearInterval(interval);
    }, [marker.lat, marker.lng, marker.heading, marker.type, marker.isMe]);

    return (
        <Marker
            ref={markerRef}
            position={[marker.lat, marker.lng]}
            icon={getIcon()}
        >
            <Popup>
                <div style={{ textAlign: 'center', fontWeight: 700, color: '#1a1a2e', minWidth: 120 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>
                        {marker.type === 'car' ? '🚗' : marker.type === 'person' ? '🧑' : '📍'}
                    </div>
                    <p style={{ margin: 0 }}>{marker.label || 'Location'}</p>
                    {(marker.type === 'car' || marker.type === 'person') && (
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#4f46e5', fontSize: 12, marginTop: 6, display: 'block' }}
                        >
                            Navigate Here
                        </a>
                    )}
                </div>
            </Popup>
        </Marker>
    );
};

/* ─────────────────────────────────────────────────────────────
   Sub-component: map click handler
───────────────────────────────────────────────────────────── */
const MapEvents = ({ onMapClick }) => {
    useMapEvents({ click: (e) => onMapClick(e.latlng) });
    return null;
};

/* ─────────────────────────────────────────────────────────────
   Sub-component: auto-follow driver
───────────────────────────────────────────────────────────── */
const FollowDriver = ({ followTarget }) => {
    const map = useMap();
    useEffect(() => {
        if (!followTarget) return;
        map.flyTo([followTarget.lat, followTarget.lng], Math.max(map.getZoom(), 15), {
            animate: true,
            duration: 1.2,
        });
    }, [followTarget, map]);
    return null;
};

/* ─────────────────────────────────────────────────────────────
   Sub-component: initial set view (non-animated)
───────────────────────────────────────────────────────────── */
const SetInitialView = ({ center }) => {
    const map = useMap();
    const applied = useRef(false);
    useEffect(() => {
        if (!map) return;
        if (!applied.current && center && center[0] && center[1]) {
            map.setView(center, 14);
            applied.current = true;
        }
    }, [center, map]);
    return null;
};

/* ─────────────────────────────────────────────────────────────
   Sub-component: draw the planned route polyline
───────────────────────────────────────────────────────────── */
const RoutePolyline = ({ geometry }) => {
    const map = useMap();
    useEffect(() => {
        if (!geometry?.coordinates) return;
        const latlngs = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const poly = L.polyline(latlngs, {
            color: '#4f46e5',
            weight: 5,
            opacity: 0.85,
            dashArray: null,
            lineCap: 'round',
            lineJoin: 'round',
        });
        // Glowing shadow line
        const shadow = L.polyline(latlngs, {
            color: '#a5b4fc',
            weight: 10,
            opacity: 0.3,
        });
        shadow.addTo(map);
        poly.addTo(map);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });

        return () => {
            map.removeLayer(poly);
            map.removeLayer(shadow);
        };
    }, [geometry, map]);
    return null;
};

/* ─────────────────────────────────────────────────────────────
   Main MapBackground component
   Props:
     center        – [lat, lng]  initial view center
     markers       – array of { id, lat, lng, label, type, heading, isMe }
     routeGeometry – GeoJSON geometry (line) for the planned route
     followDriver  – { lat, lng } object to auto-pan to, or null
     onMapClick    – optional click handler
     className     – container className
───────────────────────────────────────────────────────────── */
const MapBackground = ({
    center,
    markers = [],
    routeGeometry,
    followDriver,
    onMapClick,
    className = 'h-screen w-full fixed top-0 left-0 -z-10',
}) => {
    const defaultCenter = [17.4447, 78.65];
    const mapCenter = center && center[0] && center[1] ? center : defaultCenter;

    return (
        <div className={className}>
            <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                maxBounds={[[6.0, 68.0], [36.0, 98.0]]}
                minZoom={4}
                preferCanvas={false}
            >
                {/* Uber-style clean map tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    maxZoom={19}
                />

                <SetInitialView center={mapCenter} />

                {followDriver && <FollowDriver followTarget={followDriver} />}

                {onMapClick && <MapEvents onMapClick={onMapClick} />}

                {routeGeometry && <RoutePolyline geometry={routeGeometry} />}

                {markers.map((marker) => (
                    <AnimatedMarker key={marker.id} marker={marker} />
                ))}
            </MapContainer>

            {/* Top gradient for Navbar readability */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: 90,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 400,
            }} />
        </div>
    );
};

export default MapBackground;
