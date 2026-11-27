import { useEffect, useState, type ReactNode } from 'react';
import { api, registerSessionExpiredHandler } from '../services/api';
import type {
    AuthResponse,
    RegisterPendingVerificationResponse,
    UserProfileResponse,
    UserRole,
} from '../types/api';
import { clearLegacyAuthStorage } from '../utils/authStorage';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '../constants/legal';
import { AuthContext, type AuthUser, type RegisterClinicPayload } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        let active = true;

        clearLegacyAuthStorage();
        registerSessionExpiredHandler(() => {
            if (active) {
                setUser(null);
            }
        });

        async function bootstrapSession() {
            try {
                const { data } = await api.get<UserProfileResponse>('/users/me', {
                    _skipAuthRedirect: true,
                });
                if (active) {
                    setUser({
                        name: data.name,
                        email: data.email,
                        role: data.role,
                    });
                }
            } catch {
                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setIsAuthLoading(false);
                }
            }
        }

        void bootstrapSession();

        return () => {
            active = false;
            registerSessionExpiredHandler(null);
        };
    }, []);

    async function login(email: string, password: string): Promise<UserRole> {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        setUser({
            name: data.name,
            email: data.email,
            role: data.role,
        });
        return data.role;
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

    async function logout(): Promise<void> {
        await api.post('/auth/logout').catch(() => {});
        clearLegacyAuthStorage();
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isAuthLoading,
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
