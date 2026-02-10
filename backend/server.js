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

// Socket.IO Connection Logic
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join a specific ride room for live tracking
    socket.on('join_ride', (rideId) => {
        socket.join(rideId);
        console.log(`User ${socket.id} joined ride: ${rideId}`);
    });

    // Handle Location Updates (Driver or Rider)
    // Data: { rideId, userId, lat, lng, heading }
    socket.on('update_location', (data) => {
        // Broadcast to everyone in the ride room EXCEPT the sender
        socket.to(data.rideId).emit('receive_location', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });
});

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
