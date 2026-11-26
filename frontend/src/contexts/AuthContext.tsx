import { useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { AuthResponse, RegisterPendingVerificationResponse, UserRole } from '../types/api';
import {
    clearStoredSession,
    getStoredToken,
    loadStoredUser,
    saveStoredSession,
    type StoredUser,
} from '../utils/authStorage';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '../constants/legal';
import { AuthContext, type RegisterClinicPayload } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<StoredUser | null>(() => loadStoredUser());

    function saveSession(data: AuthResponse): UserRole {
        const userData: StoredUser = {
            name: data.name,
            email: data.email,
            role: data.role,
        };
        saveStoredSession(data.token, userData);
        setUser(userData);
        return data.role;
    }

    async function login(email: string, password: string): Promise<UserRole> {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        return saveSession(data);
    }

    async function register(
        name: string,
        email: string,
        password: string,
        role: 'PSYCHOLOGIST' | 'PATIENT',
        cpf?: string
    ): Promise<RegisterPendingVerificationResponse> {
        const { data } = await api.post<RegisterPendingVerificationResponse>('/auth/register', {
            name,
            email,
            password,
            role,
            ...(cpf ? { cpf } : {}),
            acceptedTerms: true,
            termsVersion: CURRENT_TERMS_VERSION,
            privacyVersion: CURRENT_PRIVACY_VERSION,
        });
        return data;
    }

    async function registerClinic(
        payload: RegisterClinicPayload
    ): Promise<RegisterPendingVerificationResponse> {
        const { data } = await api.post<RegisterPendingVerificationResponse>(
            '/auth/register-clinic',
            {
                ...payload,
                acceptedTerms: payload.acceptedTerms ?? true,
                termsVersion: payload.termsVersion ?? CURRENT_TERMS_VERSION,
                privacyVersion: payload.privacyVersion ?? CURRENT_PRIVACY_VERSION,
            }
        );
        return data;
    }

    function logout() {
        clearStoredSession();
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user && !!getStoredToken(),
                login,
                register,
                registerClinic,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
