import API from './api';

const createRide = async (rideData) => {
    const response = await API.post('/rides', rideData);
    return response.data;
};

const getRides = async (filters = {}) => {
    let query = '';
    if (filters.active) query += '?active=true';
    if (filters.searchQuery) query += `&searchQuery=${encodeURIComponent(filters.searchQuery)}`;

    // Clean up query string start
    if (query.startsWith('&')) query = '?' + query.substring(1);

    const response = await API.get(`/rides${query}`);
    return response.data;
};

const getRide = async (id) => {
    const response = await API.get(`/rides/${id}`);
    return response.data;
};

const joinRide = async (rideId) => {
    const response = await API.put(`/rides/join/${rideId}`);
    return response.data;
};

const getRideEstimate = async (data) => {
    const response = await API.post('/rides/estimate', data);
    return response.data;
};

const respondToRequest = async (rideId, riderId, action) => {
    const response = await API.put('/rides/respond', { rideId, riderId, action });
    return response.data;
};

const verifyOTP = async (rideId, otp) => {
    const response = await API.post('/rides/verify-otp', { rideId, otp });
    return response.data;
};

const rideService = {
    createRide,
    getRides,
    getRide,
    joinRide,
    getRideEstimate,
    respondToRequest,
    verifyOTP,
};

export default rideService;
