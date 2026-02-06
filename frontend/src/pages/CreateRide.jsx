import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import rideService from '../services/rideService';
import { searchLocation } from '../services/mapService';
import { getVerificationStatus } from '../services/driverVerificationService';
import Navbar from '../components/Navbar';
import MapBackground from '../components/MapBackground';

const CreateRide = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        source: '',
        destination: '',
        date: '',
        time: '',
        availableSeats: '',
        vehicleType: 'Car',
        sourceLat: null,
        sourceLng: null,
        destLat: null,
        destLng: null,
    });
    // ... existing UI state ...
    const [activeField, setActiveField] = useState(null); // 'source' or 'destination'
    const [error, setError] = useState('');
    const [markers, setMarkers] = useState([]);
    const [estimate, setEstimate] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(null); // 'source' or 'destination' or null

    // Driver verification state
    const [isVerified, setIsVerified] = useState(null); // null = loading, true = verified, false = not verified
    const [verificationMessage, setVerificationMessage] = useState('');

    // Check driver verification status on page load
    useEffect(() => {
        const checkVerification = async () => {
            try {
                const response = await getVerificationStatus();
                const status = response?.data?.verification?.status;
                const isDriver = response?.data?.isDriver;

                if (!isDriver) {
                    setIsVerified(false);
                    setVerificationMessage('You need to complete driver verification to offer rides.');
                } else if (status === 'fully_verified' || status === 'license_approved') {
                    setIsVerified(true);
                } else {
                    setIsVerified(false);
                    setVerificationMessage('Your driver verification is incomplete. Please complete the verification process.');
                }
            } catch (err) {
                console.error('Error checking verification:', err);
                setIsVerified(false);
                setVerificationMessage('Unable to verify driver status. Please try again.');
            }
        };

        checkVerification();
    }, []);

    // ... existing handleChange ...
    const handleChange = async (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Geocoding logic
        if (name === 'source' || name === 'destination') {
            setActiveField(name);
            setShowSuggestions(name);
            if (value.length > 2) {
                const results = await searchLocation(value);
                setSuggestions(results);
            } else {
                setSuggestions([]);
            }
        }
    };

    const handleSelectLocation = (location, type) => {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        const displayName = location.display_name.split(',')[0]; // Keep it short

        // Update markers
        const newMarkers = markers.filter(m => m.id !== type);
        newMarkers.push({ id: type, lat, lng, label: type === 'source' ? 'Start' : 'End' });
        setMarkers(newMarkers);

        // Update Form
        if (type === 'source') {
            setFormData(prev => ({
                ...prev,
                source: displayName,
                sourceLat: lat,
                sourceLng: lng
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                destination: displayName,
                destLat: lat,
                destLng: lng
            }));
        }

        setSuggestions([]);
        setShowSuggestions(null);
    };

    // ... existing useEffect ...
    React.useEffect(() => {
        const fetchEstimate = async () => {
            if (formData.sourceLat && formData.destLat) {
                try {
                    const data = await rideService.getRideEstimate({
                        sourceLat: formData.sourceLat,
                        sourceLng: formData.sourceLng,
                        destLat: formData.destLat,
                        destLng: formData.destLng,
                        vehicleType: formData.vehicleType || 'Car'
                    });
                    setEstimate(data);
                } catch (error) {
                    console.log("Error fetching estimate", error);
                    setEstimate(null); // Clear on error
                }
            } else {
                setEstimate(null); // Clear if points are removed
            }
        };
        fetchEstimate();
    }, [formData.sourceLat, formData.sourceLng, formData.destLat, formData.destLng, formData.vehicleType]);

    // ... existing handleMapClick ...
    const handleMapClick = (latlng) => {
        if (!activeField) return;

        const { lat, lng } = latlng;
        // Keep existing logic
        const newMarkers = markers.filter(m => m.id !== activeField);
        newMarkers.push({ id: activeField, lat, lng, label: activeField === 'source' ? 'Start' : 'End' });
        setMarkers(newMarkers);

        if (activeField === 'source') {
            setFormData(prev => ({
                ...prev,
                source: `Pin: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                sourceLat: lat,
                sourceLng: lng
            }));
        } else if (activeField === 'destination') {
            setFormData(prev => ({
                ...prev,
                destination: `Pin: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                destLat: lat,
                destLng: lng
            }));
        }
    };

    // ... existing handleSubmit ...
    const handleSubmit = async (e) => {
        e.preventDefault();

        let currentSourceLat = formData.sourceLat;
        let currentSourceLng = formData.sourceLng;
        let currentDestLat = formData.destLat;
        let currentDestLng = formData.destLng;

        // Auto-geocode if coordinates are missing but text exists
        if (!currentSourceLat && formData.source) {
            try {
                const results = await searchLocation(formData.source);
                if (results && results.length > 0) {
                    currentSourceLat = parseFloat(results[0].lat);
                    currentSourceLng = parseFloat(results[0].lon);
                }
            } catch (err) {
                console.error("Failed to geocode source", err);
            }
        }

        if (!currentDestLat && formData.destination) {
            try {
                const results = await searchLocation(formData.destination);
                if (results && results.length > 0) {
                    currentDestLat = parseFloat(results[0].lat);
                    currentDestLng = parseFloat(results[0].lon);
                }
            } catch (err) {
                console.error("Failed to geocode destination", err);
            }
        }

        // Validation: Ensure Map Points are selected
        if (!currentSourceLat || !currentDestLat) {
            setError("Could not find location coordinates. Please select from suggestions or click on map.");
            return;
        }

        try {
            const payload = {
                ...formData,
                availableSeats: Number(formData.availableSeats),
                sourceLat: currentSourceLat,
                sourceLng: currentSourceLng,
                destLat: currentDestLat,
                destLng: currentDestLng,
            };
            await rideService.createRide(payload);
            navigate('/search-ride');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ride');
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            <MapBackground
                center={formData.sourceLat && formData.sourceLng ? [formData.sourceLat, formData.sourceLng] : [28.5457, 77.2732]}
                markers={markers}
                routeGeometry={estimate?.geometry}
                onMapClick={handleMapClick}
                className="fixed top-0 left-0 w-full h-full -z-10"
            />

            <div className="relative z-10 flex flex-col h-screen pointer-events-none">
                <Navbar />

                {/* Verification Check - Loading */}
                {isVerified === null && (
                    <div className="flex-grow flex items-center justify-center p-4">
                        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl pointer-events-auto text-center">
                            <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600">Checking driver verification status...</p>
                        </div>
                    </div>
                )}

                {/* Verification Check - Not Verified */}
                {isVerified === false && (
                    <div className="flex-grow flex items-center justify-center p-4">
                        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl pointer-events-auto max-w-md text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Driver Verification Required</h2>
                            <p className="text-gray-600 mb-6">{verificationMessage}</p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/driver-verification')}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                                >
                                    🚗 Complete Verification
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-all"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ride Creation Form - Only show if verified */}
                {isVerified === true && (
                    <div className="flex-grow flex items-end md:items-center justify-center p-4">
                        <div className="w-full max-w-lg">
                            <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full border border-white/50 pointer-events-auto transform transition-all">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Post a Ride</h2>
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                        <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></span>
                                        Live GPS & Distance Tracking Active
                                    </p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-lg text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className={`relative transition-all p-1 rounded-xl ${activeField === 'source' ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">From</label>
                                            <input
                                                type="text"
                                                name="source"
                                                className="w-full bg-transparent p-2 border-b-2 border-gray-100 focus:border-primary-500 focus:outline-none text-gray-800 font-medium text-lg placeholder-gray-300"
                                                placeholder="Pick on map or type"
                                                value={formData.source}
                                                onChange={handleChange}
                                                onFocus={() => setActiveField('source')}
                                                required
                                            />
                                            <div className="absolute right-3 top-6 w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                                            {/* Suggestions Dropdown for Source */}
                                            {showSuggestions === 'source' && suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl z-50 mt-1 max-h-48 overflow-y-auto border border-gray-100">
                                                    {suggestions.map((place) => (
                                                        <div
                                                            key={place.place_id}
                                                            className="p-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                                                            onClick={() => handleSelectLocation(place, 'source')}
                                                        >
                                                            <p className="font-bold text-gray-800">{place.display_name.split(',')[0]}</p>
                                                            <p className="text-xs text-gray-500 truncate">{place.display_name}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`relative transition-all p-1 rounded-xl ${activeField === 'destination' ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">To</label>
                                            <input
                                                type="text"
                                                name="destination"
                                                className="w-full bg-transparent p-2 border-b-2 border-gray-100 focus:border-primary-500 focus:outline-none text-gray-800 font-medium text-lg placeholder-gray-300"
                                                placeholder="Pick on map or type"
                                                value={formData.destination}
                                                onChange={handleChange}
                                                onFocus={() => setActiveField('destination')}
                                                required
                                            />
                                            <div className="absolute right-3 top-6 w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                                            {/* Suggestions Dropdown for Destination */}
                                            {showSuggestions === 'destination' && suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl z-50 mt-1 max-h-48 overflow-y-auto border border-gray-100">
                                                    {suggestions.map((place) => (
                                                        <div
                                                            key={place.place_id}
                                                            className="p-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                                                            onClick={() => handleSelectLocation(place, 'destination')}
                                                        >
                                                            <p className="font-bold text-gray-800">{place.display_name.split(',')[0]}</p>
                                                            <p className="text-xs text-gray-500 truncate">{place.display_name}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</label>
                                            <input
                                                type="date"
                                                name="date"
                                                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none"
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time</label>
                                            <input
                                                type="time"
                                                name="time"
                                                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none"
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seats</label>
                                            <input
                                                type="number"
                                                name="availableSeats"
                                                min="1"
                                                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none"
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle</label>
                                            <select
                                                name="vehicleType"
                                                className="w-full mt-1 p-2 bg-gray-50 rounded-lg border-gray-200 focus:ring-1 focus:ring-primary-500 outline-none appearance-none"
                                                onChange={handleChange}
                                            >
                                                <option value="Car">Car</option>
                                                <option value="Bike">Bike</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Upfront Pricing Card */}
                                    {estimate && (
                                        <div className="bg-gradient-to-r from-gray-900 to-black text-white p-5 rounded-2xl shadow-xl border border-gray-800 transition-all transform scale-100 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold animate-pulse">Live Estimated Cost</p>
                                                    <h3 className="text-3xl font-bold text-white">₹{estimate.riderCost}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Your Earnings</p>
                                                    <h3 className="text-3xl font-bold text-green-400">₹{estimate.driverEarnings}</h3>
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500 border-t border-gray-800 pt-3">
                                                <span>Distance: {estimate.distanceKm} km</span>
                                                <span>Time: ~{estimate.durationMin} mins</span>
                                                <span className="text-gray-600 italic">({estimate.routingSource?.includes('OSRM') ? 'Exact Road Data' : 'Estimated'})</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold hover:bg-primary-700 shadow-xl transition transform hover:scale-[1.02] mt-2 text-lg"
                                    >
                                        Confirm Ride
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
