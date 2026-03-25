import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import rideService from '../services/rideService';
import { searchLocation, resolveCoordinates, reverseGeocode } from '../services/mapService';
import { getVerificationStatus } from '../services/driverVerificationService';
import Navbar from '../components/Navbar';
import MapBackground from '../components/MapBackground';

const EDU_KEYWORDS = ['university', 'college', 'institute', 'school', 'campus', 'iit', 'nit', 'bits'];
const isEduPlace = (place) => {
    const t = (place.type || place.class || '').toLowerCase();
    const n = (place.display_name || '').toLowerCase();
    return EDU_KEYWORDS.some(k => t.includes(k) || n.includes(k));
};

const CreateRide = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        source: '', destination: '', date: '', time: '', availableSeats: 1, vehicleType: 'Car',
        sourceLat: null, sourceLng: null, destLat: null, destLng: null,
    });
    const [activeField, setActiveField]     = useState(null);
    const [error, setError]                 = useState('');
    const [submitting, setSubmitting]       = useState(false);
    const [markers, setMarkers]             = useState([]);
    const [estimate, setEstimate]           = useState(null);
    const [suggestions, setSuggestions]     = useState([]);
    const [focusedField, setFocusedField]   = useState(null); // which dropdown is open
    const [searchLoading, setSearchLoading] = useState(false);
    const [isVerified, setIsVerified]       = useState(null);
    const [verificationMessage, setVerificationMessage] = useState('');

    const debounceRef = useRef(null);

    // ── Verification ────────────────────────────────────────────────────────────
    useEffect(() => {
        getVerificationStatus().then(response => {
            const status   = response?.data?.verification?.status;
            const isDriver = response?.data?.isDriver;
            if (!isDriver) {
                setIsVerified(false);
                setVerificationMessage('You need to complete driver verification to offer rides.');
            } else if (['fully_verified', 'license_approved', 'vehicle_pending'].includes(status)) {
                setIsVerified(true);
            } else {
                setIsVerified(false);
                setVerificationMessage('Driver verification incomplete. Please finish the process.');
            }
        }).catch(() => { setIsVerified(false); setVerificationMessage('Unable to verify status.'); });
    }, []);

    // ── Fare estimate ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (formData.sourceLat && formData.destLat) {
            rideService.getRideEstimate({
                sourceLat: formData.sourceLat, sourceLng: formData.sourceLng,
                destLat: formData.destLat, destLng: formData.destLng,
                vehicleType: formData.vehicleType,
            }).then(setEstimate).catch(() => setEstimate(null));
        } else {
            setEstimate(null);
        }
    }, [formData.sourceLat, formData.sourceLng, formData.destLat, formData.destLng, formData.vehicleType]);

    // ── Debounced search as user types ──────────────────────────────────────────
    const handleInput = useCallback((e) => {
        const { name, value } = e.target;
        // Update text immediately, clear coords (user changed the field manually)
        setFormData(prev => ({
            ...prev, [name]: value,
            ...(name === 'source'      ? { sourceLat: null, sourceLng: null } : {}),
            ...(name === 'destination' ? { destLat: null,   destLng: null   } : {}),
        }));
        setError('');
        setFocusedField(name);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.length < 2) { setSuggestions([]); return; }

        setSearchLoading(true);
        debounceRef.current = setTimeout(async () => {
            const results = await searchLocation(value);
            setSuggestions(results);
            setSearchLoading(false);
        }, 280);
    }, []);

    // ── Pick suggestion ─────────────────────────────────────────────────────────
    const pickSuggestion = useCallback((place, field) => {
        const lat  = parseFloat(place.lat);
        const lng  = parseFloat(place.lon);
        // Show first 2 parts of display name (readable, not full address string)
        const name = place.display_name.split(',').slice(0, 2).join(', ');

        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: name, type: 'location' }]);

        setFormData(prev => ({
            ...prev, [field]: name,
            ...(field === 'source'      ? { sourceLat: lat, sourceLng: lng } : {}),
            ...(field === 'destination' ? { destLat: lat,   destLng: lng   } : {}),
        }));

        setSuggestions([]);
        setFocusedField(null);
    }, []);

    // ── Map click → reverse geocode → get real name ─────────────────────────────
    const handleMapClick = useCallback(async (latlng) => {
        if (!activeField) return;
        const { lat, lng } = latlng;

        // Temporarily show coords while we look up the name
        const field = activeField;
        const tempName = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: tempName, type: 'location' }]);
        setFormData(prev => ({
            ...prev,
            [field]: 'Fetching location name…',
            ...(field === 'source'      ? { sourceLat: lat, sourceLng: lng } : {}),
            ...(field === 'destination' ? { destLat: lat,   destLng: lng   } : {}),
        }));

        // Reverse geocode
        const name = await reverseGeocode(lat, lng);
        const displayName = name || tempName;

        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: displayName, type: 'location' }]);
        setFormData(prev => ({
            ...prev,
            [field]: displayName,
        }));
    }, [activeField]);

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        let { sourceLat, sourceLng, destLat, destLng } = formData;

        if (!sourceLat && formData.source) {
            const c = await resolveCoordinates(formData.source);
            if (c) { sourceLat = c.lat; sourceLng = c.lng; }
        }
        if (!destLat && formData.destination) {
            const c = await resolveCoordinates(formData.destination);
            if (c) { destLat = c.lat; destLng = c.lng; }
        }

        if (!formData.source)      { setError('Please enter a starting location.');     setSubmitting(false); return; }
        if (!formData.destination) { setError('Please enter a destination.');            setSubmitting(false); return; }
        if (!sourceLat) { setError(`⚠️ "${formData.source}" not found. Pick from the dropdown or tap the map.`);      setSubmitting(false); return; }
        if (!destLat)   { setError(`⚠️ "${formData.destination}" not found. Pick from the dropdown or tap the map.`); setSubmitting(false); return; }

        try {
            await rideService.createRide({ ...formData, availableSeats: Number(formData.availableSeats), sourceLat, sourceLng, destLat, destLng });
            navigate('/search-ride');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ride.');
        } finally {
            setSubmitting(false);
        }
    };

    const mapCenter = formData.sourceLat ? [formData.sourceLat, formData.sourceLng] : [17.385, 78.4867];

    // ── Suggestion list renderer ────────────────────────────────────────────────
    const SuggestionList = ({ field }) => {
        if (focusedField !== field) return null;
        return (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden max-h-72 overflow-y-auto">
                {searchLoading && (
                    <div className="flex items-center gap-3 px-4 py-3 text-gray-400 text-sm">
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        Searching places…
                    </div>
                )}
                {!searchLoading && suggestions.length === 0 && formData[field].length >= 2 && (
                    <div className="px-4 py-3 text-gray-400 text-sm">
                        No results. Try a different name or click the map.
                    </div>
                )}
                {suggestions.map((place, i) => {
                    const edu = isEduPlace(place);
                    const title = place.display_name.split(',')[0];
                    const sub   = place.display_name.split(',').slice(1, 3).join(', ');
                    return (
                        <div key={place.place_id || i}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${edu ? 'hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                            onMouseDown={(ev) => { ev.preventDefault(); pickSuggestion(place, field); }}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${edu ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                {edu ? '🎓' : '📍'}
                            </div>
                            <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate ${edu ? 'text-indigo-700' : 'text-gray-900'}`}>{title}</p>
                                {edu && <span className="inline-block text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full mb-0.5">University / College</span>}
                                <p className="text-xs text-gray-400 truncate">{sub}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────
    return (
        <div className="relative min-h-screen overflow-hidden">
            <MapBackground
                center={mapCenter}
                markers={markers}
                routeGeometry={estimate?.geometry}
                onMapClick={handleMapClick}
                className="fixed top-0 left-0 w-full h-full z-0"
            />

            <div className="relative z-10 flex flex-col min-h-screen pointer-events-none">
                <Navbar />

                {isVerified === null && (
                    <div className="flex-grow flex items-center justify-center">
                        <div className="bg-white/95 p-8 rounded-3xl shadow-2xl pointer-events-auto text-center">
                            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Checking verification…</p>
                        </div>
                    </div>
                )}

                {isVerified === false && (
                    <div className="flex-grow flex items-center justify-center p-4">
                        <div className="bg-white/95 p-8 rounded-3xl shadow-2xl pointer-events-auto max-w-sm w-full text-center">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Required</h2>
                            <p className="text-gray-400 mb-6 text-sm">{verificationMessage}</p>
                            <button onClick={() => navigate('/driver-verification')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mb-2 hover:bg-indigo-700">Complete Verification</button>
                            <button onClick={() => navigate('/dashboard')} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200">Back to Dashboard</button>
                        </div>
                    </div>
                )}

                {isVerified === true && (
                    <div className="flex-grow flex flex-col justify-end pointer-events-none">
                        {/* Floating hint */}
                        {!formData.sourceLat && !formData.destLat && (
                            <div className="flex justify-center mb-4">
                                <div className="bg-black/60 backdrop-blur text-white px-5 py-2 rounded-full text-sm font-medium pointer-events-none animate-pulse">
                                    🗺️ Tap map to place pin, or search below
                                </div>
                            </div>
                        )}

                        {/* Route badge */}
                        {estimate && (
                            <div className="flex justify-center mb-3">
                                <div className="bg-indigo-700 text-white px-5 py-2 rounded-full shadow-xl text-sm font-semibold flex items-center gap-3 pointer-events-none">
                                    <span>📍 {estimate.distanceKm} km</span>
                                    <span>⏱ ~{estimate.durationMin} min</span>
                                    <span>💰 ₹{estimate.riderCost} fare · ₹{estimate.driverEarnings} yours</span>
                                </div>
                            </div>
                        )}

                        {/* Bottom sheet */}
                        <div className="pointer-events-auto bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 px-5 pt-4 pb-safe-or-6 w-full max-w-2xl mx-auto">
                            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-0.5">Post a Ride</h2>
                            <p className="text-xs text-green-500 font-semibold flex items-center gap-1 mb-4">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Live GPS &amp; Distance Tracking Active
                            </p>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
                                    <span>⚠️</span><span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-3">
                                {/* FROM */}
                                <div className="relative" onFocus={() => setActiveField('source')}>
                                    <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 bg-white transition-all ${focusedField === 'source' ? 'border-indigo-500 shadow-md' : 'border-gray-200'}`}>
                                        <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                                        <input
                                            type="text"
                                            name="source"
                                            value={formData.source}
                                            onChange={handleInput}
                                            onFocus={() => { setFocusedField('source'); setActiveField('source'); }}
                                            onBlur={() => setTimeout(() => setFocusedField(f => f === 'source' ? null : f), 150)}
                                            placeholder="From — type college name, area or pin on map"
                                            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                                            autoComplete="off"
                                        />
                                        {formData.sourceLat && <span className="text-green-500 text-base">✓</span>}
                                    </div>
                                    <SuggestionList field="source" />
                                </div>

                                {/* TO */}
                                <div className="relative" onFocus={() => setActiveField('destination')}>
                                    <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 bg-white transition-all ${focusedField === 'destination' ? 'border-indigo-500 shadow-md' : 'border-gray-200'}`}>
                                        <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                                        <input
                                            type="text"
                                            name="destination"
                                            value={formData.destination}
                                            onChange={handleInput}
                                            onFocus={() => { setFocusedField('destination'); setActiveField('destination'); }}
                                            onBlur={() => setTimeout(() => setFocusedField(f => f === 'destination' ? null : f), 150)}
                                            placeholder="To — college, landmark or tap map"
                                            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                                            autoComplete="off"
                                        />
                                        {formData.destLat && <span className="text-green-500 text-base">✓</span>}
                                    </div>
                                    <SuggestionList field="destination" />
                                </div>

                                {/* Date / Time / Seats / Vehicle */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Date</label>
                                        <input type="date" min={new Date().toISOString().split('T')[0]}
                                            className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                            onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Time</label>
                                        <input type="time"
                                            className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                            onChange={e => setFormData(p => ({ ...p, time: e.target.value }))} required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Seats</label>
                                        <input type="number" min="1" max="6" defaultValue={1}
                                            className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                            onChange={e => setFormData(p => ({ ...p, availableSeats: e.target.value }))} required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Vehicle</label>
                                        <select className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm appearance-none"
                                            onChange={e => setFormData(p => ({ ...p, vehicleType: e.target.value }))}>
                                            <option value="Car">🚗 Car</option>
                                            <option value="Bike">🏍️ Bike</option>
                                            <option value="Auto">🛺 Auto</option>
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" disabled={submitting}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
                                    {submitting
                                        ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                                        : <><span>🚀</span> Confirm Ride</>
                                    }
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateRide;
