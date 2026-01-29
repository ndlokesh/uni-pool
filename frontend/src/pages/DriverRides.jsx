import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios';
import authService from '../services/authService';

const DriverRides = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const user = authService.getCurrentUser();
                if (!user) {
                    navigate('/login');
                    return;
                }

                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                };

                const response = await axios.get('/api/rides/stats', config);
                setStats(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching stats:", error);
                setLoading(false);
            }
        };

        fetchStats();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const handleDeleteRide = async (rideId) => {
        if (!window.confirm("Are you sure you want to cancel this ride?")) return;

        try {
            const user = authService.getCurrentUser();
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.delete(`/api/rides/${rideId}`, config);

            // Update UI
            setStats(prev => ({
                ...prev,
                totalRides: prev.totalRides - 1,
                rides: prev.rides.filter(ride => ride._id !== rideId)
            }));
        } catch (error) {
            console.error("Error deleting ride:", error);
            alert("Failed to delete ride");
        }
    };

    const { totalRides, rides } = stats || {};

    return (
        <div className="min-h-screen bg-[#0f172a] pb-20">
            <Navbar />

            <div className="container mx-auto px-6 py-10 max-w-4xl animate-fade-in-up">

                <button
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center text-indigo-300 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Dashboard
                </button>

                <h1 className="text-4xl font-bold text-white mb-2">My Rides</h1>
                <p className="text-gray-400 mb-10">History of all trips you have offered.</p>

                {/* Total Rides Summary Card */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden group mb-12">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative z-10">
                        <p className="text-purple-200 text-sm font-bold uppercase tracking-wider mb-2">Total Rides</p>
                        <h2 className="text-5xl font-extrabold text-white">{totalRides}</h2>
                        <div className="mt-4 flex items-center text-sm text-purple-200">
                            <span className="bg-white/20 px-2 py-1 rounded-lg mr-2">Lifetime</span>
                            <span>Completed trips</span>
                        </div>
                    </div>
                </div>

                {/* Rides List */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white mb-6">Ride History</h3>
                    {rides && rides.length > 0 ? (
                        rides.map((ride) => (
                            <div key={ride._id} className="bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:bg-[#1e293b] transition-colors relative group">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-indigo-400 font-bold text-lg">{ride.source}</span>
                                            <span className="text-gray-500">→</span>
                                            <span className="text-indigo-400 font-bold text-lg">{ride.destination}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {new Date(ride.date).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {ride.time}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {ride.distanceKm} km
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-3">
                                        <div>
                                            <p className="text-emerald-400 font-bold text-xl">+ ₹{ride.driverEarnings}</p>
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${ride.availableSeats === 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                {ride.availableSeats === 0 ? 'Full' : `${ride.availableSeats} Seats Left`}
                                            </span>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRide(ride._id); }}
                                            className="text-red-400 hover:text-red-300 text-sm font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Cancel Ride
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-[#1e293b]/30 rounded-3xl border border-gray-800">
                            <p className="text-gray-500 text-lg">No rides offered yet.</p>
                            <button
                                onClick={() => navigate('/create-ride')}
                                className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium"
                            >
                                Post your first ride →
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DriverRides;
