const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getVerificationStatus,
    uploadDrivingLicense,
    uploadVehicleDetails,
    getDriverProfile
} = require('../controllers/driverVerificationController');

// All routes are protected
router.use(protect);

// Get verification status
router.get('/status', getVerificationStatus);

// Upload driving license
router.post('/license', uploadDrivingLicense);

// Upload vehicle details
router.post('/vehicle', uploadVehicleDetails);

// Get full driver profile
router.get('/profile', getDriverProfile);

module.exports = router;
