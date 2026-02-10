import React, { useState } from 'react';
import paymentService from '../services/paymentService';

const PaymentModal = ({ ride, onClose, onSuccess }) => {
    const [method, setMethod] = useState('card');
    const [step, setStep] = useState('select'); // select, processing, success
    const [error, setError] = useState('');

    const handlePay = async () => {
        setError('');
        setStep('processing');

        try {
            if (method === 'cash') {
                // Cash Payment Logic
                await paymentService.recordCashPayment({
                    rideId: ride._id,
                    amount: ride.price
                });
                completeSuccess();
            } else {
                // Razorpay Online Payment Logic
                const orderData = await paymentService.createOrder(ride.price);

                const options = {
                    key: orderData.key, // Key returned from backend
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "Uni Pool",
                    description: "Ride Sharing Payment",
                    image: "/logo192.png",
                    order_id: orderData.id,
                    handler: async function (response) {
                        try {
                            await paymentService.verifyPayment({
                                ...response,
                                rideId: ride._id,
                                amount: ride.price,
                                method: method // 'card' or 'upi'
                            });
                            completeSuccess();
                        } catch (verifyError) {
                            setError('Payment Verification Failed');
                            setStep('select');
                        }
                    },
                    prefill: {
                        name: "Student User", // We could pass actual user name here if available
                        email: "student@example.com",
                        contact: "9999999999"
                    },
                    theme: {
                        color: "#6366f1"
                    }
                };

                const rzp1 = new window.Razorpay(options);
                rzp1.on('payment.failed', function (response) {
                    setError(response.error.description);
                    setStep('select');
                });
                rzp1.open();
            }

        } catch (err) {
            console.error(err);
            setError('Payment Initiation Failed. Try again.');
            setStep('select');
        }
    };

    const completeSuccess = () => {
        setStep('success');
        setTimeout(() => {
            onSuccess();
            onClose();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative transform transition-all scale-100">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition z-10"
                >
                    ✕
                </button>

                {step === 'processing' ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                        <h3 className="text-xl font-bold text-gray-800">Processing Payment</h3>
                        <p className="text-gray-500 text-sm mt-2">Please wait, contacting bank...</p>
                    </div>
                ) : step === 'success' ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Payment Successful!</h3>
                        <p className="text-gray-500 text-sm mt-2">Ride booked & paid.</p>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="text-center mb-6">
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Amount</p>
                            <h2 className="text-4xl font-bold text-gray-900 mt-1">₹{ride.price}</h2>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium text-center mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            <label
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'card' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                                onClick={() => setMethod('card')}
                            >
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">💳</div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">Credit / Debit Card</p>
                                    <p className="text-xs text-gray-500">Visa, Mastercard</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === 'card' ? 'border-indigo-500' : 'border-gray-300'}`}>
                                    {method === 'card' && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                </div>
                            </label>

                            <label
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'upi' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                                onClick={() => setMethod('upi')}
                            >
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">📱</div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">UPI / Wallet</p>
                                    <p className="text-xs text-gray-500">GPay, PhonePe, Paytm</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === 'upi' ? 'border-indigo-500' : 'border-gray-300'}`}>
                                    {method === 'upi' && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                </div>
                            </label>

                            <label
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'cash' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                                onClick={() => setMethod('cash')}
                            >
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">💵</div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">Cash on Pickup</p>
                                    <p className="text-xs text-gray-500">Pay directly to driver</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === 'cash' ? 'border-indigo-500' : 'border-gray-300'}`}>
                                    {method === 'cash' && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={handlePay}
                            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:opacity-90 transition shadow-xl flex items-center justify-center gap-2"
                        >
                            <span>Pay ₹{ride.price}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
