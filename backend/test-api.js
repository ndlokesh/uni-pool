const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

async function testAPI() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ name: 'siri' });
        if (user) {
            console.log('\n=== User Info ===');
            console.log('User ID:', user._id.toString());
            console.log('Name:', user.name);
            console.log('Email:', user.email);
            console.log('isDriver:', user.isDriver);

            console.log('\n=== Driver Verification ===');
            if (user.driverVerification) {
                console.log('Status:', user.driverVerification.status);
                console.log('License:', user.driverVerification.drivingLicense);
                console.log('Vehicle:', user.driverVerification.vehicle);
            } else {
                console.log('No driverVerification data yet');
            }

            // Create a test token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
            console.log('\n=== Test Token ===');
            console.log(token);
        } else {
            console.log('User "siri" not found');
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAPI();
