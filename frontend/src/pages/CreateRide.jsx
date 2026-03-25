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

// ── Steps: 1=from, 2=to, 3=details, 4=confirm ────────────────────────────────
const STEPS = ['From', 'To', 'Details', 'Confirm'];

const CreateRide = () => {
    const navigate = useNavigate();
    const [step, setStep]         = useState(1); // 1 = pick FROM, 2 = pick TO, 3 = details, 4 = confirm

    const [formData, setFormData] = useState({
        source: '', destination: '', date: '', time: '', availableSeats: 1, vehicleType: 'Car',
        sourceLat: null, sourceLng: null, destLat: null, destLng: null,
    });

    const [suggestions, setSuggestions]     = useState([]);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeInput, setActiveInput]     = useState('');  // 'source' or 'destination'

    const [markers, setMarkers]   = useState([]);
    const [estimate, setEstimate] = useState(null);
    const [error, setError]       = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [isVerified, setIsVerified] = useState(null);
    const [verificationMessage, setVerificationMessage] = useState('');

    const debounceRef = useRef(null);

    // ── Verification ────────────────────────────────────────────────────────────
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

    // ── Fetch estimate when route is complete ────────────────────────────────────
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

    // ── Text input → debounced suggestions ────────────────────────────────────
    const handleInput = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev, [field]: value,
            ...(field === 'source'      ? { sourceLat: null, sourceLng: null } : {}),
            ...(field === 'destination' ? { destLat: null, destLng: null }     : {}),
        }));
        setActiveInput(field);
        setSearchFocused(true);
        setError('');

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
    const pickSuggestion = useCallback((place) => {
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        const name = place.display_name.split(',').slice(0, 2).join(', ');
        const field = activeInput;

        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: name, type: 'location' }]);
        setFormData(prev => ({
            ...prev, [field]: name,
            ...(field === 'source'      ? { sourceLat: lat, sourceLng: lng } : {}),
            ...(field === 'destination' ? { destLat: lat,   destLng: lng   } : {}),
        }));
        setSuggestions([]);
        setSearchFocused(false);

        // Auto-advance step
        if (field === 'source' && !formData.destination)      setStep(2);
        if (field === 'destination' && formData.sourceLat)    setStep(3);
    }, [activeInput, formData.destination, formData.sourceLat]);

    // ── Map click → reverse geocode ────────────────────────────────────────────
    const handleMapClick = useCallback(async (latlng) => {
        if (step > 2) return; // Only allow pinning in steps 1-2
        const { lat, lng } = latlng;
        const field = step === 1 ? 'source' : 'destination';

        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: 'Fetching…', type: 'location' }]);
        setFormData(prev => ({
            ...prev,
            [field]: 'Fetching location name…',
            ...(field === 'source'      ? { sourceLat: lat, sourceLng: lng } : {}),
            ...(field === 'destination' ? { destLat: lat,   destLng: lng   } : {}),
        }));

        const name = await reverseGeocode(lat, lng) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setMarkers(prev => [...prev.filter(m => m.id !== field), { id: field, lat, lng, label: name, type: 'location' }]);
        setFormData(prev => ({ ...prev, [field]: name }));

        if (field === 'source' && !formData.destination) setStep(2);
        if (field === 'destination' && formData.sourceLat) setStep(3);
    }, [step, formData.destination, formData.sourceLat]);

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
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

        if (!formData.source)      { setError('Please set a starting location.'); setSubmitting(false); return; }
        if (!formData.destination) { setError('Please set a destination.');       setSubmitting(false); return; }
        if (!sourceLat) { setError(`"${formData.source}" not found on map. Pick from suggestions.`); setSubmitting(false); return; }
        if (!destLat)   { setError(`"${formData.destination}" not found on map. Pick from suggestions.`); setSubmitting(false); return; }
        if (!formData.date) { setError('Please select a date.');  setSubmitting(false); return; }
        if (!formData.time) { setError('Please select a time.');  setSubmitting(false); return; }

        try {
            await rideService.createRide({ ...formData, availableSeats: Number(formData.availableSeats), sourceLat, sourceLng, destLat, destLng });
            navigate('/search-ride');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ride.');
        } finally {
            setSubmitting(false);
        }
    };

    const mapCenter = formData.sourceLat
        ? [formData.sourceLat, formData.sourceLng]
        : [17.385, 78.4867];

    // ── Suggestion list ─────────────────────────────────────────────────────────
    const SuggestionsBox = () => {
        if (!searchFocused || suggestions.length === 0) return null;
        return (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden max-h-64 overflow-y-auto">
                {suggestions.map((place, i) => {
                    const edu = isEdu(place);
                    return (
                        <div key={place.place_id || i}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 ${edu ? 'hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                            onMouseDown={(e) => { e.preventDefault(); pickSuggestion(place); }}>
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
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
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

                {/* Loading */}
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
                            <p className="text-gray-400 mb-6 text-sm">{verificationMessage}</p>
                            <button onClick={() => navigate('/driver-verification')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mb-2 hover:bg-indigo-700">Complete Verification</button>
                            <button onClick={() => navigate('/dashboard')} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200">Back to Dashboard</button>
                        </div>
                    </div>
                )}

                {/* Main driver panel */}
                {isVerified === true && (
                    <div className="flex-grow flex flex-col justify-end pointer-events-none">

                        {/* Map instruction hint */}
                        {step <= 2 && (
                            <div className="flex justify-center mb-4 pointer-events-none">
                                <div className="bg-black/70 backdrop-blur text-white px-5 py-2.5 rounded-full text-sm font-semibold animate-pulse">
                                    {step === 1 ? '🟢 Tap map or search your starting point' : '🔴 Tap map or search your destination'}
                                </div>
                            </div>
                        )}

                        {/* Route distance badge */}
                        {estimate && (
                            <div className="flex justify-center mb-3 pointer-events-none">
                                <div className="bg-indigo-700 text-white px-5 py-2.5 rounded-full shadow-xl text-sm font-semibold flex items-center gap-3">
                                    <span>📍 {estimate.distanceKm} km</span>
                                    <span>⏱ ~{estimate.durationMin} min</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full">💰 ₹{estimate.riderCost} suggested fare</span>
                                </div>
                            </div>
                        )}

                        {/* Bottom sheet */}
                        <div className="pointer-events-auto bg-white rounded-t-3xl shadow-2xl w-full max-w-2xl mx-auto">
                            {/* Drag handle */}
                            <div className="pt-3 pb-1 flex justify-center">
                                <div className="w-10 h-1 bg-gray-200 rounded-full" />
                            </div>

                            {/* Step indicator */}
                            <div className="px-5 pb-1">
                                <div className="flex items-center gap-1 mb-2">
                                    {STEPS.map((label, i) => (
                                        <React.Fragment key={label}>
                                            <div className={`flex items-center gap-1 cursor-pointer ${i + 1 <= step ? 'opacity-100' : 'opacity-30'}`}
                                                onClick={() => i + 1 < step && setStep(i + 1)}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 === step ? 'bg-black text-white' : i + 1 < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                    {i + 1 < step ? '✓' : i + 1}
                                                </div>
                                                <span className={`text-xs ${i + 1 === step ? 'font-bold text-gray-900' : 'text-gray-400'}`}>{label}</span>
                                            </div>
                                            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded ${i + 1 < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            <div className="px-5 pb-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-1">
                                    {step === 1 ? '🟢 Set pickup location' : step === 2 ? '🔴 Set drop location' : step === 3 ? '📋 Ride details' : '✅ Confirm Ride'}
                                </h2>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-3 flex items-start gap-2">
                                        <span>⚠️</span><span>{error}</span>
                                    </div>
                                )}

                                {/* Step 1: FROM */}
                                {step === 1 && (
                                    <div className="relative">
                                        <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 bg-white ${searchFocused && activeInput === 'source' ? 'border-indigo-500 shadow-md' : 'border-gray-200'}`}>
                                            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={formData.source}
                                                onChange={(e) => handleInput('source', e.target.value)}
                                                onFocus={() => { setSearchFocused(true); setActiveInput('source'); }}
                                                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                                                placeholder="Type pickup — college, area, or tap map"
                                                className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                                                autoComplete="off"
                                                autoFocus
                                            />
                                            {searchLoading && activeInput === 'source' && <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                                            {formData.sourceLat && <span className="text-green-500">✓</span>}
                                        </div>
                                        {activeInput === 'source' && <SuggestionsBox />}
                                        <button onClick={() => { if (formData.source) setStep(2); }}
                                            disabled={!formData.source}
                                            className="mt-3 w-full bg-black text-white py-3 rounded-2xl font-bold disabled:opacity-40 hover:bg-gray-800 transition">
                                            Next: Set Destination →
                                        </button>
                                    </div>
                                )}

                                {/* Step 2: TO */}
                                {step === 2 && (
                                    <div className="relative">
                                        <div className="flex items-center gap-3 border-2 border-gray-100 rounded-2xl px-4 py-2.5 bg-gray-50 mb-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                                            <p className="text-sm text-gray-500 truncate">{formData.source}</p>
                                            <button onClick={() => setStep(1)} className="ml-auto text-xs text-indigo-600 font-semibold">Edit</button>
                                        </div>
                                        <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 bg-white ${searchFocused && activeInput === 'destination' ? 'border-indigo-500 shadow-md' : 'border-gray-200'}`}>
                                            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={formData.destination}
                                                onChange={(e) => handleInput('destination', e.target.value)}
                                                onFocus={() => { setSearchFocused(true); setActiveInput('destination'); }}
                                                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                                                placeholder="Type destination — college, area, or tap map"
                                                className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                                                autoComplete="off"
                                                autoFocus
                                            />
                                            {searchLoading && activeInput === 'destination' && <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                                            {formData.destLat && <span className="text-green-500">✓</span>}
                                        </div>
                                        {activeInput === 'destination' && <SuggestionsBox />}
                                        <button onClick={() => { if (formData.destination) setStep(3); }}
                                            disabled={!formData.destination}
                                            className="mt-3 w-full bg-black text-white py-3 rounded-2xl font-bold disabled:opacity-40 hover:bg-gray-800 transition">
                                            Next: Ride Details →
                                        </button>
                                    </div>
                                )}

                                {/* Step 3: Details */}
                                {step === 3 && (
                                    <div>
                                        <div className="flex items-center gap-3 border border-gray-100 rounded-2xl px-4 py-2.5 bg-gray-50 mb-3">
                                            <span className="text-sm">🟢 {formData.source}</span>
                                            <span className="text-gray-300">→</span>
                                            <span className="text-sm">🔴 {formData.destination}</span>
                                            <button onClick={() => setStep(1)} className="ml-auto text-xs text-indigo-600 font-semibold">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Date</label>
                                                <input type="date" min={new Date().toISOString().split('T')[0]}
                                                    value={formData.date}
                                                    className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Time</label>
                                                <input type="time" value={formData.time}
                                                    className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                                    onChange={e => setFormData(p => ({ ...p, time: e.target.value }))} required />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Seats</label>
                                                <input type="number" min="1" max="6" value={formData.availableSeats}
                                                    className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                                                    onChange={e => setFormData(p => ({ ...p, availableSeats: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Vehicle</label>
                                                <select value={formData.vehicleType}
                                                    className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm appearance-none"
                                                    onChange={e => setFormData(p => ({ ...p, vehicleType: e.target.value }))}>
                                                    <option value="Car">🚗 Car</option>
                                                    <option value="Bike">🏍️ Bike</option>
                                                    <option value="Auto">🛺 Auto</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button onClick={() => { if (formData.date && formData.time) setStep(4); else setError('Please fill in date and time.'); }}
                                            className="w-full bg-black text-white py-3 rounded-2xl font-bold hover:bg-gray-800 transition">
                                            Preview Ride →
                                        </button>
                                    </div>
                                )}

                                {/* Step 4: Confirm */}
                                {step === 4 && (
                                    <div>
                                        <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-start gap-2">
                                                    <div className="flex flex-col items-center mt-1 gap-1">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                                        <span className="w-0.5 h-6 bg-gray-300" />
                                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                                    </div>
                                                    <div className="ml-1">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{formData.source}</p>
                                                        <p className="text-sm font-bold text-gray-900 mt-3 truncate">{formData.destination}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setStep(1)} className="text-xs text-indigo-600 font-semibold">Edit</button>
                                            </div>
                                            <div className="border-t border-gray-200 pt-3 grid grid-cols-3 text-center gap-2">
                                                <div>
                                                    <p className="text-xs text-gray-400">Date</p>
                                                    <p className="text-sm font-bold">{formData.date}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Time</p>
                                                    <p className="text-sm font-bold">{formData.time}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Seats</p>
                                                    <p className="text-sm font-bold">{formData.availableSeats}</p>
                                                </div>
                                            </div>
                                            {estimate && (
                                                <div className="border-t border-gray-200 pt-3 flex justify-between">
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-400">Distance</p>
                                                        <p className="text-sm font-bold text-gray-900">{estimate.distanceKm} km</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-400">Duration</p>
                                                        <p className="text-sm font-bold text-gray-900">~{estimate.durationMin} min</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-400">Suggested Fare</p>
                                                        <p className="text-sm font-bold text-green-600">₹{estimate.riderCost}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-400">You Earn</p>
                                                        <p className="text-sm font-bold text-indigo-600">₹{estimate.driverEarnings}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={handleSubmit} disabled={submitting}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2">
                                            {submitting
                                                ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing Ride…</>
                                                : <><span>🚀</span> Publish Ride</>
                                            }
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateRide;
