import type { UserRole } from '../types/api';

const TOKEN_STORAGE_KEY = '@psiqueup:token';
const USER_STORAGE_KEY = '@psiqueup:user';

const VALID_ROLES: ReadonlySet<UserRole> = new Set(['ADMIN', 'PSYCHOLOGIST', 'PATIENT']);

export interface StoredUser {
    name: string;
    email: string;
    role: UserRole;
}

function isValidStoredUser(value: unknown): value is StoredUser {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.name === 'string' &&
        candidate.name.trim().length > 0 &&
        typeof candidate.email === 'string' &&
        candidate.email.trim().length > 0 &&
        typeof candidate.role === 'string' &&
        VALID_ROLES.has(candidate.role as UserRole)
    );
}

/** Retorna o token JWT salvo apenas se houver uma string não vazia. */
export function getStoredToken(): string | null {
    try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        return token && token.trim().length > 0 ? token : null;
    } catch {
        return null;
    }
}

/**
 * Carrega o usuário autenticado do localStorage com validação estrutural.
 * Limpa a sessão automaticamente caso o token esteja ausente ou o JSON esteja corrompido.
 */
export function loadStoredUser(): StoredUser | null {
    try {
        const token = getStoredToken();
        const rawUser = localStorage.getItem(USER_STORAGE_KEY);

        if (!token || !rawUser) {
            if (token || rawUser) {
                clearStoredSession();
            }
            return null;
        }

        const parsed: unknown = JSON.parse(rawUser);
        if (!isValidStoredUser(parsed)) {
            clearStoredSession();
            return null;
        }

        return parsed;
    } catch {
        clearStoredSession();
        return null;
    }
}

/** Persiste token e dados básicos da sessão no localStorage. */
export function saveStoredSession(token: string, user: StoredUser): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/** Remove token e dados da sessão do localStorage. */
export function clearStoredSession(): void {
    try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
        // Ignora indisponibilidade de storage em ambientes restritos
    }
}
