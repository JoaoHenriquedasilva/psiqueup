import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearLegacyAuthStorage } from '../utils/authStorage';

declare module 'axios' {
    export interface AxiosRequestConfig {
        _retry?: boolean;
        _skipAuthRedirect?: boolean;
    }
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    timeout: 15000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

const NO_REFRESH_AUTH_PATHS = [
    '/auth/login',
    '/auth/refresh',
    '/auth/logout',
    '/auth/register',
    '/auth/register-clinic',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/auth/forgot-password',
    '/auth/reset-password',
];

const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/privacy',
    '/terms',
];

let refreshPromise: Promise<void> | null = null;
let isRedirectingToLogin = false;
let sessionExpiredHandler: (() => void) | null = null;

/** Registra um callback global para limpar o estado de autenticação quando o refresh falhar. */
export function registerSessionExpiredHandler(handler: (() => void) | null): void {
    sessionExpiredHandler = handler;
}

function shouldSkipRefresh(url: string): boolean {
    return NO_REFRESH_AUTH_PATHS.some((path) => url.includes(path));
}

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function handleSessionExpired(skipRedirect?: boolean): void {
    clearLegacyAuthStorage();
    sessionExpiredHandler?.();

    if (
        !skipRedirect &&
        !isRedirectingToLogin &&
        !isPublicRoute(window.location.pathname)
    ) {
        isRedirectingToLogin = true;
        window.location.replace('/login?expired=1');
    }
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const originalConfig = error.config as InternalAxiosRequestConfig | undefined;
        const requestUrl = originalConfig?.url || '';

        if (status !== 401 || !originalConfig) {
            return Promise.reject(error);
        }

        if (shouldSkipRefresh(requestUrl)) {
            return Promise.reject(error);
        }

        if (originalConfig._retry) {
            handleSessionExpired(originalConfig._skipAuthRedirect);
            return Promise.reject(error);
        }

        try {
            if (!refreshPromise) {
                refreshPromise = api
                    .post('/auth/refresh')
                    .then(() => undefined)
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            await refreshPromise;
            originalConfig._retry = true;
            return api(originalConfig);
        } catch (refreshError) {
            handleSessionExpired(originalConfig._skipAuthRedirect);
            return Promise.reject(refreshError);
        }
    }
);
