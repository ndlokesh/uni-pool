const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_DIY12345678', // Default test key if missing
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;

        const options = {
            amount: amount * 100, // Amount in paise
            currency,
            receipt: 'receipt_' + Date.now(),
        };

        const order = await razorpay.orders.create(options);
        res.json({ ...order, key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ message: 'Payment initiation failed', error: error.message });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rideId, amount, method } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Save successful payment to DB
            const payment = await Payment.create({
                user: req.user._id,
                ride: rideId,
                amount,
                method: 'razorpay_' + method, // e.g. razorpay_card, razorpay_upi
                status: 'completed',
                transactionId: razorpay_payment_id
            });

            res.status(200).json({ message: "Payment verified successfully", payment });
        } else {
            res.status(400).json({ message: "Invalid payment signature" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Record Cash/Offline Payment
// @route   POST /api/payments/cash
// @access  Private
const recordCashPayment = async (req, res) => {
    try {
        const { rideId, amount } = req.body;

        const payment = await Payment.create({
            user: req.user._id,
            ride: rideId,
            amount,
            method: 'cash',
            status: 'pending', // Cash is pending until ride completion usually, or marked 'collected' by driver
            transactionId: 'CASH_' + uuidv4().slice(0, 8).toUpperCase()
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
        const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createOrder, verifyPayment, recordCashPayment, getMyPayments };
