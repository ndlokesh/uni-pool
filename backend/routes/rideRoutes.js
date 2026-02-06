const express = require('express');
const router = express.Router();
const {
    createRide,
    getRides,
    joinRide,
    getRideEstimate,
    getDriverStats,
    deleteRide,
    respondToRideRequest,
    getRideById
} = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getRides).post(protect, createRide);
router.route('/stats').get(protect, getDriverStats);
router.route('/estimate').post(protect, getRideEstimate);
router.route('/join/:id').put(protect, joinRide);
router.route('/respond').put(protect, respondToRideRequest);
router.route('/:id').get(protect, getRideById).delete(protect, deleteRide);

module.exports = router;
