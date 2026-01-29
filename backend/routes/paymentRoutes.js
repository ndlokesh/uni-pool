const express = require('express');
const router = express.Router();
const { processPayment, getMyPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, processPayment);
router.get('/my-payments', protect, getMyPayments);

module.exports = router;
