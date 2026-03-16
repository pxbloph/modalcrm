import axios from 'axios';

const resolvedBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined'
        ? `http://${window.location.hostname}:3500/api`
        : 'http://localhost:3500/api');

const api = axios.create({
    baseURL: resolvedBaseUrl,
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login only if we are in the browser
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
