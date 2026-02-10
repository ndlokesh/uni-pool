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
    const [verifyingRiderId, setVerifyingRiderId] = useState(null);
    const [otpInput, setOtpInput] = useState("");
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

    const handleVerifyOtp = async () => {
        try {
            const res = await rideService.verifyOTP(rideId, otpInput);
            alert(res.message);
            setRide(res.ride); // Update ride state with new status
            setVerifyingRiderId(null);
            setOtpInput("");
        } catch (error) {
            alert(error.response?.data?.message || "Verification Failed");
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">Loading Ride...</div>;

    const isDriver = ride.createdBy._id === currentUser.id || ride.createdBy === currentUser.id;
    const myPassengerData = !isDriver && ride.passengers?.find(p => p.rider._id === currentUser.id || p.rider === currentUser.id);

    // Combine Real-time Markers with Static Source/Dest Markers
    const startMarker = { id: 'source', lat: ride.sourceLat, lng: ride.sourceLng, label: 'Start', type: 'location' };
    const endMarker = { id: 'dest', lat: ride.destLat, lng: ride.destLng, label: 'Drop', type: 'location' };
    const displayMarkers = [...markers, startMarker, endMarker];

    const center = ride ? [ride.sourceLat, ride.sourceLng] : [17.4447, 78.6500];

    return (
        <div className="relative h-screen w-full overflow-hidden">
            <Navbar className="absolute top-0 z-50 w-full" />

            <MapBackground
                center={center}
                markers={displayMarkers}
                routeGeometry={routeGeometry}
                className="h-full w-full absolute top-0 left-0 z-0"
            />

            {/* Ride Status Overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-40 flex justify-center">
                <div className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200/50">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{ride.source} → {ride.destination}</h2>
                            <p className="text-gray-500 text-sm mt-1">Live Ride Tracking</p>
                        </div>
                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs animate-pulse flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Live
                        </div>
                    </div>

                    {/* Passenger View: OTP Display */}
                    {myPassengerData && myPassengerData.status === 'confirmed' && (
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 text-center">
                            <p className="text-indigo-600 font-medium text-sm mb-1 uppercase tracking-wide">Share this OTP with Driver</p>
                            <p className="text-4xl font-extrabold text-indigo-700 tracking-widest">{myPassengerData.otp}</p>
                        </div>
                    )}

                    {/* Driver View: Passenger List & OTP Input */}
                    {isDriver && (
                        <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                            <h3 className="font-semibold text-gray-700 text-sm">Passengers</h3>
                            {ride.passengers && ride.passengers.length > 0 ? (
                                ride.passengers.map((p) => (
                                    <div key={p._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                {p.rider.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{p.rider.name}</p>
                                                <p className={`text-xs ${p.status === 'onboard' ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {p.status === 'onboard' ? 'Onboard' : 'Waiting Pickup'}
                                                </p>
                                            </div>
                                        </div>

                                        {p.status === 'confirmed' && (
                                            verifyingRiderId === p.rider._id ? (
                                                <div className="flex items-center gap-2 animate-fade-in">
                                                    <input
                                                        type="text"
                                                        placeholder="OTP"
                                                        maxLength="4"
                                                        className="w-16 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={otpInput}
                                                        onChange={(e) => setOtpInput(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={handleVerifyOtp}
                                                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                                    >
                                                        GO
                                                    </button>
                                                    <button
                                                        onClick={() => { setVerifyingRiderId(null); setOtpInput(""); }}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setVerifyingRiderId(p.rider._id)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                                                >
                                                    Verify OTP
                                                </button>
                                            )
                                        )}
                                        {p.status === 'onboard' && (
                                            <span className="text-green-500 font-bold text-lg">✓</span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm italic">No passengers yet.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RideTracking;
