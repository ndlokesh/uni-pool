const Payment = require('../models/Payment');
const { v4: uuidv4 } = require('uuid');

// @desc    Process a (fake) payment
// @route   POST /api/payments
// @access  Private
const processPayment = async (req, res) => {
    try {
        const { rideId, amount, method } = req.body;

        // Simulate processing delay (1-2 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Create Payment Record
        const payment = await Payment.create({
            user: req.user._id,
            ride: rideId,
            amount,
            method,
            status: 'completed',
            transactionId: 'TXN_' + uuidv4().slice(0, 8).toUpperCase()
        });

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user payments
// @route   GET /api/payments/my-payments
// @access  Private
const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { processPayment, getMyPayments };
