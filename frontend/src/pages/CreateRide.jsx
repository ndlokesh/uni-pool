import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import rideService from '../services/rideService';
import { searchLocation, resolveCoordinates, reverseGeocode } from '../services/mapService';
import { getVerificationStatus } from '../services/driverVerificationService';
import Navbar from '../components/Navbar';
import MapBackground from '../components/MapBackground';

const EDU_KWORDS = ['university', 'college', 'institute', 'school', 'campus', 'iit', 'nit', 'bits'];
const isEdu = (place) => {
    const t = (place.type || '').toLowerCase();
    const n = (place.display_name || '').toLowerCase();
    return EDU_KWORDS.some(k => t.includes(k) || n.includes(k));
};

const CreateRide = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        source: '', destination: '',
        date: '', time: '',
        availableSeats: 1, vehicleType: 'Car',
        sourceLat: null, sourceLng: null,
        destLat: null, destLng: null,
    });

    const [activeField, setActiveField]       = useState(null);   // 'source' | 'destination'
    const [focusedField, setFocusedField]     = useState(null);   // controls which dropdown shows
    const [suggestions, setSuggestions]       = useState([]);
    const [searchLoading, setSearchLoading]   = useState(false);
    const [markers, setMarkers]               = useState([]);
    const [estimate, setEstimate]             = useState(null);
    const [error, setError]                   = useState('');
    const [submitting, setSubmitting]         = useState(false);
    const [isVerified, setIsVerified]         = useState(null);
    const [verificationMessage, setVerificationMessage] = useState('');

    const debounceRef = useRef(null);

    // ── Verification check ─────────────────────────────────────────────────────
    useEffect(() => {
        getVerificationStatus().then(res => {
            const status   = res?.data?.verification?.status;
            const isDriver = res?.data?.isDriver;
            if (!isDriver) {
                setIsVerified(false);
                setVerificationMessage('You need to complete driver verification to offer rides.');
            } else if (['fully_verified', 'license_approved', 'vehicle_pending'].includes(status)) {
                setIsVerified(true);
            } else {
                setIsVerified(false);
                setVerificationMessage('Complete driver verification to post rides.');
            }
        }).catch(() => { setIsVerified(false); setVerificationMessage('Could not verify driver status.'); });
    }, []);

    // ── Fare estimate ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (formData.sourceLat && formData.destLat) {
            rideService.getRideEstimate({
                sourceLat: formData.sourceLat, sourceLng: formData.sourceLng,
                destLat: formData.destLat,     destLng: formData.destLng,
                vehicleType: formData.vehicleType,
            }).then(setEstimate).catch(() => setEstimate(null));
        } else {
            setEstimate(null);
        }
    }, [formData.sourceLat, formData.sourceLng, formData.destLat, formData.destLng, formData.vehicleType]);

    // ── Debounced location search ──────────────────────────────────────────────
    const handleInput = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev, [name]: value,
            ...(name === 'source'      ? { sourceLat: null, sourceLng: null } : {}),
            ...(name === 'destination' ? { destLat: null,   destLng: null }   : {}),
        }));
        setError('');
        setFocusedField(name);
        setActiveField(name);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.length < 2) { setSuggestions([]); return; }

        setSearchLoading(true);
        debounceRef.current = setTimeout(async () => {
            const results = await searchLocation(value);
            setSuggestions(results);
            setSearchLoading(false);
        }, 280);
    }, []);

    // ── Pick suggestion ────────────────────────────────────────────────────────
    const pickSuggestion = useCallback((place, field) => {
        const lat  = parseFloat(place.lat);
        const lng  = parseFloat(place.lon);
        const name = place.short_name || place.display_name.split(',')[0];

        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: name, type: 'location' }]);
        setFormData(prev => ({
            ...prev, [field]: name,
            ...(field === 'source'      ? { sourceLat: lat, sourceLng: lng } : {}),
            ...(field === 'destination' ? { destLat: lat,   destLng: lng }   : {}),
        }));
        setSuggestions([]);
        setFocusedField(null);
    }, []);

    // ── Map click → reverse geocode ────────────────────────────────────────────
    const handleMapClick = useCallback(async (latlng) => {
        if (!activeField) return;
        const { lat, lng } = latlng;
        const field = activeField;

        setFormData(prev => ({
            ...prev, [field]: 'Locating address…',
            ...(field === 'source'      ? { sourceLat: lat, sourceLng: lng } : {}),
            ...(field === 'destination' ? { destLat: lat,   destLng: lng }   : {}),
        }));
        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: 'Locating…', type: 'location' }]);

        const name = await reverseGeocode(lat, lng);
        setFormData(prev => ({ ...prev, [field]: name }));
        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: name, type: 'location' }]);
    }, [activeField]);

    // ── Submit ─────────────────────────────────────────────────────────────────
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

        if (!formData.source)      { setError('Please enter a starting location.');  setSubmitting(false); return; }
        if (!formData.destination) { setError('Please enter a destination.');         setSubmitting(false); return; }
        if (!sourceLat) { setError(`"${formData.source}" not found. Pick from suggestions or tap the map.`);      setSubmitting(false); return; }
        if (!destLat)   { setError(`"${formData.destination}" not found. Pick from suggestions or tap the map.`); setSubmitting(false); return; }

        try {
            await rideService.createRide({ ...formData, availableSeats: Number(formData.availableSeats), sourceLat, sourceLng, destLat, destLng });
            navigate('/search-ride');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ride.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Suggestion dropdown ────────────────────────────────────────────────────
    const SuggestionList = ({ field }) => {
        if (focusedField !== field) return null;
        return (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden max-h-64 overflow-y-auto">
                {searchLoading && (
                    <div className="flex items-center gap-3 px-4 py-3 text-gray-400 text-sm">
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        Searching…
                    </div>
                )}
                {!searchLoading && suggestions.length === 0 && formData[field].length >= 2 && (
                    <div className="px-4 py-3 text-gray-400 text-sm">No results. Try another name or tap the map.</div>
                )}
                {suggestions.map((place, i) => {
                    const edu = isEdu(place);
                    return (
                        <div key={place.place_id || i}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${edu ? 'hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                            onMouseDown={(e) => { e.preventDefault(); pickSuggestion(place, field); }}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base mt-0.5 ${edu ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                {edu ? '🎓' : '📍'}
                            </div>
                            <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate ${edu ? 'text-indigo-700' : 'text-gray-900'}`}>
                                    {place.short_name || place.display_name.split(',')[0]}
                                </p>
                                {edu && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">University / College</span>}
                                <p className="text-xs text-gray-400 truncate">{place.display_name.split(',').slice(1, 3).join(', ')}</p>
                            </div>
                            {formData[field] === (place.short_name || place.display_name.split(',')[0]) &&
                                <span className="text-green-500 ml-auto">✓</span>}
                        </div>
                    );
                })}
            </div>
        );
    };

    const mapCenter = formData.sourceLat
        ? [formData.sourceLat, formData.sourceLng]
        : [17.385, 78.4867];

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Full-screen map */}
            <MapBackground
                center={mapCenter}
                markers={markers}
                routeGeometry={estimate?.geometry}
                onMapClick={handleMapClick}
                className="fixed top-0 left-0 w-full h-full z-0"
            />

            <div className="relative z-10 flex flex-col min-h-screen pointer-events-none">
                <Navbar />

                {/* Verification loading */}
                {isVerified === null && (
                    <div className="flex-grow flex items-center justify-center">
                        <div className="bg-white/95 p-8 rounded-3xl shadow-2xl pointer-events-auto text-center">
                            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Checking verification…</p>
                        </div>
                    </div>
                )}

                {/* Not verified */}
                {isVerified === false && (
                    <div className="flex-grow flex items-center justify-center p-4">
                        <div className="bg-white/95 p-8 rounded-3xl shadow-2xl pointer-events-auto max-w-sm w-full text-center">
                            <div className="text-4xl mb-4">⚠️</div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Required</h2>
                            <p className="text-gray-500 mb-6 text-sm">{verificationMessage}</p>
                            <button onClick={() => navigate('/driver-verification')}
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mb-2 hover:bg-indigo-700 transition">
                                Complete Verification
                            </button>
                            <button onClick={() => navigate('/dashboard')}
                                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition">
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* Main panel */}
                {isVerified === true && (
                    <div className="flex-grow flex flex-col justify-end pointer-events-none">

                        {/* Floating hint when no location set */}
                        {!formData.sourceLat && !formData.destLat && (
                            <div className="flex justify-center mb-4 pointer-events-none">
                                <div className="bg-black/65 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-medium animate-pulse">
                                    🗺️ Tap map to place pin, or search below
                                </div>
                            </div>
                        )}

                        {/* Route estimate badge */}
                        {estimate && (
                            <div className="flex justify-center mb-3 pointer-events-none">
                                <div className="bg-indigo-700 text-white px-5 py-2.5 rounded-full shadow-xl text-sm font-semibold flex items-center gap-3">
                                    <span>📍 {estimate.distanceKm} km</span>
                                    <span>⏱ ~{estimate.durationMin} min</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full">💰 ₹{estimate.riderCost}</span>
                                    <span className="bg-green-400/30 px-2 py-0.5 rounded-full">You earn ₹{estimate.driverEarnings}</span>
                                </div>
                            </div>
                        )}

                        {/* Bottom sheet — same simple style as before */}
                        <div className="pointer-events-auto bg-white rounded-t-3xl shadow-2xl w-full max-w-2xl mx-auto">
                            {/* Drag handle */}
                            <div className="pt-3 pb-2 flex justify-center">
                                <div className="w-10 h-1 bg-gray-200 rounded-full" />
                            </div>

                            <div className="px-5 pb-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-0.5">Post a Ride</h2>
                                <p className="text-xs text-green-500 font-semibold flex items-center gap-1.5 mb-4">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                                    Live GPS &amp; Distance Tracking Active
                                </p>

                                {error && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4 flex items-start gap-2">
                                        <span className="text-base mt-0.5">⚠️</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-3">

                                    {/* FROM */}
                                    <div className="relative"
                                        onFocus={() => { setFocusedField('source'); setActiveField('source'); }}>
                                        <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 bg-white transition-all ${focusedField === 'source' ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-gray-200'}`}>
                                            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                                            <input
                                                type="text"
                                                name="source"
                                                value={formData.source}
                                                onChange={handleInput}
                                                onFocus={() => { setFocusedField('source'); setActiveField('source'); }}
                                                onBlur={() => setTimeout(() => setFocusedField(f => f === 'source' ? null : f), 150)}
                                                placeholder="From — pick on map or type college name"
                                                className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                                                autoComplete="off"
                                            />
                                            {searchLoading && focusedField === 'source'
                                                ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                                : formData.sourceLat
                                                    ? <span className="text-green-500 font-bold">✓</span>
                                                    : null
                                            }
                                        </div>
                                        <SuggestionList field="source" />
                                    </div>

                                    {/* TO */}
                                    <div className="relative"
                                        onFocus={() => { setFocusedField('destination'); setActiveField('destination'); }}>
                                        <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 bg-white transition-all ${focusedField === 'destination' ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-gray-200'}`}>
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
                                            {searchLoading && focusedField === 'destination'
                                                ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                                : formData.destLat
                                                    ? <span className="text-green-500 font-bold">✓</span>
                                                    : null
                                            }
                                        </div>
                                        <SuggestionList field="destination" />
                                    </div>

                                    {/* Date / Time / Seats / Vehicle */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">DATE</label>
                                            <input
                                                type="date"
                                                min={new Date().toISOString().split('T')[0]}
                                                value={formData.date}
                                                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                                className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">TIME</label>
                                            <input
                                                type="time"
                                                value={formData.time}
                                                onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                                                className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">SEATS</label>
                                            <input
                                                type="number"
                                                min="1" max="6"
                                                value={formData.availableSeats}
                                                onChange={e => setFormData(p => ({ ...p, availableSeats: e.target.value }))}
                                                className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">VEHICLE</label>
                                            <select
                                                value={formData.vehicleType}
                                                onChange={e => setFormData(p => ({ ...p, vehicleType: e.target.value }))}
                                                className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm appearance-none"
                                            >
                                                <option value="Car">🚗 Car</option>
                                                <option value="Bike">🏍️ Bike</option>
                                                <option value="Auto">🛺 Auto</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Submit button */}
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
                                    >
                                        {submitting
                                            ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing…</>
                                            : <><span>🚀</span> Confirm Ride</>
                                        }
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateRide;
