import type { SessionStatus } from '../types/api';

export interface SessionStatusBadge {
    label: string;
    color: string;
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, SessionStatusBadge> = {
    SCHEDULED: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    COMPLETED: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELED: { label: 'Cancelada', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    NO_SHOW: { label: 'Falta registrada', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    DISPUTED: { label: 'Em contestação', color: 'bg-red-50 text-red-700 border-red-200' },
};

const DEFAULT_BADGE: SessionStatusBadge = {
    label: 'Indefinido',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Retorna o rótulo e as classes visuais de um status de sessão com fallback seguro. */
export function getSessionStatusBadge(status: SessionStatus): SessionStatusBadge {
    return SESSION_STATUS_LABELS[status] ?? { ...DEFAULT_BADGE, label: String(status) };
}
