const axios = require('axios');

async function testGetRides() {
    try {
        // Authenticate first to get a token (assuming auth is needed for getRides)
        // Actually, looking at routes, it might be protected.
        // Let's try to login first.

        // LOGIN
        const loginRes = await axios.post('http://localhost:5001/api/login', {
            email: 'driver@test.com', // Using the user we tried to create before, or a known user
            password: 'password123'
        }).catch(err => ({ status: err.response?.status }));

        let token = '';
        if (loginRes.data && loginRes.data.token) {
            console.log("Login Successful");
            token = loginRes.data.token;
        } else {
            // Try registering if login fails
            console.log("Login failed, trying register...");
            const regRes = await axios.post('http://localhost:5001/api/register', {
                name: 'Test Fetcher',
                email: 'fetcher@test.com',
                password: 'password123',
                studentNumber: '999',
                collegeName: 'Test College',
                phoneNumber: '1112223333'
            });
            token = regRes.data.token;
            console.log("Registration Successful");
        }

        // GET RIDES
        const ridesRes = await axios.get('http://localhost:5001/api/rides', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Rides Count:", ridesRes.data.length);
        if (ridesRes.data.length > 0) {
            console.log("First Ride Sample:", JSON.stringify(ridesRes.data[0], null, 2));
        } else {
            console.log("No rides found.");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.error("Response:", error.response.data);
    }
}

testGetRides();
