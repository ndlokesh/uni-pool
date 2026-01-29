import React, { useEffect, useState } from 'react';
import rideService from '../services/rideService';
import authService from '../services/authService';
import paymentService from '../services/paymentService';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import PaymentModal from '../components/PaymentModal';
import ReviewModal from '../components/ReviewModal';

const MyRides = () => {
    const [myRides, setMyRides] = useState({ created: [], joined: [] });
    const [selectedRide, setSelectedRide] = useState(null);
    const [payments, setPayments] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const currentUser = authService.getCurrentUser();

    const fetchMyRides = async () => {
        try {
            const allRides = await rideService.getRides();

            // Filter Created Rides
            const created = allRides.filter(ride => ride.createdBy?._id === currentUser.id || ride.createdBy === currentUser.id);

            // Filter Joined Rides (Accepted OR Pending)
            const joined = allRides.filter(ride => {
                const isAccepted = ride.riders.some(r => r._id === currentUser.id);
                const isPending = ride.pendingRiders.some(r => r._id === currentUser.id);
                return isAccepted || isPending;
            });

            setMyRides({ created, joined });

            const myPayments = await paymentService.getMyPayments();
            setPayments(myPayments);
        } catch (err) {
            console.error("Failed to fetch data", err);
        }
    };

    useEffect(() => {
        if (currentUser?.id) {
            fetchMyRides();
        }
    }, [currentUser?.id]);

    const isPaid = (rideId) => {
        return payments.some(p => p.ride === rideId && p.status === 'completed');
    };

    const handlePaymentSuccess = async () => {
        try {
            const myPayments = await paymentService.getMyPayments();
            setPayments(myPayments);
        } catch (error) {
            console.error("Failed to refresh payments");
        }
    };

    const handleRespond = async (rideId, riderId, action) => {
        try {
            await rideService.respondToRequest(rideId, riderId, action);
            // Refresh data to show updated status
            fetchMyRides();
        } catch (error) {
            alert(error.response?.data?.message || "Action failed");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 pt-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">My Rides</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Rides List Section */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Driving */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <span className="bg-black text-white p-1 rounded-lg text-sm">Driving</span>
                                Rides you created
                            </h2>
                            {myRides.created.length > 0 ? (
                                <div className="grid gap-4">
                                    {myRides.created.map(ride => (
                                        <div
                                            key={ride._id}
                                            onClick={() => setSelectedRide(ride)}
                                            className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-lg ${selectedRide?._id === ride._id ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                                                        {ride.source}
                                                        <span className="text-gray-400">→</span>
                                                        {ride.destination}
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {new Date(ride.date).toLocaleDateString()} at {ride.time}
                                                    </p>
                                                </div>
                                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                                    ₹{ride.driverEarnings} Earned
                                                </div>
                                            </div>

                                            {/* Requests Section */}
                                            {ride.pendingRiders && ride.pendingRiders.length > 0 && (
                                                <div className="mt-4 bg-yellow-50 border border-yellow-100 p-3 rounded-xl animate-in fade-in">
                                                    <p className="text-xs font-bold text-yellow-800 uppercase mb-2">Ride Requests ({ride.pendingRiders.length})</p>
                                                    <div className="space-y-2">
                                                        {ride.pendingRiders.map(request => (
                                                            <div key={request._id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-yellow-100 shadow-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                                        {request.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-medium text-gray-700 block">{request.name}</span>
                                                                        <span className="text-xs text-gray-500">{request.phoneNumber}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleRespond(ride._id, request._id, 'accept'); }}
                                                                        className="p-1 px-3 bg-black text-white text-xs rounded-md font-bold hover:bg-gray-800"
                                                                    >
                                                                        Accept
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleRespond(ride._id, request._id, 'reject'); }}
                                                                        className="p-1 px-3 bg-gray-200 text-gray-600 text-xs rounded-md font-bold hover:bg-gray-300"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Accepted Riders Contact Info */}
                                            {ride.riders && ride.riders.length > 0 && (
                                                <div className="mt-4 border-t border-gray-100 pt-3">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Accepted Riders</p>
                                                    <div className="space-y-1">
                                                        {ride.riders.map(rider => (
                                                            <div key={rider._id} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                                <span className="font-medium">{rider.name}</span>
                                                                <span className="flex items-center gap-1">
                                                                    📞 {rider.phoneNumber || "N/A"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    👥 {ride.riders.length} / {ride.availableSeats + ride.riders.length} Accepted
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    💬 Chat
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm italic">You haven't posted any rides yet.</p>
                            )}
                        </div>

                        {/* Riding */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <span className="bg-blue-600 text-white p-1 rounded-lg text-sm">Riding</span>
                                Rides you joined
                            </h2>
                            {myRides.joined.length > 0 ? (
                                <div className="grid gap-4">
                                    {myRides.joined.map(ride => {
                                        const isPending = ride.pendingRiders.some(r => r._id === currentUser.id);
                                        const paid = isPaid(ride._id);

                                        return (
                                            <div
                                                key={ride._id}
                                                onClick={() => setSelectedRide(ride)}
                                                className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-lg ${selectedRide?._id === ride._id ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                                                            {ride.source}
                                                            <span className="text-gray-400">→</span>
                                                            {ride.destination}
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {new Date(ride.date).toLocaleDateString()} at {ride.time}
                                                        </p>
                                                        {/* Show Driver Phone if Accepted */}
                                                        {!isPending && (
                                                            <p className="text-sm font-bold text-gray-700 mt-2 bg-gray-50 p-2 rounded-lg inline-block">
                                                                Driver: {ride.createdBy.name} • 📞 {ride.createdBy.phoneNumber || "N/A"}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {isPending ? (
                                                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                                            WAITING FOR APPROVAL
                                                        </div>
                                                    ) : (
                                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {paid ? 'PAID' : 'PAYMENT PENDING'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 flex items-center justify-between">
                                                    <div className="flex gap-4 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1">🚗 {ride.vehicleType}</span>
                                                        <span className="flex items-center gap-1">💬 Chat</span>
                                                    </div>

                                                    {!isPending && !paid && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedRide(ride);
                                                                setShowPaymentModal(true);
                                                            }}
                                                            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-md"
                                                        >
                                                            Pay ₹{ride.price}
                                                        </button>
                                                    )}

                                                    {!isPending && paid && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedRide(ride);
                                                                setShowReviewModal(true);
                                                            }}
                                                            className="bg-white border text-gray-600 border-gray-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition"
                                                        >
                                                            Rate Driver
                                                        </button>
                                                    )}

                                                    {isPending && (
                                                        <button disabled className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-bold cursor-not-allowed">
                                                            Request Sent
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm italic">You haven't joined any rides yet.</p>
                            )}
                        </div>

                    </div>

                    {/* Chat Section (Sticky) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            {selectedRide ? (
                                <div className="animate-in fade-in slide-in-from-right-4">
                                    <ChatBox
                                        rideId={selectedRide._id}
                                        rideTitle={`${selectedRide.source} to ${selectedRide.destination}`}
                                    />
                                    <div className="text-center mt-4 text-xs text-gray-400">
                                        Chatting with {selectedRide.riders.length} other riders & driver
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[500px] bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="font-bold">Select a ride to start chatting</p>
                                    <p className="text-sm mt-2">Connect with your driver and co-passengers</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedRide && (
                <PaymentModal
                    ride={selectedRide}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}

            {/* Review Modal */}
            {showReviewModal && selectedRide && (
                <ReviewModal
                    ride={selectedRide}
                    onClose={() => setShowReviewModal(false)}
                />
            )}
        </div>
    );
};

export default MyRides;
