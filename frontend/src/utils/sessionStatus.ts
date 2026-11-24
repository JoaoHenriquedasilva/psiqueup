import type { SessionStatus } from '../types/api';

export interface SessionStatusBadge {
    label: string;
    color: string;
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, SessionStatusBadge> = {
    SCHEDULED: { label: 'Agendada', color: 'bg-[#EEF3F7] text-[#2E4A63] border-[#D4E0EB]' },
    COMPLETED: { label: 'Realizada', color: 'bg-[#E8F4EE] text-[#1B5E3F] border-[#C6E3D3]' },
    CANCELED: { label: 'Cancelada', color: 'bg-[#F1F3F2] text-[#526064] border-[#DCE1DF]' },
    NO_SHOW: { label: 'Falta registrada', color: 'bg-[#FDF5E6] text-[#8C5311] border-[#F3DFB6]' },
    DISPUTED: { label: 'Em contestação', color: 'bg-[#FDF0EF] text-[#9E2A2B] border-[#F3C9C8]' },
};

const DEFAULT_BADGE: SessionStatusBadge = {
    label: 'Indefinido',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Retorna o rótulo e as classes visuais de um status de sessão com fallback seguro. */
export function getSessionStatusBadge(status: SessionStatus): SessionStatusBadge {
    return SESSION_STATUS_LABELS[status] ?? { ...DEFAULT_BADGE, label: String(status) };
}
