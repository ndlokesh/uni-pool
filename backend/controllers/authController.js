const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, studentNumber, collegeName, phoneNumber, expectedGraduationYear, collegeIdCard } = req.body;

    if (!name || !email || !password || !studentNumber || !collegeName || !phoneNumber || !expectedGraduationYear) {
        return res.status(400).json({ message: 'Please add all fields including expected graduation year' });
    }

    // Validate graduation year - must be current year or future
    const currentYear = new Date().getFullYear();
    const gradYear = parseInt(expectedGraduationYear);

    if (isNaN(gradYear) || gradYear < currentYear) {
        return res.status(400).json({
            message: 'Registration denied: This app is only for current students. Your graduation year indicates you have already passed out.',
            reason: 'ALREADY_GRADUATED'
        });
    }

    // Validate college ID card is provided
    if (!collegeIdCard || !collegeIdCard.image) {
        return res.status(400).json({
            message: 'Please upload your college ID card for verification',
            reason: 'ID_CARD_REQUIRED'
        });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Check if student number is already registered
    const studentExists = await User.findOne({ studentNumber });
    if (studentExists) {
        return res.status(400).json({ message: 'This student number is already registered' });
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        studentNumber,
        collegeName,
        phoneNumber,
        expectedGraduationYear: gradYear,
        collegeIdCard: {
            image: collegeIdCard.image,
            uploadedAt: new Date(),
            isVerified: false // Will be verified by admin or auto-verification
        },
        isActiveStudent: true
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            studentNumber: user.studentNumber,
            collegeName: user.collegeName,
            phoneNumber: user.phoneNumber,
            expectedGraduationYear: user.expectedGraduationYear,
            isActiveStudent: user.isActiveStudent,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/login
// @access  Public
// @desc    Authenticate a user
// @route   POST /api/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        // Check Graduation Status
        const currentYear = new Date().getFullYear();

        // If account is already inactive or graduation year has passed
        if (user.expectedGraduationYear && currentYear > user.expectedGraduationYear) {
            // Auto-deactivate if not already done
            if (user.isActiveStudent) {
                user.isActiveStudent = false;
                await user.save();
            }

            return res.status(403).json({
                message: 'Account Deactivated: Your graduation year has passed. This app is only for current students.',
                reason: 'GRADUATED'
            });
        }

        if (user.isActiveStudent === false) {
            return res.status(403).json({
                message: 'Account Deactivated: You are no longer an active student.',
                reason: 'INACTIVE_STUDENT'
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            studentNumber: user.studentNumber,
            collegeName: user.collegeName,
            phoneNumber: user.phoneNumber,
            expectedGraduationYear: user.expectedGraduationYear,
            isActiveStudent: user.isActiveStudent,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

// @desc    Get user data
// @route   GET /api/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json(req.user);
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
