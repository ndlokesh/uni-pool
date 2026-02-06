import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ShimmerButton from '../components/ShimmerButton';
import authService from '../services/authService';

const Dashboard = () => {
    const user = authService.getCurrentUser();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen">
            <Navbar />
            <div className="container mx-auto px-6 pb-12 animate-fade-in-up">
                <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] rounded-[2rem] p-8 md:p-12 mb-12 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                    <div className="relative z-10 max-w-3xl">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold tracking-wider mb-6 border border-white/20 uppercase text-indigo-200">
                            Student Mobility Solution
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
                            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-cyan-200">{user && user.name}</span>!
                        </h1>
                        <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
                            Reduce your carbon footprint and travel costs by sharing rides with fellow students. Safe, fast, and eco-friendly.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <ShimmerButton onClick={() => navigate('/create-ride')}>
                                <span className="text-xl">🚗</span> Offer a Ride
                            </ShimmerButton>

                            <Link to="/search-ride" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all transform hover:-translate-y-1 flex items-center gap-2 h-full min-h-[56px]">
                                <span className="text-xl">🔍</span> Find a Ride
                            </Link>
                        </div>
                    </div>
                    {/* Decorative abstract shapes */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[30rem] h-[30rem] bg-indigo-500 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
                    <div className="absolute bottom-0 right-20 -mb-20 w-80 h-80 bg-cyan-500 rounded-full blur-[80px] opacity-20"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                    <div
                        className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-sm border border-white/50 hover:shadow-2xl hover:border-indigo-100 transition-all duration-300 group cursor-pointer h-full"
                        onClick={() => window.location.href = '/create-ride'}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 group-hover:text-indigo-600 transition-colors">Post a Ride</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                            Driving somewhere? Share your empty seats to split costs and help others.
                        </p>
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </div>

                    <div
                        className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-sm border border-white/50 hover:shadow-2xl hover:border-emerald-100 transition-all duration-300 group cursor-pointer h-full"
                        onClick={() => window.location.href = '/search-ride'}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 group-hover:text-teal-600 transition-colors">Find a Ride</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                            Need a lift? Find rides going to your destination comfortably and safely.
                        </p>
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 text-gray-400 group-hover:bg-teal-500 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </div>

                    <div
                        className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-sm border border-white/50 hover:shadow-2xl hover:border-purple-100 transition-all duration-300 group cursor-pointer h-full"
                        onClick={() => window.location.href = '/driver-rides'}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 group-hover:text-purple-600 transition-colors">Total Rides</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                            View your ride history and statistics.
                        </p>
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 text-gray-400 group-hover:bg-purple-600 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </div>

                    <div
                        className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-sm border border-white/50 hover:shadow-2xl hover:border-amber-100 transition-all duration-300 group cursor-pointer h-full"
                        onClick={() => window.location.href = '/driver-earnings'}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 group-hover:text-amber-500 transition-colors">Total Earnings</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                            Track your earnings from shared rides.
                        </p>
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 text-gray-400 group-hover:bg-amber-500 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </div>

                    <div
                        className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-sm border border-white/50 hover:shadow-2xl hover:border-cyan-100 transition-all duration-300 group cursor-pointer h-full md:col-span-2"
                        onClick={() => window.location.href = '/driver-verification'}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl text-white flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 group-hover:text-cyan-600 transition-colors">Driver Verification</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                            Complete your driver profile by uploading your driving license and vehicle details. Get verified to start offering rides.
                        </p>
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 text-gray-400 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
