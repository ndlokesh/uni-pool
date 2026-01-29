const axios = require('axios');

async function testGetRides() {
    try {
        const uniqueEmail = `fetcher_${Date.now()}@test.com`;
        console.log(`Registering as ${uniqueEmail}...`);

        const regRes = await axios.post('http://localhost:5000/api/register', {
            name: 'Test Fetcher',
            email: uniqueEmail,
            password: 'password123',
            studentNumber: '999',
            collegeName: 'Test College',
            phoneNumber: '1112223333'
        });

        const token = regRes.data.token;
        console.log("Registration Successful, Token obtained.");

        // GET RIDES
        const ridesRes = await axios.get('http://localhost:5000/api/rides', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Rides Count:", ridesRes.data.length);
        if (ridesRes.data.length > 0) {
            const r = ridesRes.data[0];
            console.log("Ride Source:", r.source);
            console.log("Ride CreatedBy:", JSON.stringify(r.createdBy, null, 2));
            console.log("Pending Riders:", JSON.stringify(r.pendingRiders, null, 2));
        } else {
            console.log("No rides found.");
        }

    } catch (error) {
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("Response Status:", error.response.status);
            console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

testGetRides();
