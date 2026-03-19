const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const port = process.env.PORT || 5000;

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from Vercel and Localhost
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
const connectDB = require('./config/db');
connectDB();

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://your-frontend-domain.com' : '*', // Restrict in production
    credentials: true
}));

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://*.googleapis.com", "https://*.gstatic.com"], // Allow Google Maps scripts if ever needed
            imgSrc: ["'self'", "data:", "https://*.openstreetmap.org", "https://*.cartocdn.com", "https://*.flaticon.com", "https://*.githubusercontent.com"], // Allow map tiles & icons
            connectSrc: ["'self'", "ws:", "wss:", "https://*.googleapis.com", "http://router.project-osrm.org"], // Allow WebSockets & OSRM
        },
    },
}));

// Rate Limiting (Prevent Brute Force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// In-memory store: rideId -> { userId -> { lat, lng, heading, role } }
// This lets late joiners instantly see where everyone is.
const rideLocations = {};

// Socket.IO Connection Logic
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join a specific ride room for live tracking
    socket.on('join_ride', (rideId) => {
        socket.join(rideId);
        console.log(`User ${socket.id} joined ride: ${rideId}`);

        // Send snapshot of all current locations to the new joiner
        if (rideLocations[rideId] && Object.keys(rideLocations[rideId]).length > 0) {
            socket.emit('room_snapshot', rideLocations[rideId]);
        }
    });

    // Handle Location Updates
    // Data: { rideId, userId, lat, lng, heading, role }
    socket.on('update_location', (data) => {
        const { rideId, userId, lat, lng, heading, role } = data;

        // Persist latest position
        if (!rideLocations[rideId]) rideLocations[rideId] = {};
        rideLocations[rideId][userId] = { lat, lng, heading, role };

        // Broadcast to everyone in the ride room EXCEPT sender
        socket.to(rideId).emit('receive_location', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });

    // Clean up stale ride rooms periodically (prevent memory leaks)
    // We keep each ride's data for 8 hours then purge it
    // (lightweight – runs per new connection, not a global timer)
});

// Purge stale location data every hour (8 h TTL)
const locationTTL = new Map(); // rideId -> timestamp of last update
setInterval(() => {
    const now = Date.now();
    for (const rideId of Object.keys(rideLocations)) {
        const lastSeen = locationTTL.get(rideId) || 0;
        if (now - lastSeen > 8 * 60 * 60 * 1000) {
            delete rideLocations[rideId];
            locationTTL.delete(rideId);
        }
    }
}, 60 * 60 * 1000);

// Make io accessible in routes if needed (req.io)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API Routes
app.use('/api', require('./routes/authRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/driver-verification', require('./routes/driverVerificationRoutes'));

// Serve Frontend (Client Build)
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// Serve index.html for any unknown route (SPA support)
app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
});

server.listen(port, () => console.log(`Server started on port ${port}`));
