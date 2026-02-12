import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

import NotificationDropdown from './NotificationDropdown';
import Logo from './Logo';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = authService.getCurrentUser();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const showBackButton = location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register';

    return (
        <nav className="sticky top-4 z-50 mx-4 md:mx-auto max-w-7xl animate-fade-in-up">
            <div className="glass rounded-full px-6 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    {showBackButton && (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-primary-600 transition-colors"
                            aria-label="Go back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </button>
                    )}
                    <Link to="/" className="text-2xl font-bold text-primary-600 flex items-center gap-2 tracking-tight">
                        <div className="w-10 h-10 flex items-center justify-center">
                            <Logo className="w-full h-full object-contain" />
                        </div>
                        <span className="hidden sm:inline">UNI POOL</span>
                    </Link>
                </div>

                <div>
                    {user ? (
                        <div className="flex items-center space-x-6">
                            <Link to="/my-rides" className="text-gray-600 hover:text-primary-600 font-medium transition text-sm hidden md:block">
                                My Rides
                            </Link>
                            {(user.isDriver || user.driverVerificationStatus === 'fully_verified') && (
                                <Link to="/driver-profile" className="text-gray-600 hover:text-primary-600 font-medium transition text-sm hidden md:block">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Profile
                                    </span>
                                </Link>
                            )}
                            <NotificationDropdown />
                            <span className="text-gray-600 font-medium hidden md:block">Hello, <span className="text-primary-600">{user.name}</span></span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 border border-red-200 text-red-500 rounded-full hover:bg-red-50 hover:text-red-600 transition duration-200 text-sm font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex space-x-4">
                            <Link to="/login" className="px-4 py-2 text-gray-600 hover:text-primary-600 font-medium transition">
                                Login
                            </Link>
                            <Link to="/register" className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5">
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
