import axios from 'axios';
import { clearStoredSession, getStoredToken } from '../utils/authStorage';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

let isRedirectingToLogin = false;

api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl: string = error.config?.url || '';
        const isAuthEndpoint = requestUrl.includes('/auth/');

        if (status === 401 && !isAuthEndpoint) {
            clearStoredSession();
            if (
                !isRedirectingToLogin &&
                window.location.pathname !== '/login' &&
                window.location.pathname !== '/register'
            ) {
                isRedirectingToLogin = true;
                window.location.replace('/login');
            }
        }
        return Promise.reject(error);
    }
);
