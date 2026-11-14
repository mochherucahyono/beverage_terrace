import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});


api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('terasminuman_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Tangani respons token kedaluwarsa secara global
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('terasminuman_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
export const assetUrl = (path) => (path ? api.defaults.baseURL.replace(/\/api\/?$/, '') + path : '');