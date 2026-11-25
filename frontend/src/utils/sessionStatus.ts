import type { SessionStatus } from '../types/api';

export interface SessionStatusBadge {
    label: string;
    color: string;
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, SessionStatusBadge> = {
    SCHEDULED: { label: 'Agendada', color: 'bg-slate-inst-tint text-slate-inst-ink border-slate-inst-border' },
    COMPLETED: { label: 'Realizada', color: 'bg-success-bg text-success-ink border-success-border' },
    CANCELED: { label: 'Cancelada', color: 'bg-neutral-bg text-neutral-ink border-neutral-border' },
    NO_SHOW: { label: 'Falta registrada', color: 'bg-warning-bg text-warning-ink border-warning-border' },
    DISPUTED: { label: 'Em contestação', color: 'bg-danger-bg text-danger-ink border-danger-border' },
};

const DEFAULT_BADGE: SessionStatusBadge = {
    label: 'Indefinido',
    color: 'bg-neutral-bg text-neutral-ink border-neutral-border',
};

/** Retorna o rótulo e as classes visuais de um status de sessão com fallback seguro. */
export function getSessionStatusBadge(status: SessionStatus): SessionStatusBadge {
    return SESSION_STATUS_LABELS[status] ?? { ...DEFAULT_BADGE, label: String(status) };
}
