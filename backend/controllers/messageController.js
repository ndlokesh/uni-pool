const Message = require('../models/Message');
const Ride = require('../models/Ride');

const Notification = require('../models/Notification');

// @desc    Get messages for a ride
// @route   GET /api/messages/:rideId
// @access  Private
const getMessages = async (req, res) => {
    try {
        const messages = await Message.find({ ride: req.params.rideId })
            .populate('sender', 'name email')
            .sort({ createdAt: 1 }); // Oldest first
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { rideId, content } = req.body;

        if (!content || !rideId) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const newMessage = await Message.create({
            ride: rideId,
            sender: req.user._id,
            content
        });

        // ---------------------------------------------------------
        // Create Notifications for other participants
        // ---------------------------------------------------------
        try {
            const ride = await Ride.findById(rideId);
            if (ride) {
                const recipients = [];
                const senderId = req.user._id.toString();

                // Add Driver if not sender
                if (ride.createdBy.toString() !== senderId) {
                    recipients.push(ride.createdBy);
                }

                // Add Riders if not sender
                ride.riders.forEach(riderId => {
                    if (riderId.toString() !== senderId) {
                        recipients.push(riderId);
                    }
                });

                // Send notifications
                await Promise.all(recipients.map(recipientId =>
                    Notification.create({
                        user: recipientId,
                        message: `New message from ${req.user.name}: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
                        type: 'message',
                        relatedRide: ride._id
                    })
                ));
            }
        } catch (notifError) {
            console.error("Notification creation failed:", notifError);
            // non-blocking
        }
        // ---------------------------------------------------------

        const fullMessage = await Message.findById(newMessage._id).populate('sender', 'name email');

        res.status(201).json(fullMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMessages, sendMessage };
