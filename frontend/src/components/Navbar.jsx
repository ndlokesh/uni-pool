import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

import NotificationDropdown from './NotificationDropdown';
import Logo from './Logo';

const Navbar = () => {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <nav className="sticky top-4 z-50 mx-4 md:mx-auto max-w-7xl animate-fade-in-up">
            <div className="glass rounded-full px-6 py-3 flex justify-between items-center shadow-sm">
                <Link to="/" className="text-2xl font-bold text-primary-600 flex items-center gap-2 tracking-tight">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <Logo className="w-full h-full object-contain" />
                    </div>
                    <span>UNI POOL</span>
                </Link>
                <div>
                    {user ? (
                        <div className="flex items-center space-x-6">
                            <Link to="/my-rides" className="text-gray-600 hover:text-primary-600 font-medium transition text-sm">
                                My Rides
                            </Link>
                            <NotificationDropdown />
                            <span className="text-gray-600 font-medium">Hello, <span className="text-primary-600">{user.name}</span></span>
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
