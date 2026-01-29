import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import CreateRide from '../pages/CreateRide';
import SearchRide from '../pages/SearchRide';
import DriverRides from '../pages/DriverRides';
import DriverEarnings from '../pages/DriverEarnings';
import MyRides from '../pages/MyRides';
import PrivateRoute from './PrivateRoute';
import authService from '../services/authService';
import PageTransition from './PageTransition';

const AnimatedRoutes = () => {
    const location = useLocation();
    const user = authService.getCurrentUser();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/login" element={
                    <PageTransition>
                        {!user ? <Login /> : <Navigate to="/" />}
                    </PageTransition>
                } />
                <Route path="/register" element={
                    <PageTransition>
                        {!user ? <Register /> : <Navigate to="/" />}
                    </PageTransition>
                } />

                <Route element={<PrivateRoute />}>
                    <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                    <Route path="/create-ride" element={<PageTransition><CreateRide /></PageTransition>} />
                    <Route path="/search-ride" element={<PageTransition><SearchRide /></PageTransition>} />
                    <Route path="/driver-rides" element={<PageTransition><DriverRides /></PageTransition>} />
                    <Route path="/driver-earnings" element={<PageTransition><DriverEarnings /></PageTransition>} />
                    <Route path="/my-rides" element={<PageTransition><MyRides /></PageTransition>} />
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </AnimatePresence>
    );
};

export default AnimatedRoutes;
