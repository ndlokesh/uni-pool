import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import authService from '../services/authService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DriverProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRides: 0, earnings: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const currentUser = authService.getCurrentUser();
                if (!currentUser) {
                    navigate('/login');
                    return;
                }

                // Fetch full user profile (with verification images)
                const token = JSON.parse(localStorage.getItem('user')).token;
                const config = {
                    headers: { Authorization: `Bearer ${token}` }
                };

                const userRes = await axios.get('http://localhost:5000/api/auth/me', config);
                setUser(userRes.data);

                // Fetch reviews
                const reviewsRes = await axios.get(`http://localhost:5000/api/reviews/${currentUser._id}`, config);
                setReviews(reviewsRes.data);

                // Fetch basic stats (optional, reusing similar logic from stats page if API available, else mock or skip)
                // For now, we'll just use the user object's ratings.

            } catch (error) {
                console.error("Error fetching profile data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) return null;

    const driverInfo = user.driverVerification || {};
    const vehicleInfo = driverInfo.vehicle || {};
    const licenseInfo = driverInfo.drivingLicense || {};

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8"
                >
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32 md:h-48"></div>
                    <div className="px-8 pb-8">
                        <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-1 shadow-lg">
                                <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-3xl md:text-4xl font-bold text-indigo-600">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                                <p className="text-gray-500">{user.collegeName} • {user.studentNumber}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center text-yellow-400">
                                        <span className="text-xl font-bold text-gray-900 mr-1">{user.averageRating || 0}</span>
                                        {[...Array(5)].map((_, i) => (
                                            <svg key={i} className={`w-5 h-5 ${i < Math.round(user.averageRating || 0) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <span className="text-gray-400">({user.totalRatings || 0} reviews)</span>
                                </div>
                            </div>
                            {user.isDriver && (
                                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Verified Driver
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Documents & Vehicle */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-3xl p-6 shadow-lg"
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                </span>
                                Verified Documents
                            </h2>

                            {/* Driving License */}
                            <div className="mb-6 border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                                <h3 className="font-semibold text-gray-700 mb-3">Driving License</h3>
                                <div className="bg-gray-50 rounded-xl p-4 mb-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">License Number</span>
                                        <span className="font-medium text-gray-900">{licenseInfo.number || 'Not provided'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-2">
                                        <span className="text-gray-500">Expiry Date</span>
                                        <span className="font-medium text-gray-900">
                                            {licenseInfo.expiryDate ? new Date(licenseInfo.expiryDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                {licenseInfo.image ? (
                                    <div className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100 border border-gray-200">
                                        <img
                                            src={licenseInfo.image}
                                            alt="Driving License"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                                        License image not uploaded
                                    </div>
                                )}
                            </div>

                            {/* Vehicle Registration */}
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-3">Vehicle Details</h3>
                                <div className="bg-gray-50 rounded-xl p-4 mb-3">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Vehicle Type</p>
                                            <p className="font-medium text-gray-900 capitalize">{vehicleInfo.type || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Model</p>
                                            <p className="font-medium text-gray-900">{vehicleInfo.model || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Color</p>
                                            <p className="font-medium text-gray-900">{vehicleInfo.color || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Number</p>
                                            <p className="font-medium text-gray-900">{vehicleInfo.number || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                {vehicleInfo.registrationImage ? (
                                    <div className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100 border border-gray-200">
                                        <img
                                            src={vehicleInfo.registrationImage}
                                            alt="Vehicle Registration"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                        Registration certificate not uploaded
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Feedback */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-3xl p-6 shadow-lg h-full"
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </span>
                                Passenger Feedback
                            </h2>

                            {reviews.length > 0 ? (
                                <div className="space-y-4">
                                    {reviews.map((review) => (
                                        <div key={review._id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                        {review.reviewer?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <span className="font-semibold text-sm text-gray-900">{review.reviewer?.name || 'Anonymous'}</span>
                                                </div>
                                                <div className="flex items-center text-yellow-500 text-sm">
                                                    <span className="font-bold mr-1">{review.rating}</span>
                                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-sm leading-relaxed">"{review.comment}"</p>
                                            <p className="text-xs text-gray-400 mt-2 text-right">{new Date(review.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 font-medium">No reviews yet</p>
                                    <p className="text-gray-400 text-sm mt-1">Feedback from passengers will appear here</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverProfile;
