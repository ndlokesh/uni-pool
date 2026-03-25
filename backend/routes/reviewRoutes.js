const express = require('express');
const router = express.Router();
const { addReview, getUserReviews, getMyReviews, checkReviewExists } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addReview);
router.get('/my-reviews', protect, getMyReviews);                         // Reviews I wrote
router.get('/check/:rideId/:revieweeId', protect, checkReviewExists);     // Duplicate check
router.get('/:userId', protect, getUserReviews);                          // Reviews for a user

module.exports = router;
