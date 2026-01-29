const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    source: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    sourceLat: { type: Number },
    sourceLng: { type: Number },
    destLat: { type: Number },
    destLng: { type: Number },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    availableSeats: {
        type: Number,
        required: true,
        min: 0,
    },
    vehicleType: {
        type: String,
        enum: ['Car', 'Bike'],
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    pendingRiders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    riders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    distanceKm: { type: Number },
    durationMin: { type: Number },
    price: { type: Number },
    driverEarnings: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);
