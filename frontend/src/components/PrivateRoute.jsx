import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import authService from '../services/authService';

const PrivateRoute = () => {
    const user = authService.getCurrentUser();
    return user ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
