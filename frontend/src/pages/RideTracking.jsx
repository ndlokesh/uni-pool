import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapBackground from '../components/MapBackground';
import rideService from '../services/rideService';
import authService from '../services/authService';
import { initSocket, joinRideRoom, sendLocationUpdate, disconnectSocket } from '../services/socketService';
import Navbar from '../components/Navbar';

const RideTracking = () => {
    const { rideId } = useParams();
    const navigate = useNavigate();
    const [ride, setRide] = useState(null);
    const [markers, setMarkers] = useState([]);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [loading, setLoading] = useState(true);
    const currentUser = authService.getCurrentUser();
    const watchIdRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        const fetchRideData = async () => {
            try {
                const rideData = await rideService.getRide(rideId);
                setRide(rideData);

                // Fetch Route Geometry for Ant Animation
                const estimate = await rideService.getRideEstimate({
                    sourceLat: rideData.sourceLat,
                    sourceLng: rideData.sourceLng,
                    destLat: rideData.destLat,
                    destLng: rideData.destLng,
                    vehicleType: rideData.vehicleType
                });

                if (estimate && estimate.geometry) {
                    setRouteGeometry(estimate.geometry);
                }

                setLoading(false);
            } catch (error) {
                console.error("Error fetching ride:", error);
                navigate('/my-rides');
            }
        };

        if (rideId) fetchRideData();
    }, [rideId, navigate]);

    // Socket & Location Tracking
    useEffect(() => {
        if (!ride) return;

        const socket = initSocket();

        socket.on('connect', () => {
            joinRideRoom(rideId);
        });

        // Listen for other users' locations
        socket.on('receive_location', (data) => {
            // data: { userId, lat, lng, heading, type }
            setMarkers(prev => {
                const otherMarkers = prev.filter(m => m.id !== data.userId);
                return [...otherMarkers, {
                    id: data.userId,
                    lat: data.lat,
                    lng: data.lng,
                    label: data.role === 'driver' ? 'Driver' : 'Passenger',
                    type: data.role === 'driver' ? 'car' : 'person'
                }];
            });
        });

        // Start Watching My Location
        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, heading } = position.coords;

                    const myRole = (ride.createdBy._id === currentUser.id || ride.createdBy === currentUser.id) ? 'driver' : 'rider';

                    // Update Socket
                    sendLocationUpdate({
                        rideId,
                        userId: currentUser.id,
                        lat: latitude,
                        lng: longitude,
                        heading: heading,
                        role: myRole
                    });

                    // Update My Local Marker
                    setMarkers(prev => {
                        const otherMarkers = prev.filter(m => m.id !== currentUser.id);
                        return [...otherMarkers, {
                            id: currentUser.id,
                            lat: latitude,
                            lng: longitude,
                            label: 'You',
                            type: myRole === 'driver' ? 'car' : 'person'
                        }];
                    });
                },
                (error) => console.error("Location error:", error),
                { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
            );
        }

        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            disconnectSocket();
            socket.off('receive_location');
        };
    }, [ride, rideId, currentUser.id]);

    if (loading) return <div className="flex justify-center items-center h-screen">Loading Ride...</div>;

    const center = ride ? [ride.sourceLat, ride.sourceLng] : [17.4447, 78.6500];

    return (
        <div className="relative h-screen w-full">
            <Navbar className="absolute top-0 z-50 w-full" />

            <MapBackground
                center={center}
                markers={markers}
                routeGeometry={routeGeometry}
                className="h-full w-full absolute top-0 left-0 z-0"
            />

            {/* Ride Status Overlay */}
            <div className="absolute bottom-10 left-0 right-0 px-4 z-40">
                <div className="bg-white/90 backdrop-blur-lg p-6 rounded-3xl shadow-2xl max-w-lg mx-auto border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{ride.source} → {ride.destination}</h2>
                            <p className="text-gray-500 text-sm">Live Tracking Active</p>
                        </div>
                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm animate-pulse">
                            ● Live
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {/* Initials avatars */}
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-white">
                                {ride.createdBy.name?.charAt(0)}
                            </div>
                            {ride.riders && ride.riders.map(r => (
                                <div key={r._id} className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold border-2 border-white">
                                    {r.name?.charAt(0)}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-600">
                            {ride.riders.length + 1} people in this ride
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RideTracking;
