import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // Or auto-detect based on env

let socket;

export const initSocket = () => {
    socket = io(SOCKET_URL);
    return socket;
};

export const getSocket = () => {
    if (!socket) {
        return initSocket();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const joinRideRoom = (rideId) => {
    if (socket) socket.emit('join_ride', rideId);
};

export const sendLocationUpdate = (data) => {
    // data: { rideId, userId, lat, lng, heading }
    if (socket) socket.emit('update_location', data);
};
