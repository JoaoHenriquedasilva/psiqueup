import { useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { AuthResponse, UserRole } from '../types/api';
import {
    clearStoredSession,
    getStoredToken,
    loadStoredUser,
    saveStoredSession,
    type StoredUser,
} from '../utils/authStorage';
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
    ): Promise<UserRole> {
        const { data } = await api.post<AuthResponse>('/auth/register', {
            name,
            email,
            password,
            role,
            ...(cpf ? { cpf } : {}),
        });
        return saveSession(data);
    }

    async function registerClinic(payload: RegisterClinicPayload): Promise<UserRole> {
        const { data } = await api.post<AuthResponse>('/auth/register-clinic', payload);
        return saveSession(data);
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
