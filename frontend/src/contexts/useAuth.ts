import { createContext, useContext } from 'react';
import type { UserRole } from '../types/api';
import type { StoredUser } from '../utils/authStorage';

export interface RegisterClinicPayload {
    clinicName: string;
    cnpj: string;
    adminName: string;
    adminEmail: string;
    password: string;
}

export interface AuthContextData {
    user: StoredUser | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<UserRole>;
    register: (
        name: string,
        email: string,
        password: string,
        role: 'PSYCHOLOGIST' | 'PATIENT'
    ) => Promise<UserRole>;
    registerClinic: (payload: RegisterClinicPayload) => Promise<UserRole>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

/** Hook para acessar o estado de autenticação dentro do AuthProvider. */
export function useAuth(): AuthContextData {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
    }
    return context;
}
