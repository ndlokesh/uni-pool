const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_DIY12345678',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
const createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;
        const options = {
            amount: amount * 100,
            currency,
            receipt: 'receipt_' + Date.now(),
        };
        const order = await razorpay.orders.create(options);
        res.json({ ...order, key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ message: 'Payment initiation failed', error: error.message });
    }
};

// @desc    Verify Razorpay Payment & save to DB
// @route   POST /api/payments/verify
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rideId, amount, method } = req.body;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            const payment = await Payment.create({
                user: req.user._id,
                ride: rideId,
                amount,
                method: 'razorpay_' + (method || 'online'),
                status: 'completed',
                transactionId: razorpay_payment_id
            });
            return res.status(200).json({ message: 'Payment verified successfully', payment });
        }

        // Signature mismatch → store failed record for audit
        await Payment.create({
            user: req.user._id,
            ride: rideId,
            amount,
            method: 'razorpay_' + (method || 'online'),
            status: 'failed',
            transactionId: razorpay_payment_id || 'SIG_MISMATCH_' + Date.now()
        });

        res.status(400).json({ message: 'Invalid payment signature' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Record Cash/Offline Payment
// @route   POST /api/payments/cash
const recordCashPayment = async (req, res) => {
    try {
        const { rideId, amount } = req.body;
        if (!rideId || !amount) return res.status(400).json({ message: 'rideId and amount are required' });

        const payment = await Payment.create({
            user: req.user._id,
            ride: rideId,
            amount,
            method: 'cash',
            status: 'pending',
            transactionId: 'CASH_' + uuidv4().slice(0, 8).toUpperCase()
        });
        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payments for current user (with ride details)
// @route   GET /api/payments/my-payments
const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id })
            .populate('ride', 'source destination date time price vehicleType')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get payment summary stats for current user
// @route   GET /api/payments/stats
const getPaymentStats = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id, status: 'completed' });
        const totalSpent   = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalRides   = payments.length;
        const byMethod     = payments.reduce((acc, p) => {
            acc[p.method] = (acc[p.method] || 0) + 1;
            return acc;
        }, {});
        res.json({ totalSpent, totalRides, byMethod });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createOrder, verifyPayment, recordCashPayment, getMyPayments, getPaymentStats };
