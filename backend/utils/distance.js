const axios = require('axios');

// Calculate distance between two points using Haversine formula
// Returns distance in kilometers
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    // Apply a "Road Factor" of 1.3 to approximate actual driving distance vs air distance
    return d * 1.3;
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

// Estimate duration (assuming average city speed of 30km/h)
// Returns duration in minutes
const getEstimatedDuration = (distanceKm) => {
    const averageSpeedKmH = 30; // Hyderabad traffic assumption
    const timeHours = distanceKm / averageSpeedKmH;
    return Math.round(timeHours * 60);
};

// Fetch accurate Road Distance & Duration from OSRM (Open Source Routing Machine)
const getRoadRouting = async (lat1, lon1, lat2, lon2) => {
    try {
        // OSRM Public API (Free)
        // Format: {lon},{lat};{lon},{lat}
        const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

        const response = await axios.get(url, { timeout: 3000 }); // 3s timeout to avoid hanging

        if (response.data.code === 'Ok' && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            return {
                distanceKm: parseFloat((route.distance / 1000).toFixed(2)), // meters to km
                durationMin: Math.round(route.duration / 60), // seconds to minutes
                geometry: route.geometry, // Return GeoJSON geometry
                source: 'OSRM (Accurate)'
            };
        }
    } catch (error) {
        console.error("Routing API Failed (Falling back to Haversine):", error.message);
    }

    // Fallback if API fails
    const dist = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
    return {
        distanceKm: parseFloat(dist.toFixed(2)),
        durationMin: getEstimatedDuration(dist),
        source: 'Haversine (Estimated)'
    };
};

module.exports = {
    getDistanceFromLatLonInKm,
    getEstimatedDuration,
    getRoadRouting
};
