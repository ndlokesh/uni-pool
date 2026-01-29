const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String, // 'completed', 'failed', 'pending'
        default: 'completed'
    },
    method: {
        type: String, // 'upi', 'card', 'wallet'
        required: true
    },
    transactionId: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
