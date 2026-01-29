import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

export const searchLocation = async (query) => {
    if (!query || query.length < 3) return [];

    try {
        const response = await axios.get(NOMINATIM_BASE_URL, {
            params: {
                q: query,
                format: 'json',
                addressdetails: 1,
                limit: 5
            }
        });
        return response.data;
    } catch (error) {
        console.error("Geocoding error:", error);
        return [];
    }
};
