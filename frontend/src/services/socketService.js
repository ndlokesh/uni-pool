import { io } from 'socket.io-client';

// Auto-detect backend URL: use REACT_APP_SOCKET_URL in .env, or fall back to
// the current browser origin so it works on localhost AND deployed Render/Vercel.
const SOCKET_URL =
    process.env.REACT_APP_SOCKET_URL ||
    (process.env.NODE_ENV === 'production'
        ? window.location.origin  // same host as frontend when deployed
        : 'http://localhost:5000');

let socket;

export const initSocket = () => {
    if (socket && socket.connected) return socket;

    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],   // try WebSocket first, fall back to polling
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
    socket.on('disconnect', (reason) => console.warn('[Socket] Disconnected:', reason));
    socket.on('connect_error', (err) => console.error('[Socket] Connection error:', err.message));

    return socket;
};

export const getSocket = () => {
    if (!socket || !socket.connected) return initSocket();
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const joinRideRoom = (rideId) => {
    const s = getSocket();
    if (s) s.emit('join_ride', rideId);
};

// data: { rideId, userId, lat, lng, heading, role }
export const sendLocationUpdate = (data) => {
    const s = getSocket();
    if (s) s.emit('update_location', data);
};
