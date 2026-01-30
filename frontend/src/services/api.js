import axios from 'axios';

const API = axios.create({
    // 1. If REACT_APP_API_URL is set (in .env or Vercel), use it.
    // 2. Otherwise use '/api' (relative path), which works with:
    //    - "proxy": "http://localhost:5000" in package.json (Local Dev)
    //    - Vercel Rewrites (if configured)
    baseURL: process.env.REACT_APP_API_URL || '/api',
});

// Add a request interceptor to include the token
API.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

// Add a response interceptor to handle 401 Auth errors globally
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid user (e.g. server restart with in-memory DB)
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default API;
