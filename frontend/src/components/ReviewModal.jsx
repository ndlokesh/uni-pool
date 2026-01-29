import React, { useState } from 'react';
import reviewService from '../services/reviewService';

const ReviewModal = ({ ride, onClose }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await reviewService.addReview({
                revieweeId: ride.createdBy._id || ride.createdBy, // Rating the driver
                rideId: ride._id,
                rating,
                comment
            });
            setSubmitted(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit review");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative p-8">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
                >
                    ✕
                </button>

                {submitted ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-4">🌟</div>
                        <h3 className="text-xl font-bold text-gray-800">Review Submitted!</h3>
                        <p className="text-gray-500 mt-2">Thanks for your feedback.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Rate your Driver</h3>

                        {error && <div className="bg-red-50 text-red-500 p-2 rounded mb-4 text-sm text-center">{error}</div>}

                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`text-4xl transition transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        <div className="text-center font-bold text-gray-600 mb-4">
                            {rating === 5 ? "Excellent! 😍" : rating === 4 ? "Good 🙂" : rating === 3 ? "Okay 😐" : rating === 2 ? "Bad 😕" : "Terrible 😡"}
                        </div>

                        <textarea
                            className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none mb-6"
                            rows="3"
                            placeholder="Share your experience (optional)..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        ></textarea>

                        <button
                            type="submit"
                            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg"
                        >
                            Submit Review
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ReviewModal;
