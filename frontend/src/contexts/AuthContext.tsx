import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { AuthResponse, UserRole } from '../types/api';

interface StoredUser {
    name: string;
    email: string;
    role: UserRole;
}

interface AuthContextData {
    user: StoredUser | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<UserRole>;
    register: (
        name: string,
        email: string,
        password: string,
        role: 'PSYCHOLOGIST' | 'PATIENT'
    ) => Promise<UserRole>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<StoredUser | null>(() => {
        const saved = localStorage.getItem('@psiqueup:user');
        return saved ? JSON.parse(saved) : null;
    });

    function saveSession(data: AuthResponse): UserRole {
        const userData: StoredUser = {
            name: data.name,
            email: data.email,
            role: data.role,
        };
        localStorage.setItem('@psiqueup:token', data.token);
        localStorage.setItem('@psiqueup:user', JSON.stringify(userData));
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
        role: 'PSYCHOLOGIST' | 'PATIENT'
    ): Promise<UserRole> {
        const { data } = await api.post<AuthResponse>('/auth/register', {
            name,
            email,
            password,
            role,
        });
        return saveSession(data);
    }

    function logout() {
        localStorage.removeItem('@psiqueup:token');
        localStorage.removeItem('@psiqueup:user');
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);