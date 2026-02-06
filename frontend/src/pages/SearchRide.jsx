import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import rideService from '../services/rideService';
import { searchLocation } from '../services/mapService';
import authService from '../services/authService';
import Navbar from '../components/Navbar';
import MapBackground from '../components/MapBackground';

const SearchRide = () => {
    const [rides, setRides] = useState([]);
    const [filteredRides, setFilteredRides] = useState([]);
    const [filter, setFilter] = useState({ source: '', destination: '' });
    const currentUser = authService.getCurrentUser();
    const [mapCenter, setMapCenter] = useState([28.5457, 77.2732]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(null); // 'source' or 'destination' or null

    // Booking Modal States
    const [selectedRide, setSelectedRide] = useState(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        const fetchRides = async () => {
            try {
                // Fetch only active (future/available) rides
                const data = await rideService.getRides({ active: true });
                setRides(data);
                setFilteredRides(data);
            } catch (err) {
                console.error('Failed to fetch rides');
            }
        };
        fetchRides();
    }, []);

    const handleFilterChange = async (e) => {
        const { name, value } = e.target;
        setFilter({ ...filter, [name]: value });

        setShowSuggestions(name);
        if (value.length > 2) {
            const results = await searchLocation(value);
            setSuggestions(results);
        } else {
            setSuggestions([]);
        }

        const nextFilter = { ...filter, [name]: value };
        const filtered = rides.filter(ride =>
            ride.source.toLowerCase().includes(nextFilter.source.toLowerCase()) &&
            ride.destination.toLowerCase().includes(nextFilter.destination.toLowerCase())
        );
        setFilteredRides(filtered);
    };

    const handleSelectSuggestion = (suggestion, type) => {
        const displayName = suggestion.display_name.split(',')[0];
        setFilter(prev => {
            const newFilter = { ...prev, [type]: displayName };
            const filtered = rides.filter(ride =>
                ride.source.toLowerCase().includes(newFilter.source.toLowerCase()) &&
                ride.destination.toLowerCase().includes(newFilter.destination.toLowerCase())
            );
            setFilteredRides(filtered);
            return newFilter;
        });

        if (suggestion.lat && suggestion.lon) {
            setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
        }

        setSuggestions([]);
        setShowSuggestions(null);
    };

    // Open Modal
    const handleJoinClick = (ride) => {
        setSelectedRide(ride);
        setBookingSuccess(false);
    };

    // Confirm Booking API Call
    const confirmBooking = async () => {
        if (!selectedRide) return;
        setIsBooking(true);
        try {
            await rideService.joinRide(selectedRide._id);
            setBookingSuccess(true);

            // Fire Confetti!
            const count = 200;
            const defaults = {
                origin: { y: 0.7 }
            };

            function fire(particleRatio, opts) {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            }

            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
            // Refresh rides in background
            const data = await rideService.getRides({ active: true });
            setRides(data);
            setFilteredRides(data);

            // Close modal after delay
            setTimeout(() => {
                setSelectedRide(null);
                setIsBooking(false);
                setBookingSuccess(false);
            }, 2000);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to join ride');
            setIsBooking(false);
        }
    };

    const markers = filteredRides
        .filter(r => r.sourceLat && r.sourceLng)
        .map(r => ({
            lat: r.sourceLat,
            lng: r.sourceLng,
            label: `Ride from ${r.source}`,
            id: r._id
        }));

    return (
        <div className="relative min-h-screen overflow-hidden">
            <MapBackground
                center={mapCenter}
                markers={markers}
                className="fixed top-0 left-0 w-full h-full -z-10"
            />

            <div className="relative z-10 flex flex-col h-screen pointer-events-none">
                <Navbar />

                <div className="flex-grow flex flex-col md:flex-row pointer-events-none overflow-hidden">
                    {/* Floating Panel */}
                    <div className="w-full md:w-[450px] md:ml-6 md:mb-6 flex flex-col pointer-events-auto h-full md:h-auto">
                        <div className="bg-white/95 backdrop-blur-md h-full md:h-[calc(100vh-100px)] rounded-3xl shadow-2xl border border-white/50 flex flex-col overflow-hidden">

                            {/* Search Header */}
                            <div className="p-6 border-b border-gray-100 bg-white/50">
                                <h2 className="text-2xl font-bold text-gray-800 mb-1">Find a Ride</h2>
                                <p className="text-xs text-green-600 font-bold mb-4 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span> Live Map Active
                                </p>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 w-2 h-2 rounded-full bg-blue-500"></div>
                                        <input
                                            type="text"
                                            name="source"
                                            placeholder="From"
                                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-black/5 text-sm font-medium"
                                            value={filter.source}
                                            onChange={handleFilterChange}
                                            onFocus={() => setShowSuggestions('source')}
                                        />
                                        {/* Suggestions */}
                                        {showSuggestions === 'source' && suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white rounded-lg shadow-xl z-50 mt-1 max-h-40 overflow-y-auto border border-gray-100">
                                                {suggestions.map((place) => (
                                                    <div
                                                        key={place.place_id}
                                                        className="p-2 hover:bg-gray-50 cursor-pointer text-xs text-gray-700 border-b border-gray-50 last:border-0"
                                                        onClick={() => handleSelectSuggestion(place, 'source')}
                                                    >
                                                        <p className="font-bold text-gray-800">{place.display_name.split(',')[0]}</p>
                                                        <p className="truncate text-[10px] text-gray-500">{place.display_name}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 w-2 h-2 rounded-full bg-green-500"></div>
                                        <input
                                            type="text"
                                            name="destination"
                                            placeholder="To"
                                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-black/5 text-sm font-medium"
                                            value={filter.destination}
                                            onChange={handleFilterChange}
                                            onFocus={() => setShowSuggestions('destination')}
                                        />
                                        {/* Suggestions */}
                                        {showSuggestions === 'destination' && suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white rounded-lg shadow-xl z-50 mt-1 max-h-40 overflow-y-auto border border-gray-100">
                                                {suggestions.map((place) => (
                                                    <div
                                                        key={place.place_id}
                                                        className="p-2 hover:bg-gray-50 cursor-pointer text-xs text-gray-700 border-b border-gray-50 last:border-0"
                                                        onClick={() => handleSelectSuggestion(place, 'destination')}
                                                    >
                                                        <p className="font-bold text-gray-800">{place.display_name.split(',')[0]}</p>
                                                        <p className="truncate text-[10px] text-gray-500">{place.display_name}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                                {filteredRides.length > 0 ? (
                                    filteredRides.map((ride) => (
                                        <div key={ride._id}
                                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group"
                                            onClick={() => {
                                                if (ride.sourceLat) setMapCenter([ride.sourceLat, ride.sourceLng]);
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{ride.source}</h3>
                                                    <div className="h-4 border-l-2 border-dashed border-gray-300 ml-1 my-1"></div>
                                                    <h3 className="font-bold text-gray-900">{ride.destination}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-gray-900">{ride.time}</span>
                                                    <p className="text-xs text-gray-400">{new Date(ride.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex flex-col gap-2 mt-4 w-full">
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <div className={`p-2 rounded-full ${ride.vehicleType === 'Car' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                            <span className="text-xl">
                                                                {ride.vehicleType === 'Car' ? '🚗' : '🏍'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-800">
                                                                {ride.vehicleType} — <span className="text-green-600">₹{ride.price || 0}</span>
                                                            </span>
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                Payable: ₹{ride.price || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {ride && ride.availableSeats > 0 && ride.createdBy?._id !== currentUser?._id && !ride.riders.includes(currentUser?._id) && !ride.pendingRiders?.includes(currentUser?._id) ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleJoinClick(ride); }}
                                                        className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition ml-2 shadow-lg flex items-center gap-2"
                                                    >
                                                        <span>Book Ride</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider py-2 ml-2">
                                                        {ride.createdBy?._id === currentUser?._id ? 'Yours' : ride.riders.includes(currentUser?._id) ? 'Booked' : ride.pendingRiders?.includes(currentUser?._id) ? 'Request Sent' : 'Full'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-gray-400">No rides found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Confirmation Modal */}
            {selectedRide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
                        {/* Header - Dynamic Color based on Vehicle */}
                        <div className={`p-6 text-white text-center relative ${selectedRide.vehicleType === 'Car'
                            ? 'bg-gradient-to-r from-gray-900 to-gray-800'
                            : 'bg-gradient-to-r from-orange-600 to-red-600'
                            }`}>
                            <h3 className="text-xl font-bold flex items-center justify-center gap-2">
                                {selectedRide.vehicleType === 'Car' ? '🚗' : '🏍'} Review {selectedRide.vehicleType} Booking
                            </h3>
                            <button
                                onClick={() => setSelectedRide(null)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {bookingSuccess ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Sent!</h3>
                                    <p className="text-gray-500">Waiting for driver to accept...</p>
                                    <p className="text-sm text-gray-400 mt-4">Check "My Rides" for status</p>
                                </div>
                            ) : (
                                <>
                                    {/* Route Visual */}
                                    <div className="flex items-start gap-4 mb-8 relative">
                                        <div className="flex flex-col items-center mt-1">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                            <div className="w-0.5 h-12 bg-gray-200 my-1"></div>
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        </div>
                                        <div className="flex-1 space-y-8">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Pick Up</p>
                                                <h4 className="font-bold text-gray-900">{selectedRide.source}</h4>
                                                <p className="text-xs text-gray-500">{selectedRide.time}, {new Date(selectedRide.date).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Drop Off</p>
                                                <h4 className="font-bold text-gray-900">{selectedRide.destination}</h4>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Driver & Car Info */}
                                    <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${selectedRide.vehicleType === 'Car' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {selectedRide.createdBy?.name?.[0] || 'D'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{selectedRide.createdBy?.name || 'Driver'}</p>
                                                <p className="text-xs text-gray-500">Verified Driver • 4.8 ★</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 flex items-center gap-2">
                                                {selectedRide.vehicleType === 'Car' ? '🚗 Sedan/Hatchback' : '🏍 Motorbike'}
                                            </span>
                                            <span className="font-bold text-gray-900">{selectedRide.availableSeats} seats left</span>
                                        </div>
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="space-y-2 mb-8">
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Price per seat</span>
                                            <span>₹{selectedRide.price}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Booking Fee</span>
                                            <span>₹0</span>
                                        </div>
                                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                            <span className="font-bold text-gray-900">Total</span>
                                            <span className="text-2xl font-bold text-green-600">₹{selectedRide.price}</span>
                                        </div>
                                    </div>


                                    {/* Action */}
                                    <button
                                        onClick={confirmBooking}
                                        disabled={isBooking}
                                        className={`w-full text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${selectedRide.vehicleType === 'Car' ? 'bg-black' : 'bg-orange-600'
                                            }`}
                                    >
                                        {isBooking ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Sending Request...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Send Request</span>
                                                <span>➔</span>
                                            </>
                                        )}
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
