import API from './api';

const getMessages = async (rideId) => {
    const response = await API.get(`/messages/${rideId}`);
    return response.data;
};

const sendMessage = async (rideId, content) => {
    const response = await API.post('/messages', { rideId, content });
    return response.data;
};

const messageService = {
    getMessages,
    sendMessage
};

export default messageService;
