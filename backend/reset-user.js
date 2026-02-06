const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function resetUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected');

        // Reset the driver verification for testing
        const result = await User.updateOne(
            { name: 'siri' },
            {
                $set: {
                    isDriver: false,
                    driverVerification: {
                        drivingLicense: {
                            number: '',
                            image: '',
                            isVerified: false
                        },
                        vehicle: {
                            number: '',
                            type: 'car',
                            model: '',
                            color: '',
                            registrationImage: '',
                            isVerified: false
                        },
                        status: 'not_started',
                        rejectionReason: ''
                    }
                }
            }
        );

        console.log('Reset result:', result);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Done');
    }
}

resetUser();
