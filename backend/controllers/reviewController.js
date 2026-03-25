const Review = require('../models/Review');
const User = require('../models/User');

// @desc    Add a review for a driver
// @route   POST /api/reviews
// @access  Private
const addReview = async (req, res) => {
    try {
        const { revieweeId, rideId, rating, comment } = req.body;

        if (!revieweeId || !rideId || !rating) {
            return res.status(400).json({ message: 'revieweeId, rideId, and rating are required' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }
        // Prevent self-review
        if (req.user._id.toString() === revieweeId.toString()) {
            return res.status(400).json({ message: 'You cannot review yourself' });
        }

        const review = await Review.create({
            reviewer: req.user._id,
            reviewee: revieweeId,
            ride: rideId,
            rating,
            comment: comment?.trim() || ''
        });

        // Recalculate user average rating
        const user = await User.findById(revieweeId);
        if (user) {
            const total = user.totalRatings || 0;
            const currentAvg = user.averageRating || 0;
            const newTotal = total + 1;
            const newAvg = ((currentAvg * total) + rating) / newTotal;
            user.totalRatings = newTotal;
            user.averageRating = parseFloat(newAvg.toFixed(1));
            await user.save();
        }

        // Return populated review
        const populated = await Review.findById(review._id)
            .populate('reviewer', 'name')
            .populate('reviewee', 'name')
            .populate('ride', 'source destination date');

        res.status(201).json(populated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already reviewed this user for this ride' });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reviews for a user (as reviewee)
// @route   GET /api/reviews/:userId
// @access  Private
const getUserReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ reviewee: req.params.userId })
            .populate('reviewer', 'name averageRating')
            .populate('ride', 'source destination date')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews written BY the current user
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ reviewer: req.user._id })
            .populate('reviewee', 'name averageRating')
            .populate('ride', 'source destination date')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if current user already reviewed a specific driver for a ride
// @route   GET /api/reviews/check/:rideId/:revieweeId
// @access  Private
const checkReviewExists = async (req, res) => {
    try {
        const existing = await Review.findOne({
            ride: req.params.rideId,
            reviewer: req.user._id,
            reviewee: req.params.revieweeId
        });
        res.json({ exists: !!existing, review: existing });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addReview, getUserReviews, getMyReviews, checkReviewExists };
