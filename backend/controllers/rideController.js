const Ride = require('../models/Ride');
const Notification = require('../models/Notification');
const { getRoadRouting } = require('../utils/distance');
const { calculateFare } = require('../utils/pricing');

// @desc    Get Fare Estimate
// @route   POST /api/rides/estimate
// @access  Private
const getRideEstimate = async (req, res) => {
    const { sourceLat, sourceLng, destLat, destLng, vehicleType } = req.body;

    if (!sourceLat || !sourceLng || !destLat || !destLng) {
        return res.status(400).json({ message: 'GPS coordinates required' });
    }

    // Use Accurate OSRM Routing
    const { distanceKm, durationMin, source } = await getRoadRouting(sourceLat, sourceLng, destLat, destLng);

    // Calculate Fare
    const pricing = calculateFare(distanceKm, durationMin, vehicleType || 'Car');

    res.status(200).json({
        distanceKm,
        durationMin,
        routingSource: source, // Debug info to see if OSRM worked
        ...pricing
    });
};

// @desc    Create a new ride
// @route   POST /api/rides
// @access  Private
const createRide = async (req, res) => {
    try {
        const { source, destination, date, time, availableSeats, vehicleType, sourceLat, sourceLng, destLat, destLng } = req.body;

        if (!source || !destination || !date || !time || !availableSeats) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        // Auto-calculate Distance & Price if coordinates exist
        let distanceKm = 0;
        let durationMin = 0;
        let price = 0;
        let driverEarnings = 0;

        if (sourceLat && sourceLng && destLat && destLng) {
            // Use Accurate OSRM Routing
            const routing = await getRoadRouting(sourceLat, sourceLng, destLat, destLng);
            distanceKm = routing.distanceKm;
            durationMin = routing.durationMin;

            const fareDetails = calculateFare(distanceKm, durationMin, vehicleType);
            price = fareDetails.riderCost;
            driverEarnings = fareDetails.driverEarnings;
        }

        const ride = await Ride.create({
            user: req.user.id,
            source,
            destination,
            sourceLat,
            sourceLng,
            destLat,
            destLng,
            date,
            time,
            availableSeats,
            vehicleType,
            createdBy: req.user.id,
            distanceKm: parseFloat(distanceKm.toFixed(1)),
            durationMin,
            price,
            driverEarnings
        });

        res.status(201).json(ride);
    } catch (error) {
        console.error(error); // Log for debugging
        res.status(400).json({ message: error.message || 'Invalid ride data' });
    }
};

// @desc    Get all rides
// @route   GET /api/rides
// @access  Private
// @desc    Get all rides
// @route   GET /api/rides
// @access  Private
const getRides = async (req, res) => {
    const rides = await Ride.find()
        .populate('createdBy', 'name email phoneNumber')
        .populate('pendingRiders', 'name email phoneNumber')
        .populate('riders', 'name email phoneNumber')
        .sort({ createdAt: -1 });
    res.status(200).json(rides);
};

// @desc    Request to join a ride
// @route   PUT /api/rides/join/:id
// @access  Private
const joinRide = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Prevent joining own ride
        if (ride.createdBy.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot join your own ride' });
        }

        // Check if already in pending or riders
        if (ride.riders.includes(req.user.id) || ride.pendingRiders.includes(req.user.id)) {
            return res.status(400).json({ message: 'You have already requested or joined this ride' });
        }

        // Check seats (even for request, though actual check is on accept)
        if (ride.availableSeats <= 0) {
            return res.status(400).json({ message: 'No seats available' });
        }

        // Add to Pending
        ride.pendingRiders.push(req.user.id);
        await ride.save();

        // Create Notification for the Driver
        try {
            await Notification.create({
                user: ride.createdBy,
                message: `${req.user.name} has requested to join your ride from ${ride.source} to ${ride.destination}`,
                type: 'request',
                relatedRide: ride._id
            });
        } catch (err) {
            console.error("Failed to create notification", err);
        }

        res.status(200).json(ride);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Respond to ride request (Accept/Reject)
// @route   PUT /api/rides/respond
// @access  Private
const respondToRideRequest = async (req, res) => {
    try {
        const { rideId, riderId, action } = req.body; // action: 'accept' or 'reject'

        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        if (ride.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!ride.pendingRiders.includes(riderId)) {
            return res.status(400).json({ message: 'Rider request not found' });
        }

        if (action === 'accept') {
            if (ride.availableSeats <= 0) {
                return res.status(400).json({ message: 'No seats available to accept' });
            }

            // Move from pending to accepted
            ride.pendingRiders = ride.pendingRiders.filter(id => id.toString() !== riderId);
            ride.riders.push(riderId);
            ride.availableSeats -= 1;
            await ride.save();

            // Notify Rider
            await Notification.create({
                user: riderId,
                message: `Your ride request for ${ride.source} to ${ride.destination} was ACCEPTED!`,
                type: 'booking',
                relatedRide: ride._id
            });

        } else if (action === 'reject') {
            // Remove from pending
            ride.pendingRiders = ride.pendingRiders.filter(id => id.toString() !== riderId);
            await ride.save();

            // Notify Rider
            await Notification.create({
                user: riderId,
                message: `Your ride request for ${ride.source} to ${ride.destination} was REJECTED.`,
                type: 'system',
                relatedRide: ride._id
            });
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        // Return updated ride with populated fields
        const updatedRide = await Ride.findById(rideId)
            .populate('pendingRiders', 'name email phoneNumber')
            .populate('riders', 'name email phoneNumber');

        res.status(200).json(updatedRide);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Driver Stats (Earnings & Rides)
// @route   GET /api/rides/stats
// @access  Private
const getDriverStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const rides = await Ride.find({ createdBy: userId });

        const totalRides = rides.length;
        let totalEarnings = 0;

        // Grouping data
        const dailyStats = {};
        const weeklyStats = {};
        const monthlyStats = {};

        rides.forEach(ride => {
            const earnings = ride.driverEarnings || 0;
            totalEarnings += earnings;

            const date = new Date(ride.date);

            // Daily Key: YYYY-MM-DD
            const dayKey = date.toISOString().split('T')[0];
            if (!dailyStats[dayKey]) dailyStats[dayKey] = 0;
            dailyStats[dayKey] += earnings;

            // Monthly Key: YYYY-MM
            const monthKey = dayKey.substring(0, 7);
            if (!monthlyStats[monthKey]) monthlyStats[monthKey] = 0;
            monthlyStats[monthKey] += earnings;

            // Simple Weekly logic (ISO Week number could be complex, using simple approach)
            // For now, let's just use the start of the week logic or ISO string
            const fw = new Date(date.getFullYear(), 0, 1);
            const days = Math.floor((date - fw) / (24 * 60 * 60 * 1000));
            const weekNum = Math.ceil((date.getDay() + 1 + days) / 7);
            const weekKey = `${date.getFullYear()}-W${weekNum}`;

            if (!weeklyStats[weekKey]) weeklyStats[weekKey] = 0;
            weeklyStats[weekKey] += earnings;
        });

        res.status(200).json({
            totalRides,
            totalEarnings,
            dailyStats,
            weeklyStats,
            monthlyStats,
            rides // Include the list of rides
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a ride
// @route   DELETE /api/rides/:id
// @access  Private
const deleteRide = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Check user ownership
        if (ride.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized to delete this ride' });
        }

        await Ride.findByIdAndDelete(req.params.id);

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    createRide,
    getRides,
    joinRide,
    getRideEstimate,
    getDriverStats,
    deleteRide,
    respondToRideRequest
};
