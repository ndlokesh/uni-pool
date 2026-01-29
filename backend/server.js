const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config();

const port = process.env.PORT || 5000;

const app = express();

// Connect to MongoDB
const connectDB = require('./config/db');
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.use('/api', require('./routes/authRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// Serve Frontend (Client Build)
// Ensure "npm run build" was run in frontend folder
// Serve Frontend (Client Build)
// Ensure "npm run build" was run in frontend folder
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// Serve index.html for any unknown route (SPA support)
app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
});

app.listen(port, () => console.log(`Server started on port ${port}`));
