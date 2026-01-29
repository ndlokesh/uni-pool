const calculateFare = (distanceKm, durationMin, vehicleType) => {
    let baseFare = 0;
    let costPerKm = 0;
    let costPerMin = 0;
    let bookingFee = 0;
    let minimumFare = 0;

    // Uber India Approximate Rates (2025 Estimates for Metro Cities)
    if (vehicleType === 'Bike') {
        // Uber Moto
        baseFare = 25;       // Base fare
        costPerKm = 8;       // ₹8 per km
        costPerMin = 1;      // ₹1 per min
        bookingFee = 0;      // Included in base usually, but we can separate
        minimumFare = 30;    // Minimum ride cost
    } else {
        // Uber Go / Mini (Car)
        baseFare = 50;       // Base fare
        costPerKm = 15;      // ₹15 per km
        costPerMin = 2;      // ₹2 per min
        bookingFee = 0;
        minimumFare = 85;    // Minimum ride cost
    }

    // Basic Calculation
    let distanceCost = distanceKm * costPerKm;
    let timeCost = durationMin * costPerMin;

    let totalFare = baseFare + distanceCost + timeCost + bookingFee;

    // Apply Minimum Fare Logic
    if (totalFare < minimumFare) {
        totalFare = minimumFare;
    }

    const riderCost = Math.round(totalFare);

    // Platform Commission (e.g., 20% standard for Uber)
    const platformFee = Math.round(riderCost * 0.20);
    const driverEarnings = riderCost - platformFee;

    return {
        riderCost,
        driverEarnings,
        breakdown: {
            baseFare,
            distanceFare: Math.round(distanceCost),
            timeFare: Math.round(timeCost),
            minimumFareApplied: totalFare === minimumFare,
            platformFee
        }
    };
};

module.exports = { calculateFare };
