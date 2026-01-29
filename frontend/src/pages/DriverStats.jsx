import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios';
import authService from '../services/authService';

const DriverStats = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('daily'); // daily, weekly, monthly
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

    const { totalRides, totalEarnings, dailyStats, weeklyStats, monthlyStats } = stats || {};

    const getChartData = () => {
        switch (activeTab) {
            case 'daily': return dailyStats;
            case 'weekly': return weeklyStats;
            case 'monthly': return monthlyStats;
            default: return dailyStats;
        }
    };

    const chartData = getChartData();
    const chartKeys = chartData ? Object.keys(chartData).sort().reverse() : []; // Show latest first

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

                <h1 className="text-4xl font-bold text-white mb-2">Driver Dashboard</h1>
                <p className="text-gray-400 mb-10">Track your rides and earnings performance.</p>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden group">
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

                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-white/20 transition-all duration-500"></div>
                        <div className="relative z-10">
                            <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-2">Total Earnings</p>
                            <h2 className="text-5xl font-extrabold text-white">₹{totalEarnings?.toLocaleString()}</h2>
                            <div className="mt-4 flex items-center text-sm text-amber-100">
                                <span className="bg-white/20 px-2 py-1 rounded-lg mr-2">INR</span>
                                <span>Total Revenue</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Earnings Breakdown */}
                <div className="bg-[#1e293b]/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <h3 className="text-2xl font-bold text-white">Earnings History</h3>

                        <div className="flex bg-gray-800/80 p-1 rounded-xl">
                            {['daily', 'weekly', 'monthly'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${activeTab === tab
                                            ? 'bg-indigo-500 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {chartKeys.length > 0 ? (
                            chartKeys.map((key) => (
                                <div key={key} className="bg-gray-800/40 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-800/60 transition-colors border border-gray-700/30">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${activeTab === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                                                activeTab === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-lg">{key}</p>
                                            <p className="text-gray-500 text-sm capitalize">{activeTab} Earnings</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-200">₹{chartData[key]?.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                <p className="text-lg">No earnings data available for this period.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DriverStats;
