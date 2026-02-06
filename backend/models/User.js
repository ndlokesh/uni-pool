const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please fill a valid email address',
    ],
  },
  password: {
    type: String,
    required: true,
  },
  studentNumber: {
    type: String,
    required: true,
  },
  collegeName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  // College ID Card Verification
  collegeIdCard: {
    image: { type: String, default: '' }, // Base64 or URL of college ID card
    uploadedAt: { type: Date },
    isVerified: { type: Boolean, default: false }
  },
  expectedGraduationYear: {
    type: Number,
    required: true,
  },
  isActiveStudent: {
    type: Boolean,
    default: true
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  // Driver Verification Fields
  isDriver: {
    type: Boolean,
    default: false
  },
  driverVerification: {
    // Driving License Info
    drivingLicense: {
      number: { type: String, default: '' },
      image: { type: String, default: '' }, // Base64 or URL
      expiryDate: { type: Date },
      isVerified: { type: Boolean, default: false },
      uploadedAt: { type: Date }
    },
    // Vehicle Info
    vehicle: {
      number: { type: String, default: '' },
      type: { type: String, enum: ['car', 'bike', 'auto', 'other'], default: 'car' },
      model: { type: String, default: '' },
      color: { type: String, default: '' },
      registrationImage: { type: String, default: '' }, // Base64 or URL
      isVerified: { type: Boolean, default: false },
      uploadedAt: { type: Date }
    },
    // Overall Verification Status
    status: {
      type: String,
      enum: ['not_started', 'license_pending', 'license_approved', 'vehicle_pending', 'fully_verified', 'rejected'],
      default: 'not_started'
    },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, default: '' }
  }
}, { timestamps: true });

// Encrypt password using bcrypt (Mongoose 7+ compatible - no next callback)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return; // Just return, don't call next()
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // No need to call next() in Mongoose 7+
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
