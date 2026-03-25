import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import rideService from '../services/rideService';
import { searchLocation, reverseGeocode } from '../services/mapService';
import authService from '../services/authService';
import Navbar from '../components/Navbar';
import MapBackground from '../components/MapBackground';

const EDU_KWORDS = ['university', 'college', 'institute', 'school', 'campus', 'iit', 'nit', 'bits'];
const isEdu = (place) => {
    const t = (place.type || '').toLowerCase();
    const n = (place.display_name || '').toLowerCase();
    return EDU_KWORDS.some(k => t.includes(k) || n.includes(k));
};

const VEHICLE_ICON = { Car: '🚗', Bike: '🏍️', Auto: '🛺' };
const VEHICLE_COLOR = { Car: 'bg-blue-100 text-blue-700', Bike: 'bg-orange-100 text-orange-700', Auto: 'bg-green-100 text-green-700' };

// ── Small star rating bar ────────────────────────────────────────────────────
const Stars = ({ rating = 0 }) => (
    <span className="text-yellow-400 text-xs">
        {[1,2,3,4,5].map(s => <span key={s}>{s <= Math.round(rating) ? '★' : '☆'}</span>)}
        <span className="text-gray-400 ml-1">{rating ? rating.toFixed(1) : 'New'}</span>
    </span>
);

const SearchRide = () => {
    const currentUser = authService.getCurrentUser();

    // ── All rides from DB ─────────────────────────────────────────────────────
    const [rides, setRides]               = useState([]);
    const [filteredRides, setFilteredRides] = useState([]);

    // ── Search / Location ─────────────────────────────────────────────────────
    const [searchText, setSearchText]     = useState('');
    const [suggestions, setSuggestions]   = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [destCoords, setDestCoords]     = useState(null); // {lat, lng}
    const [mapCenter, setMapCenter]       = useState([17.385, 78.4867]); // Hyderabad default
    const [mapMarkers, setMapMarkers]     = useState([]);

    // ── Panel & Modal ─────────────────────────────────────────────────────────
    const [panelOpen, setPanelOpen]       = useState(false);
    const [selectedRide, setSelectedRide] = useState(null);
    const [isBooking, setIsBooking]       = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState('');

    const debounceRef = useRef(null);
    const searchRef   = useRef(null);

    // ── Fetch rides ───────────────────────────────────────────────────────────
    const fetchRides = useCallback(async () => {
        try {
            const data = await rideService.getRides({ active: true });
            setRides(data);
            setFilteredRides(data);
            // Show all ride source pins on map
            setMapMarkers(data.filter(r => r.sourceLat).map(r => ({
                id: r._id, lat: r.sourceLat, lng: r.sourceLng,
                label: `${r.vehicleType} · ₹${r.price || 0}`, type: 'car',
            })));
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchRides(); }, [fetchRides]);

    // ── Debounced search suggestions ──────────────────────────────────────────
    const handleSearchInput = useCallback(async (e) => {
        const val = e.target.value;
        setSearchText(val);
        setSearchFocused(true);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.length < 2) { setSuggestions([]); return; }

        setSearchLoading(true);
        debounceRef.current = setTimeout(async () => {
            const results = await searchLocation(val);
            setSuggestions(results);
            setSearchLoading(false);
        }, 280);
    }, []);

    // ── Pick a destination from suggestions ───────────────────────────────────
    const handlePickDestination = useCallback((place) => {
        const lat  = parseFloat(place.lat);
        const lng  = parseFloat(place.lon);
        // Use the short name — just the place/area name, not the full address string
        const name = place.short_name || place.display_name.split(',')[0];

        setSearchText(name);
        setDestCoords({ lat, lng });
        setMapCenter([lat, lng]);
        setSuggestions([]);
        setSearchFocused(false);
        setPanelOpen(true);

        // Filter rides that go to/from this place
        const lowerName = name.toLowerCase();
        const filtered = rides.filter(r =>
            r.destination?.toLowerCase().includes(lowerName) ||
            r.source?.toLowerCase().includes(lowerName)
        );
        setFilteredRides(filtered.length > 0 ? filtered : rides);

        // Add destination pin to map
        setMapMarkers(prev => [
            ...prev.filter(m => m.id !== '__dest__'),
            { id: '__dest__', lat, lng, label: name, type: 'location' }
        ]);
    }, [rides]);

    // ── Map click ─────────────────────────────────────────────────────────────
    const handleMapClick = useCallback(async (latlng) => {
        const { lat, lng } = latlng;
        // Never show raw coords — show 'Locating…' first
        setSearchText('Locating address…');
        setMapMarkers(prev => [...prev.filter(m => m.id !== '__dest__'), { id: '__dest__', lat, lng, label: 'Locating…', type: 'location' }]);

        const name = await reverseGeocode(lat, lng);
        const displayName = name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setSearchText(displayName);
        setDestCoords({ lat, lng });
        setPanelOpen(true);
        setFilteredRides(rides);
    }, [rides]);

    // ── Select a ride card ────────────────────────────────────────────────────
    const handleSelectRide = (ride) => {
        setSelectedRide(ride);
        setBookingSuccess(false);
        setBookingError('');
        if (ride.sourceLat) {
            setMapCenter([ride.sourceLat, ride.sourceLng]);
            setMapMarkers(prev => [
                ...prev.filter(m => m.id === '__dest__'),
                { id: ride._id, lat: ride.sourceLat, lng: ride.sourceLng, label: `Pickup: ${ride.source}`, type: 'location' },
                ...(ride.destLat ? [{ id: `${ride._id}_dest`, lat: ride.destLat, lng: ride.destLng, label: `Drop: ${ride.destination}`, type: 'location' }] : [])
            ]);
        }
    };

    // ── Confirm Booking ───────────────────────────────────────────────────────
    const confirmBooking = async () => {
        if (!selectedRide) return;
        setIsBooking(true);
        setBookingError('');
        try {
            await rideService.joinRide(selectedRide._id);
            setBookingSuccess(true);
            // Confetti 🎉
            const fire = (ratio, opts) => confetti({ origin: { y: 0.7 }, particleCount: Math.floor(200 * ratio), ...opts });
            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2,  { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1,  { spread: 120, startVelocity: 25 });

            await fetchRides();
            setTimeout(() => { setSelectedRide(null); setIsBooking(false); setBookingSuccess(false); }, 2500);
        } catch (err) {
            setBookingError(err.response?.data?.message || 'Failed to join ride. Try again.');
            setIsBooking(false);
        }
    };

    // ── Close suggestions on outside click ───────────────────────────────────
    useEffect(() => {
        const h = (e) => { if (!searchRef.current?.contains(e.target)) setSearchFocused(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const canJoin = (ride) =>
        ride.availableSeats > 0 &&
        ride.createdBy?._id !== currentUser?._id &&
        !ride.riders?.includes(currentUser?._id) &&
        !ride.pendingRiders?.includes(currentUser?._id);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="relative min-h-screen overflow-hidden bg-gray-100">

            {/* ── Full-screen map ── */}
            <MapBackground
                center={mapCenter}
                markers={mapMarkers}
                onMapClick={handleMapClick}
                className="fixed top-0 left-0 w-full h-full z-0"
            />

            {/* ── Overlay ── */}
            <div className="relative z-10 flex flex-col h-screen pointer-events-none">
                <Navbar />

                {/* ── Top Uber-style "Where to?" Search Bar ── */}
                <div className="px-4 pt-3 pointer-events-auto" ref={searchRef}>
                    <div className="max-w-lg mx-auto">
                        <div className={`bg-white rounded-2xl shadow-xl flex items-center gap-3 px-4 py-3 transition-all ${searchFocused ? 'ring-2 ring-indigo-500' : ''}`}>
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-sm">🔍</span>
                            </div>
                            <input
                                type="text"
                                value={searchText}
                                onChange={handleSearchInput}
                                onFocus={() => setSearchFocused(true)}
                                placeholder="Where do you want to go?"
                                className="flex-1 outline-none text-base font-medium text-gray-800 placeholder-gray-400 bg-transparent"
                                autoComplete="off"
                            />
                            {searchLoading && (
                                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            )}
                            {searchText && !searchLoading && (
                                <button onClick={() => { setSearchText(''); setSuggestions([]); setFilteredRides(rides); setPanelOpen(false); }}
                                    className="text-gray-400 hover:text-gray-600 flex-shrink-0">✕</button>
                            )}
                        </div>

                        {/* Suggestions dropdown */}
                        {searchFocused && (suggestions.length > 0 || searchLoading || searchText.length >= 2) && (
                            <div className="mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-80 overflow-y-auto">
                                {searchLoading && (
                                    <div className="flex items-center gap-3 px-4 py-3 text-gray-400 text-sm">
                                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                        Searching places…
                                    </div>
                                )}
                                {!searchLoading && suggestions.length === 0 && searchText.length >= 2 && (
                                    <div className="px-4 py-3 text-gray-400 text-sm">No places found. Try a different name.</div>
                                )}
                                {suggestions.map((place, i) => {
                                    const edu = isEdu(place);
                                    return (
                                        <div key={place.place_id || i}
                                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 ${edu ? 'hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                                            onMouseDown={() => handlePickDestination(place)}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${edu ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                                {edu ? '🎓' : '📍'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-semibold truncate ${edu ? 'text-indigo-700' : 'text-gray-900'}`}>
                                                    {place.display_name.split(',')[0]}
                                                </p>
                                                {edu && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">University / College</span>}
                                                <p className="text-xs text-gray-400 truncate">{place.display_name.split(',').slice(1, 3).join(', ')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Floating ride count badge ── */}
                {!panelOpen && filteredRides.length > 0 && (
                    <div className="flex justify-center mt-3 pointer-events-auto">
                        <button onClick={() => setPanelOpen(true)}
                            className="bg-black text-white px-5 py-2.5 rounded-full shadow-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition">
                            <span>🚗</span>
                            {filteredRides.length} ride{filteredRides.length !== 1 ? 's' : ''} available — tap to view
                            <span>↑</span>
                        </button>
                    </div>
                )}

                {/* ── Bottom Panel: ride list ── */}
                <div className={`pointer-events-auto mt-auto transition-all duration-300 ${panelOpen ? 'translate-y-0' : 'translate-y-[calc(100%-56px)]'}`}>
                    <div className="bg-white rounded-t-3xl shadow-2xl max-w-2xl mx-auto w-full">
                        {/* Handle + toggle */}
                        <button onClick={() => setPanelOpen(p => !p)} className="w-full pt-3 pb-1 flex flex-col items-center">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                            <p className="text-xs text-gray-400 mt-1 font-medium">
                                {panelOpen ? 'Hide rides ↓' : `${filteredRides.length} rides ↑`}
                            </p>
                        </button>

                        <div className="overflow-y-auto max-h-[55vh] px-4 pb-6 space-y-3">
                            {filteredRides.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-3">🚗</div>
                                    <p className="text-gray-500 font-semibold">No rides available right now</p>
                                    <p className="text-gray-400 text-sm mt-1">Try a different destination or check back soon</p>
                                </div>
                            ) : filteredRides.map(ride => {
                                const mine = ride.createdBy?._id === currentUser?._id;
                                const booked = ride.riders?.includes(currentUser?._id);
                                const pending = ride.pendingRiders?.includes(currentUser?._id);
                                const full = ride.availableSeats <= 0;
                                const joinable = !mine && !booked && !pending && !full;

                                return (
                                    <div key={ride._id}
                                        onClick={() => handleSelectRide(ride)}
                                        className={`bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all ${selectedRide?._id === ride._id ? 'border-indigo-500 shadow-lg shadow-indigo-100' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}>

                                        {/* Route */}
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="flex flex-col items-center pt-1 gap-1">
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                                <span className="w-0.5 h-6 bg-gray-200" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{ride.source}</p>
                                                <p className="text-xs text-gray-400 mt-1 mb-1">→ Drop</p>
                                                <p className="text-sm font-bold text-gray-900 truncate">{ride.destination}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xl font-black text-gray-900">₹{ride.price || 0}</p>
                                                <p className="text-xs text-gray-400">{ride.time}</p>
                                                <p className="text-xs text-gray-400">{new Date(ride.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                        </div>

                                        {/* Driver + vehicle row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
                                                    {ride.createdBy?.name?.[0]?.toUpperCase() || 'D'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-800">{ride.createdBy?.name || 'Driver'}</p>
                                                    <Stars rating={ride.createdBy?.averageRating} />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${VEHICLE_COLOR[ride.vehicleType] || 'bg-gray-100 text-gray-600'}`}>
                                                    {VEHICLE_ICON[ride.vehicleType] || '🚗'} {ride.vehicleType}
                                                </span>
                                                <span className="text-xs text-gray-500 font-medium">{ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''}</span>
                                                {joinable && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleSelectRide(ride); }}
                                                        className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-gray-800 transition">
                                                        Book
                                                    </button>
                                                )}
                                                {mine   && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Your Ride</span>}
                                                {booked && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">✓ Booked</span>}
                                                {pending && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Pending</span>}
                                                {full && !mine && !booked && !pending && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">Full</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Booking Confirmation Modal ── */}
            {selectedRide && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

                        {/* Header */}
                        <div className={`px-6 py-5 text-white relative ${selectedRide.vehicleType === 'Bike' ? 'bg-gradient-to-r from-orange-500 to-red-500' : selectedRide.vehicleType === 'Auto' ? 'bg-gradient-to-r from-green-500 to-teal-500' : 'bg-gradient-to-r from-gray-900 to-gray-800'}`}>
                            <button onClick={() => setSelectedRide(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm transition">✕</button>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {VEHICLE_ICON[selectedRide.vehicleType]} Confirm Your Ride
                            </h3>
                            <p className="text-white/70 text-sm mt-0.5">{selectedRide.source} → {selectedRide.destination}</p>
                        </div>

                        <div className="p-6">
                            {bookingSuccess ? (
                                <div className="text-center py-8">
                                    <div className="text-5xl mb-3">🎉</div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Ride Requested!</h3>
                                    <p className="text-gray-500 text-sm">Waiting for driver to accept your request.</p>
                                    <p className="text-gray-400 text-xs mt-2">Check "My Rides" for real-time updates</p>
                                </div>
                            ) : (
                                <>
                                    {bookingError && (
                                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{bookingError}</div>
                                    )}

                                    {/* Route visual */}
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="flex flex-col items-center mt-1 gap-1">
                                            <span className="w-3 h-3 rounded-full bg-green-500" />
                                            <span className="w-0.5 h-10 bg-gray-200" />
                                            <span className="w-3 h-3 rounded-full bg-red-500" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pickup</p>
                                                <p className="font-bold text-gray-900 text-sm">{selectedRide.source}</p>
                                                <p className="text-xs text-gray-500">{selectedRide.time} · {new Date(selectedRide.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Drop</p>
                                                <p className="font-bold text-gray-900 text-sm">{selectedRide.destination}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Driver */}
                                    <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg">
                                            {selectedRide.createdBy?.name?.[0]?.toUpperCase() || 'D'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{selectedRide.createdBy?.name || 'Driver'}</p>
                                            <Stars rating={selectedRide.createdBy?.averageRating} />
                                            <p className="text-xs text-gray-500 mt-0.5">{selectedRide.availableSeats} seat{selectedRide.availableSeats !== 1 ? 's' : ''} left · {selectedRide.vehicleType}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-gray-900">₹{selectedRide.price}</p>
                                            <p className="text-xs text-gray-400">per seat</p>
                                        </div>
                                    </div>

                                    <button onClick={confirmBooking} disabled={isBooking}
                                        className="w-full bg-black text-white py-4 rounded-2xl font-bold text-base hover:bg-gray-800 transition disabled:opacity-60 flex items-center justify-center gap-2">
                                        {isBooking
                                            ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending Request…</>
                                            : <>Send Ride Request →</>
                                        }
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchRide;
