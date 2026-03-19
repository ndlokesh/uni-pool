import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapBackground from '../components/MapBackground';
import rideService from '../services/rideService';
import authService from '../services/authService';
import { initSocket, joinRideRoom, sendLocationUpdate, disconnectSocket } from '../services/socketService';
import Navbar from '../components/Navbar';

/* ─────────────────────────────────────────────────────────────
   Utility helpers
───────────────────────────────────────────────────────────── */
const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const etaText = (driverPos, destLat, destLng) => {
    if (!driverPos) return null;
    const km = haversineKm(driverPos.lat, driverPos.lng, destLat, destLng);
    const mins = Math.round((km / 30) * 60); // assume ~30 km/h avg city speed
    if (mins < 1) return 'Arriving now';
    return `~${mins} min`;
};

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
const RideTracking = () => {
    const { rideId } = useParams();
    const navigate = useNavigate();

    const [ride, setRide] = useState(null);
    const [liveMarkers, setLiveMarkers] = useState({}); // { userId: { lat, lng, role, heading } }
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verifyingRiderId, setVerifyingRiderId] = useState(null);
    const [otpInput, setOtpInput] = useState('');
    const [followDriver, setFollowDriver] = useState(null);   // { lat, lng } – triggers auto-pan
    const [autoFollow, setAutoFollow] = useState(true);       // user can turn off
    const [locationError, setLocationError] = useState(null);

    const currentUser = authService.getCurrentUser();
    const watchIdRef = useRef(null);
    const socketRef = useRef(null);

    /* ── Fetch ride data ──────────────────────────────────── */
    useEffect(() => {
        if (!rideId) return;

        const fetchRideData = async () => {
            try {
                const rideData = await rideService.getRide(rideId);
                setRide(rideData);

                // Fetch route geometry for the planned polyline
                try {
                    const estimate = await rideService.getRideEstimate({
                        sourceLat: rideData.sourceLat,
                        sourceLng: rideData.sourceLng,
                        destLat: rideData.destLat,
                        destLng: rideData.destLng,
                        vehicleType: rideData.vehicleType,
                    });
                    if (estimate?.geometry) setRouteGeometry(estimate.geometry);
                } catch (_) {
                    // Route geometry is optional – don't fail if OSRM is down
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching ride:', error);
                navigate('/my-rides');
            }
        };

        fetchRideData();
    }, [rideId, navigate]);

    /* ── Socket + GPS tracking ───────────────────────────── */
    useEffect(() => {
        if (!ride || !currentUser) return;

        const driverId = ride.createdBy?._id || ride.createdBy;
        const amIDriver = driverId === currentUser.id;
        const myRole = amIDriver ? 'driver' : 'rider';

        // Init socket and join room
        const socket = initSocket();
        socketRef.current = socket;

        const joinRoom = () => {
            joinRideRoom(rideId);
            console.log('[Tracking] Joined ride room', rideId);
        };

        if (socket.connected) joinRoom();
        socket.on('connect', joinRoom);

        // ── Receive other users' locations ─────────────────
        socket.on('receive_location', (data) => {
            // data: { userId, lat, lng, heading, role }
            setLiveMarkers((prev) => ({
                ...prev,
                [data.userId]: {
                    lat: data.lat,
                    lng: data.lng,
                    heading: data.heading || 0,
                    role: data.role,
                },
            }));

            // Auto-pan to driver if enabled
            if (data.role === 'driver' && autoFollow) {
                setFollowDriver({ lat: data.lat, lng: data.lng });
            }
        });

        // ── Receive snapshot of all current locations (for late joiners) ──
        socket.on('room_snapshot', (snapshot) => {
            // snapshot: { [userId]: { lat, lng, heading, role } }
            setLiveMarkers((prev) => ({ ...snapshot, ...prev }));
        });

        // ── Watch MY location with GPS ─────────────────────
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser/device.');
        } else {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, heading, accuracy } = position.coords;

                    if (accuracy > 100) return; // ignore inaccurate fixes

                    // Broadcast to room
                    sendLocationUpdate({
                        rideId,
                        userId: currentUser.id,
                        lat: latitude,
                        lng: longitude,
                        heading: heading || 0,
                        role: myRole,
                    });

                    // Update MY local marker
                    setLiveMarkers((prev) => ({
                        ...prev,
                        [currentUser.id]: {
                            lat: latitude,
                            lng: longitude,
                            heading: heading || 0,
                            role: myRole,
                        },
                    }));

                    // If I'm the driver and auto-follow is on, follow myself
                    if (amIDriver && autoFollow) {
                        setFollowDriver({ lat: latitude, lng: longitude });
                    }

                    setLocationError(null);
                },
                (err) => {
                    console.error('GPS error:', err);
                    let msg = 'Could not get your location.';
                    if (err.code === 1) msg = 'Location permission denied. Please enable it in browser settings.';
                    if (err.code === 2) msg = 'Position unavailable. Try moving to an open area.';
                    if (err.code === 3) msg = 'Location request timed out. Retrying…';
                    setLocationError(msg);
                },
                { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
            );
        }

        /* ── Cleanup ──────────────────────────────────────── */
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            socket.off('receive_location');
            socket.off('room_snapshot');
            socket.off('connect', joinRoom);
            disconnectSocket();
        };
    }, [ride, rideId, currentUser, autoFollow]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── OTP verify ──────────────────────────────────────── */
    const handleVerifyOtp = useCallback(async () => {
        try {
            const res = await rideService.verifyOTP(rideId, otpInput);
            alert(res.message);
            setRide(res.ride);
            setVerifyingRiderId(null);
            setOtpInput('');
        } catch (error) {
            alert(error.response?.data?.message || 'Verification Failed');
        }
    }, [rideId, otpInput]);

    /* ── Loading / guards ────────────────────────────────── */
    if (loading) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100vh', background: '#0f0f1a', color: 'white', gap: 16,
            }}>
                <div style={{
                    width: 52, height: 52, border: '4px solid rgba(255,255,255,0.15)',
                    borderTopColor: '#4f46e5', borderRadius: '50%',
                    animation: 'spin 0.9s linear infinite',
                }} />
                <p style={{ fontSize: 17, fontWeight: 600, opacity: 0.8 }}>Connecting to live ride…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    /* ── Derive roles ─────────────────────────────────────── */
    const driverId = ride.createdBy?._id || ride.createdBy;
    const isDriver = driverId === currentUser.id;
    const myPassengerData = !isDriver && ride.passengers?.find(
        (p) => p.rider?._id === currentUser.id || p.rider === currentUser.id
    );

    /* ── Build map markers ───────────────────────────────── */
    const startMarker = {
        id: 'source',
        lat: ride.sourceLat,
        lng: ride.sourceLng,
        label: `📍 Start: ${ride.source}`,
        type: 'location',
    };
    const endMarker = {
        id: 'dest',
        lat: ride.destLat,
        lng: ride.destLng,
        label: `🏁 Drop: ${ride.destination}`,
        type: 'location',
    };

    const liveMarkerList = Object.entries(liveMarkers).map(([userId, info]) => ({
        id: userId,
        lat: info.lat,
        lng: info.lng,
        heading: info.heading,
        label: userId === currentUser.id
            ? 'You'
            : info.role === 'driver'
                ? `Driver (${ride.createdBy?.name || 'Driver'})`
                : `Passenger`,
        type: info.role === 'driver' ? 'car' : 'person',
        isMe: userId === currentUser.id,
    }));

    const displayMarkers = [...liveMarkerList, startMarker, endMarker];

    // Initial center: prefer my own live location
    const myLive = liveMarkers[currentUser.id];
    const mapCenter = myLive
        ? [myLive.lat, myLive.lng]
        : [ride.sourceLat, ride.sourceLng];

    // ETA: based on driver position → destination
    const driverLive = liveMarkers[driverId];
    const eta = etaText(driverLive, ride.destLat, ride.destLng);

    /* ── Render ──────────────────────────────────────────── */
    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Navbar style={{ position: 'absolute', top: 0, zIndex: 500, width: '100%' }} />

            {/* Full-screen Map */}
            <MapBackground
                center={mapCenter}
                markers={displayMarkers}
                routeGeometry={routeGeometry}
                followDriver={autoFollow ? followDriver : null}
                className="h-full w-full absolute top-0 left-0 z-0"
            />

            {/* ── Location error toast ── */}
            {locationError && (
                <div style={{
                    position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
                    background: '#dc2626', color: 'white', padding: '10px 20px',
                    borderRadius: 12, zIndex: 600, maxWidth: '90%', fontSize: 13, fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    ⚠️ {locationError}
                </div>
            )}

            {/* ── Map control buttons ── */}
            <div style={{
                position: 'absolute', top: 80, right: 16, zIndex: 600, display: 'flex', flexDirection: 'column', gap: 8,
            }}>
                {/* Auto-follow toggle */}
                <button
                    onClick={() => setAutoFollow((v) => !v)}
                    title={autoFollow ? 'Auto-follow ON – click to disable' : 'Auto-follow OFF – click to enable'}
                    style={{
                        width: 46, height: 46,
                        borderRadius: 12,
                        border: autoFollow ? '2px solid #4f46e5' : '2px solid #d1d5db',
                        background: autoFollow ? '#4f46e5' : 'white',
                        color: autoFollow ? 'white' : '#6b7280',
                        fontSize: 20, cursor: 'pointer',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s',
                    }}
                >
                    🎯
                </button>

                {/* Jump to my location */}
                {myLive && (
                    <button
                        onClick={() => setFollowDriver({ ...myLive, _t: Date.now() })}
                        title="Jump to my location"
                        style={{
                            width: 46, height: 46,
                            borderRadius: 12,
                            border: '2px solid #d1d5db',
                            background: 'white',
                            color: '#374151',
                            fontSize: 20, cursor: 'pointer',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s',
                        }}
                    >
                        📍
                    </button>
                )}
            </div>

            {/* ── Bottom Card ─────────────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 16, left: 12, right: 12, zIndex: 500,
                display: 'flex', justifyContent: 'center',
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: 24,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                    padding: '20px 22px',
                    width: '100%', maxWidth: 680,
                    border: '1px solid rgba(0,0,0,0.07)',
                }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f0f1a' }}>
                                {ride.source} → {ride.destination}
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                                Live Ride Tracking
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            {/* Live badge */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: '#dcfce7', color: '#15803d',
                                borderRadius: 20, padding: '4px 10px',
                                fontWeight: 700, fontSize: 12,
                            }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                LIVE
                            </div>
                            {/* ETA badge */}
                            {eta && (
                                <div style={{
                                    background: '#eff6ff', color: '#1d4ed8',
                                    borderRadius: 20, padding: '4px 10px',
                                    fontWeight: 700, fontSize: 12,
                                }}>
                                    🕐 {eta} to destination
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Passenger Section: show my OTP ── */}
                    {myPassengerData?.status === 'confirmed' && (
                        <div style={{
                            background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                            border: '1px solid #c7d2fe',
                            borderRadius: 16, padding: '14px 18px',
                            marginBottom: 14, textAlign: 'center',
                        }}>
                            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Share this OTP with your Driver
                            </p>
                            <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: '#3730a3', letterSpacing: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {myPassengerData.otp}
                            </p>
                        </div>
                    )}

                    {/* ── Driver Section: passenger list + OTP verify ── */}
                    {isDriver && (
                        <div>
                            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Passengers
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                                {ride.passengers && ride.passengers.length > 0 ? (
                                    ride.passengers.map((p) => (
                                        <div key={p._id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: '#f9fafb', borderRadius: 12, padding: '10px 14px',
                                            border: '1px solid #e5e7eb',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                    color: 'white', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', fontWeight: 800, fontSize: 14,
                                                }}>
                                                    {p.rider?.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111827' }}>{p.rider?.name || 'Passenger'}</p>
                                                    <p style={{
                                                        margin: 0, fontSize: 12,
                                                        color: p.status === 'onboard' ? '#15803d' : '#b45309',
                                                        fontWeight: 600,
                                                    }}>
                                                        {p.status === 'onboard' ? '✅ Onboard' : '⏳ Waiting Pickup'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* OTP verify */}
                                            {p.status === 'confirmed' && (
                                                verifyingRiderId === (p.rider?._id || p.rider) ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <input
                                                            type="text"
                                                            placeholder="OTP"
                                                            maxLength={4}
                                                            value={otpInput}
                                                            onChange={(e) => setOtpInput(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                                                            style={{
                                                                width: 60, textAlign: 'center', fontSize: 16,
                                                                fontWeight: 800, padding: '6px 8px',
                                                                border: '2px solid #4f46e5', borderRadius: 8,
                                                                outline: 'none', letterSpacing: 4,
                                                            }}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleVerifyOtp}
                                                            style={{
                                                                background: '#16a34a', color: 'white',
                                                                border: 'none', borderRadius: 8,
                                                                padding: '7px 12px', fontWeight: 800,
                                                                fontSize: 13, cursor: 'pointer',
                                                            }}
                                                        >GO</button>
                                                        <button
                                                            onClick={() => { setVerifyingRiderId(null); setOtpInput(''); }}
                                                            style={{
                                                                background: 'transparent', border: 'none',
                                                                color: '#9ca3af', cursor: 'pointer', fontSize: 16,
                                                            }}
                                                        >✕</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setVerifyingRiderId(p.rider?._id || p.rider)}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                            color: 'white', border: 'none',
                                                            borderRadius: 10, padding: '7px 14px',
                                                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                                            boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
                                                        }}
                                                    >
                                                        Verify OTP
                                                    </button>
                                                )
                                            )}

                                            {p.status === 'onboard' && (
                                                <span style={{ fontSize: 20 }}>✅</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>No passengers yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Live participants row */}
                    <div style={{
                        marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6',
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Live:</span>
                        {Object.entries(liveMarkers).map(([uid, info]) => (
                            <div key={uid} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: info.role === 'driver' ? '#eef2ff' : '#ecfdf5',
                                color: info.role === 'driver' ? '#4f46e5' : '#15803d',
                                borderRadius: 20, padding: '3px 10px',
                                fontSize: 12, fontWeight: 700,
                            }}>
                                {info.role === 'driver' ? '🚗' : '🧑'}{' '}
                                {uid === currentUser.id ? 'You' : info.role === 'driver' ? 'Driver' : 'Passenger'}
                            </div>
                        ))}
                        {Object.keys(liveMarkers).length === 0 && (
                            <span style={{ fontSize: 12, color: '#d1d5db' }}>Waiting for participants to share location…</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Animation keyframes */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default RideTracking;
