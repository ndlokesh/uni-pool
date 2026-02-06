import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import driverVerificationService from '../services/driverVerificationService';

const DriverVerification = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [verificationData, setVerificationData] = useState(null);
    const [isFullyVerified, setIsFullyVerified] = useState(false);

    // Form states
    const [licenseForm, setLicenseForm] = useState({
        licenseNumber: '',
        licenseImage: null,
        licenseImagePreview: null,
        expiryDate: ''
    });

    const [vehicleForm, setVehicleForm] = useState({
        vehicleNumber: '',
        vehicleType: 'car',
        vehicleModel: '',
        vehicleColor: '',
        registrationImage: null,
        registrationImagePreview: null
    });

    // Fetch current verification status
    const fetchVerificationStatus = useCallback(async () => {
        try {
            setInitialLoading(true);
            setError(''); // Clear previous errors
            const response = await driverVerificationService.getVerificationStatus();
            if (response.success) {
                setVerificationData(response.data);
                const status = response.data.verification?.status;

                // Set current step based on verification status
                if (status === 'fully_verified') {
                    setIsFullyVerified(true);
                    setCurrentStep(4); // Profile view
                } else if (status === 'license_approved' || status === 'vehicle_pending') {
                    setCurrentStep(2); // Vehicle upload
                } else if (status === 'license_pending') {
                    setCurrentStep(1); // Still on license
                } else {
                    setCurrentStep(1); // Start from beginning
                }
            }
        } catch (err) {
            console.error('Error fetching verification status:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load verification status';
            setError(errorMessage);
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVerificationStatus();
    }, [fetchVerificationStatus]);

    // Handle license image upload
    const handleLicenseImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should be less than 5MB');
                return;
            }
            try {
                const base64 = await driverVerificationService.fileToBase64(file);
                setLicenseForm(prev => ({
                    ...prev,
                    licenseImage: base64,
                    licenseImagePreview: URL.createObjectURL(file)
                }));
                setError('');
            } catch (err) {
                setError('Failed to process image');
            }
        }
    };

    // Handle vehicle registration image upload
    const handleVehicleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should be less than 5MB');
                return;
            }
            try {
                const base64 = await driverVerificationService.fileToBase64(file);
                setVehicleForm(prev => ({
                    ...prev,
                    registrationImage: base64,
                    registrationImagePreview: URL.createObjectURL(file)
                }));
                setError('');
            } catch (err) {
                setError('Failed to process image');
            }
        }
    };

    // Submit license
    const handleLicenseSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!licenseForm.licenseNumber) {
            setError('Please enter your driving license number');
            return;
        }
        if (!licenseForm.licenseImage) {
            setError('Please upload your driving license image');
            return;
        }

        try {
            setLoading(true);
            const response = await driverVerificationService.uploadDrivingLicense({
                licenseNumber: licenseForm.licenseNumber,
                licenseImage: licenseForm.licenseImage,
                expiryDate: licenseForm.expiryDate
            });

            if (response.success) {
                setSuccess(response.message);
                if (response.data.status === 'license_approved') {
                    setTimeout(() => {
                        setCurrentStep(2);
                        setSuccess('');
                    }, 2000);
                }
            }
        } catch (err) {
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to upload license';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Submit vehicle details
    const handleVehicleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!vehicleForm.vehicleNumber) {
            setError('Please enter your vehicle number');
            return;
        }

        try {
            setLoading(true);
            console.log('Submitting vehicle details:', vehicleForm);

            const response = await driverVerificationService.uploadVehicleDetails({
                vehicleNumber: vehicleForm.vehicleNumber,
                vehicleType: vehicleForm.vehicleType,
                vehicleModel: vehicleForm.vehicleModel,
                vehicleColor: vehicleForm.vehicleColor,
                registrationImage: vehicleForm.registrationImage
            });

            console.log('Vehicle response:', response);

            if (response.success) {
                setSuccess(response.message);
                // Move to final step regardless of full verification
                // (For demo, we show verified screen; in production, might show pending status)
                setTimeout(() => {
                    if (response.data.isFullyVerified) {
                        setIsFullyVerified(true);
                    }
                    setCurrentStep(4);
                    fetchVerificationStatus(); // Refresh data
                }, 2000);
            }
        } catch (err) {
            console.error('Vehicle submit error:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to upload vehicle details';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Step indicator component
    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((step, index) => (
                <React.Fragment key={step}>
                    <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                        transition-all duration-300
                        ${currentStep >= step
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-gray-200 text-gray-500'
                        }
                        ${currentStep === step ? 'ring-4 ring-indigo-200 scale-110' : ''}
                    `}>
                        {currentStep > step ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : step}
                    </div>
                    {index < 2 && (
                        <div className={`w-20 h-1 mx-2 rounded-full transition-all duration-300 ${currentStep > step ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gray-200'
                            }`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    // Step labels
    const stepLabels = ['Upload License', 'Vehicle Details', 'Verification Complete'];

    // Loading state
    if (initialLoading) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="flex items-center justify-center h-[70vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <div className="container mx-auto px-6 py-8 max-w-4xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                        Driver Verification
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Complete the verification process to start offering rides
                    </p>
                </motion.div>

                {/* Step Indicator */}
                {!isFullyVerified && <StepIndicator />}

                {/* Step Labels */}
                {!isFullyVerified && (
                    <div className="flex justify-center gap-8 mb-8 text-sm">
                        {stepLabels.map((label, index) => (
                            <span key={label} className={`${currentStep === index + 1
                                ? 'text-indigo-600 font-semibold'
                                : 'text-gray-400'
                                }`}>
                                {label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Error/Success Messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 flex items-center gap-3"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl mb-6 flex items-center gap-3"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {success}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    {/* Step 1: License Upload */}
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/50"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Upload Driving License</h2>
                                    <p className="text-gray-500">Verify your eligibility to drive</p>
                                </div>
                            </div>

                            <form onSubmit={handleLicenseSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        License Number *
                                    </label>
                                    <input
                                        type="text"
                                        value={licenseForm.licenseNumber}
                                        onChange={(e) => setLicenseForm(prev => ({ ...prev, licenseNumber: e.target.value.toUpperCase() }))}
                                        placeholder="Enter your driving license number"
                                        className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        License Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        value={licenseForm.expiryDate}
                                        onChange={(e) => setLicenseForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload License Image *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLicenseImageChange}
                                            className="hidden"
                                            id="license-upload"
                                        />
                                        <label
                                            htmlFor="license-upload"
                                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all"
                                        >
                                            {licenseForm.licenseImagePreview ? (
                                                <img
                                                    src={licenseForm.licenseImagePreview}
                                                    alt="License preview"
                                                    className="max-h-44 object-contain rounded-xl"
                                                />
                                            ) : (
                                                <>
                                                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-gray-500">Click to upload license image</span>
                                                    <span className="text-gray-400 text-sm mt-1">PNG, JPG up to 5MB</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            Verify License
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* Step 2: Vehicle Details */}
                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/50"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Vehicle Details</h2>
                                    <p className="text-gray-500">Add the vehicle you'll use for rides</p>
                                </div>
                            </div>

                            <form onSubmit={handleVehicleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Vehicle Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={vehicleForm.vehicleNumber}
                                            onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                                            placeholder="e.g., KA01AB1234"
                                            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Vehicle Type
                                        </label>
                                        <select
                                            value={vehicleForm.vehicleType}
                                            onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                                            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-lg"
                                        >
                                            <option value="car">🚗 Car</option>
                                            <option value="bike">🏍️ Bike</option>
                                            <option value="auto">🛺 Auto</option>
                                            <option value="other">🚙 Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Vehicle Model
                                        </label>
                                        <input
                                            type="text"
                                            value={vehicleForm.vehicleModel}
                                            onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleModel: e.target.value }))}
                                            placeholder="e.g., Swift, Activa"
                                            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Vehicle Color
                                        </label>
                                        <input
                                            type="text"
                                            value={vehicleForm.vehicleColor}
                                            onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleColor: e.target.value }))}
                                            placeholder="e.g., White, Red"
                                            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-lg"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Vehicle Registration Certificate (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleVehicleImageChange}
                                            className="hidden"
                                            id="vehicle-upload"
                                        />
                                        <label
                                            htmlFor="vehicle-upload"
                                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
                                        >
                                            {vehicleForm.registrationImagePreview ? (
                                                <img
                                                    src={vehicleForm.registrationImagePreview}
                                                    alt="Registration preview"
                                                    className="max-h-44 object-contain rounded-xl"
                                                />
                                            ) : (
                                                <>
                                                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="text-gray-500">Click to upload RC (optional)</span>
                                                    <span className="text-gray-400 text-sm mt-1">PNG, JPG up to 5MB</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        className="flex-1 bg-gray-100 text-gray-700 py-4 px-8 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 px-8 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                Complete Verification
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* Step 4: Verification Complete / Pending */}
                    {currentStep === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/50"
                        >
                            {/* Success Banner */}
                            <div className="text-center mb-8">
                                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg ${isFullyVerified
                                        ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-500/30'
                                        : 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-yellow-500/30'
                                    }`}>
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {isFullyVerified ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        )}
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                    {isFullyVerified ? 'Verification Complete! 🎉' : 'Verification Submitted! ⏳'}
                                </h2>
                                <p className="text-gray-600">
                                    {isFullyVerified
                                        ? 'You are now a verified driver on UniPool'
                                        : 'Your documents are under review. You can start offering rides once approved.'}
                                </p>
                            </div>

                            {/* Driver Profile Card */}
                            <div className={`rounded-2xl p-6 text-white mb-6 relative overflow-hidden ${isFullyVerified
                                    ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500'
                                    : 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500'
                                }`}>
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
                                            {verificationData?.name?.charAt(0)?.toUpperCase() || 'D'}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold">{verificationData?.name || 'Driver'}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isFullyVerified
                                                        ? 'bg-green-400/20 text-green-100 border-green-400/30'
                                                        : 'bg-yellow-400/20 text-yellow-100 border-yellow-400/30'
                                                    }`}>
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        {isFullyVerified ? (
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        ) : (
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                        )}
                                                    </svg>
                                                    {isFullyVerified ? 'Verified Driver' : 'Pending Review'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-sm">{verificationData?.email}</p>
                                </div>
                            </div>

                            {/* Verification Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Driving License</p>
                                            <p className="font-semibold text-gray-900">Verified ✓</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isFullyVerified ? 'bg-emerald-100' : 'bg-yellow-100'
                                            }`}>
                                            <svg className={`w-5 h-5 ${isFullyVerified ? 'text-emerald-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Vehicle</p>
                                            <p className={`font-semibold ${isFullyVerified ? 'text-gray-900' : 'text-yellow-600'}`}>
                                                {isFullyVerified ? (verificationData?.verification?.vehicle?.number || 'Verified ✓') : 'Pending Review ⏳'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => navigate(isFullyVerified ? '/create-ride' : '/dashboard')}
                                className={`w-full py-4 px-8 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 ${isFullyVerified
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40'
                                        : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-gray-500/30 hover:shadow-xl'
                                    }`}
                            >
                                <span className="text-xl">{isFullyVerified ? '🚗' : '🏠'}</span>
                                {isFullyVerified ? 'Start Offering Rides' : 'Go to Dashboard'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DriverVerification;
