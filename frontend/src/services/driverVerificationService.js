import API from './api';

// Get verification status
export const getVerificationStatus = async () => {
    const response = await API.get('/driver-verification/status');
    return response.data;
};

// Upload driving license
export const uploadDrivingLicense = async (licenseData) => {
    const response = await API.post('/driver-verification/license', licenseData);
    return response.data;
};

// Upload vehicle details
export const uploadVehicleDetails = async (vehicleData) => {
    const response = await API.post('/driver-verification/vehicle', vehicleData);
    return response.data;
};

// Get driver profile
export const getDriverProfile = async () => {
    const response = await API.get('/driver-verification/profile');
    return response.data;
};

// Convert file to base64
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

export default {
    getVerificationStatus,
    uploadDrivingLicense,
    uploadVehicleDetails,
    getDriverProfile,
    fileToBase64
};
