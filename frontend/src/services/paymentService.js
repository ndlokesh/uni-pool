import API from './api';

const createOrder = async (amount) => {
    const response = await API.post('/payments/create-order', { amount });
    return response.data;
};

const verifyPayment = async (data) => {
    const response = await API.post('/payments/verify', data);
    return response.data;
};

const recordCashPayment = async (data) => {
    const response = await API.post('/payments/cash', data);
    return response.data;
};

const getMyPayments = async () => {
    const response = await API.get('/payments/my-payments');
    return response.data;
};

const paymentService = {
    createOrder,
    verifyPayment,
    recordCashPayment,
    getMyPayments
};

export default paymentService;
