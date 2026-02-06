const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./models/User');
require('dotenv').config();

const log = (msg) => {
    const line = `${new Date().toISOString()}: ${msg}\n`;
    fs.appendFileSync('test-output.txt', line);
    console.log(msg);
};

async function testVerification() {
    fs.writeFileSync('test-output.txt', '=== Test Started ===\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected to MongoDB');

        const user = await User.findOne({ name: 'siri' });
        if (!user) {
            log('User not found');
            return;
        }

        log(`User found: ${user.name}, ID: ${user._id}`);
        log(`isDriver: ${user.isDriver}`);
        log(`driverVerification exists: ${!!user.driverVerification}`);

        // Initialize if needed
        if (!user.driverVerification) {
            user.driverVerification = {
                drivingLicense: {},
                vehicle: {},
                status: 'not_started'
            };
        }

        // Update with test data
        user.driverVerification.drivingLicense = {
            number: 'TEST12345678',
            image: 'test-image-data',
            expiryDate: new Date('2029-12-31'),
            isVerified: true,
            uploadedAt: new Date()
        };
        user.driverVerification.status = 'license_approved';
        user.isDriver = true;

        user.markModified('driverVerification');

        log('Attempting save...');

        await user.save();
        log('SAVE SUCCESSFUL!');

    } catch (error) {
        log(`ERROR: ${error.name}`);
        log(`MESSAGE: ${error.message}`);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                log(`  Field "${key}": ${error.errors[key].message}`);
            });
        }
    } finally {
        await mongoose.disconnect();
        log('Disconnected');
    }
}

testVerification();
