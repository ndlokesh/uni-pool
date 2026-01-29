import API from './api';

const processPayment = async (data) => {
    const response = await API.post('/payments', data);
    return response.data;
};

const getMyPayments = async () => {
    const response = await API.get('/payments/my-payments');
    return response.data;
};

const paymentService = {
    processPayment,
    getMyPayments
};

export default paymentService;
