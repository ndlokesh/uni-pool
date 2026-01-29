import API from './api';

const getNotifications = async () => {
    const response = await API.get('/notifications');
    return response.data;
};

const markAsRead = async (id) => {
    const response = await API.put(`/notifications/${id}/read`);
    return response.data;
};

const markAllAsRead = async () => {
    const response = await API.put('/notifications/mark-all-read');
    return response.data;
};

const notificationService = {
    getNotifications,
    markAsRead,
    markAllAsRead
};

export default notificationService;
