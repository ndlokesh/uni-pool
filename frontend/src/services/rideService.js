import API from './api';

const createRide = async (rideData) => {
    const response = await API.post('/rides', rideData);
    return response.data;
};

const getRides = async () => {
    const response = await API.get('/rides');
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

const rideService = {
    createRide,
    getRides,
    joinRide,
    getRideEstimate,
    respondToRequest,
};

export default rideService;
