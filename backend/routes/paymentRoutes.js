const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, recordCashPayment, getMyPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/cash', protect, recordCashPayment);
router.get('/my-payments', protect, getMyPayments);

module.exports = router;
