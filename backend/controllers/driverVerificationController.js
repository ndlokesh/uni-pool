const User = require('../models/User');

// Get driver verification status
exports.getVerificationStatus = async (req, res) => {
    try {
        // Debug log
        const userId = req.user?._id || req.user?.id;
        console.log('getVerificationStatus called for user:', userId);

        const user = await User.findById(userId).select('name email isDriver driverVerification');

        if (!user) {
            console.log('User not found:', req.user?.id);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('User found:', user.name, 'isDriver:', user.isDriver);

        res.json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                isDriver: user.isDriver || false,
                verification: user.driverVerification || {
                    status: 'not_started',
                    drivingLicense: { isVerified: false },
                    vehicle: { isVerified: false }
                }
            }
        });
    } catch (error) {
        console.error('Error getting verification status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Upload driving license
exports.uploadDrivingLicense = async (req, res) => {
    try {
        const { licenseNumber, licenseImage, expiryDate } = req.body;

        console.log('uploadDrivingLicense called');

        if (!licenseNumber || !licenseImage) {
            return res.status(400).json({ message: 'License number and image are required' });
        }

        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize driverVerification if not exists
        if (!user.driverVerification) {
            user.driverVerification = {
                drivingLicense: {},
                vehicle: {},
                status: 'not_started'
            };
        }

        // Update driving license info
        user.driverVerification.drivingLicense = {
            number: licenseNumber,
            image: licenseImage,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            isVerified: false,
            uploadedAt: new Date()
        };

        // Auto-approve for demo purposes
        const isValidLicense = /^[A-Za-z0-9]{10,20}$/.test(licenseNumber.replace(/\s|-/g, ''));

        if (isValidLicense) {
            user.driverVerification.drivingLicense.isVerified = true;
            user.driverVerification.status = 'license_approved';
        } else {
            user.driverVerification.status = 'license_pending';
        }

        user.isDriver = true;

        // Mark nested path as modified for Mongoose
        user.markModified('driverVerification');

        await user.save();

        console.log('License saved successfully');

        res.json({
            success: true,
            message: isValidLicense
                ? 'Driving license verified successfully! You can now add your vehicle details.'
                : 'License uploaded and is pending verification.',
            data: {
                drivingLicense: {
                    number: user.driverVerification.drivingLicense.number,
                    isVerified: user.driverVerification.drivingLicense.isVerified,
                    expiryDate: user.driverVerification.drivingLicense.expiryDate
                },
                status: user.driverVerification.status
            }
        });
    } catch (error) {
        console.error('Error uploading license:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Upload vehicle details
exports.uploadVehicleDetails = async (req, res) => {
    try {
        const { vehicleNumber, vehicleType, vehicleModel, vehicleColor, registrationImage } = req.body;

        if (!vehicleNumber) {
            return res.status(400).json({ message: 'Vehicle number is required' });
        }

        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if license is approved first
        if (!user.driverVerification?.drivingLicense?.isVerified) {
            return res.status(400).json({
                message: 'Please upload and get your driving license verified first'
            });
        }

        // Update vehicle info
        user.driverVerification.vehicle = {
            number: vehicleNumber.toUpperCase(),
            type: vehicleType || 'car',
            model: vehicleModel || '',
            color: vehicleColor || '',
            registrationImage: registrationImage || '',
            isVerified: false,
            uploadedAt: new Date()
        };

        // Auto-verify vehicle number format (Indian format: XX00XX0000)
        const isValidVehicle = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/.test(
            vehicleNumber.replace(/\s|-/g, '').toUpperCase()
        );

        if (isValidVehicle) {
            user.driverVerification.vehicle.isVerified = true;
            user.driverVerification.status = 'fully_verified';
            user.driverVerification.verifiedAt = new Date();
        } else {
            user.driverVerification.status = 'vehicle_pending';
        }

        // Mark nested path as modified for Mongoose
        user.markModified('driverVerification');

        await user.save();

        res.json({
            success: true,
            message: isValidVehicle
                ? '🎉 Congratulations! Your driver profile is now fully verified. You can start offering rides!'
                : 'Vehicle details uploaded and pending verification.',
            data: {
                vehicle: {
                    number: user.driverVerification.vehicle.number,
                    type: user.driverVerification.vehicle.type,
                    model: user.driverVerification.vehicle.model,
                    color: user.driverVerification.vehicle.color,
                    isVerified: user.driverVerification.vehicle.isVerified
                },
                status: user.driverVerification.status,
                isFullyVerified: user.driverVerification.status === 'fully_verified'
            }
        });
    } catch (error) {
        console.error('Error uploading vehicle details:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get full driver profile
exports.getDriverProfile = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isDriver) {
            return res.status(400).json({ message: 'User is not registered as a driver' });
        }

        const isFullyVerified = user.driverVerification?.status === 'fully_verified';

        res.json({
            success: true,
            data: {
                profile: {
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    collegeName: user.collegeName,
                    studentNumber: user.studentNumber,
                    averageRating: user.averageRating,
                    totalRatings: user.totalRatings,
                    memberSince: user.createdAt
                },
                verification: {
                    isFullyVerified,
                    status: user.driverVerification?.status || 'not_started',
                    license: {
                        number: user.driverVerification?.drivingLicense?.number
                            ? `${user.driverVerification.drivingLicense.number.slice(0, 4)}****${user.driverVerification.drivingLicense.number.slice(-4)}`
                            : null,
                        isVerified: user.driverVerification?.drivingLicense?.isVerified || false,
                        expiryDate: user.driverVerification?.drivingLicense?.expiryDate
                    },
                    vehicle: {
                        number: user.driverVerification?.vehicle?.number || null,
                        type: user.driverVerification?.vehicle?.type || null,
                        model: user.driverVerification?.vehicle?.model || null,
                        color: user.driverVerification?.vehicle?.color || null,
                        isVerified: user.driverVerification?.vehicle?.isVerified || false
                    },
                    verifiedAt: user.driverVerification?.verifiedAt
                }
            }
        });
    } catch (error) {
        console.error('Error getting driver profile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
