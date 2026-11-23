import type { UserRole } from '../types/api';

/** Retorna a rota inicial do painel correspondente ao perfil autenticado. */
export function getHomeRouteByRole(role: UserRole): string {
    if (role === 'ADMIN') return '/admin';
    if (role === 'PSYCHOLOGIST') return '/psychologist';
    return '/patient';
}
