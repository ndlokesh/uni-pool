const Review = require('../models/Review');
const User = require('../models/User');

// @desc    Add a review
// @route   POST /api/reviews
// @access  Private
const addReview = async (req, res) => {
    try {
        const { revieweeId, rideId, rating, comment } = req.body;

        if (!revieweeId || !rideId || !rating) {
            return res.status(400).json({ message: "Invalid data" });
        }

        // Create the review
        const review = await Review.create({
            reviewer: req.user._id,
            reviewee: revieweeId,
            ride: rideId,
            rating,
            comment
        });

        // Update User's average rating
        const user = await User.findById(revieweeId);
        if (user) {
            const total = user.totalRatings || 0;
            const currentAvg = user.averageRating || 0;

            // New Average = ((Old Avg * Old Total) + New Rating) / (Old Total + 1)
            const newTotal = total + 1;
            const newAvg = ((currentAvg * total) + rating) / newTotal;

            user.totalRatings = newTotal;
            user.averageRating = parseFloat(newAvg.toFixed(1)); // Keep 1 decimal
            await user.save();
        }

        res.status(201).json(review);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "You have already reviewed this user for this ride" });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a user
// @route   GET /api/reviews/:userId
// @access  Private
const getUserReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ reviewee: req.params.userId })
            .populate('reviewer', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addReview, getUserReviews };
