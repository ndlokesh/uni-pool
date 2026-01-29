import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: -10
};

const defaultCenter = {
    lat: 17.4447, // Hyderabad (NNRG area approx)
    lng: 78.6500
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    scaleControl: false,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false,
    styles: [ // Uber-like "Night Mode" Style
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
        },
        {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
        },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
        },
        {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
        },
        {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
        },
        {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
        },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
        },
    ],
};

const GoogleMapWrapper = ({ center, markers = [], onMapClick, isLoaded }) => {
    const [map, setMap] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    // Get Real-time User Location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(pos);
                    if (map && !center) { // Only center if no overwrite center provided
                        map.panTo(pos);
                    }
                },
                () => {
                    console.log("Error getting location");
                }
            );
        }
    }, [map, center]);


    const mapCenter = center && center[0] ? { lat: center[0], lng: center[1] } : (userLocation || defaultCenter);

    if (!isLoaded) return <div className="h-screen w-full bg-gray-900 animate-pulse"></div>;

    // Safety check for Google Maps API
    const isGoogleMapsReady = isLoaded && window.google && window.google.maps;
    if (!isGoogleMapsReady) return <div className="h-screen w-full bg-gray-100 flex items-center justify-center text-red-500">Google Maps API failed to load. Check API Key.</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
            onClick={(e) => {
                if (onMapClick) onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            }}
        >
            {/* Render Ride Markers */}
            {markers.map((marker, idx) => (
                <Marker
                    key={idx}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    label={{
                        text: marker.label ? marker.label[0] : "R",
                        color: "white",
                        fontWeight: "bold"
                    }}
                />
            ))}

            {/* Current User Location - Blue Dot */}
            {userLocation && isGoogleMapsReady && (
                <Marker
                    position={userLocation}
                    icon={{
                        path: window.google.maps.SymbolPath?.CIRCLE,
                        scale: 8,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    }}
                />
            )}

            {/* Draw Route Line if we have at least 2 markers */}
            {markers.length >= 2 && isGoogleMapsReady && (
                <Polyline
                    path={markers.map(m => ({ lat: m.lat, lng: m.lng }))}
                    options={{
                        strokeColor: "#ffffff",
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        geodesic: true,
                        icons: [{
                            icon: { path: window.google.maps.SymbolPath?.FORWARD_CLOSED_ARROW },
                            offset: '100%',
                            repeat: '200px'
                        }]
                    }}
                />
            )}
        </GoogleMap>
    );
};

export default GoogleMapWrapper;
