import API from './api';

const addReview = async (data) => {
    const response = await API.post('/reviews', data);
    return response.data;
};

const getUserReviews = async (userId) => {
    const response = await API.get(`/reviews/${userId}`);
    return response.data;
};

const reviewService = {
    addReview,
    getUserReviews
};

export default reviewService;
