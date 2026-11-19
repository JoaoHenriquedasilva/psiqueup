import type { SessionStatus } from '../types/api';

export const SESSION_STATUS_LABELS: Record<SessionStatus, { label: string; color: string }> = {
    SCHEDULED: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    COMPLETED: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELED: { label: 'Cancelada', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    NO_SHOW: { label: 'Falta registrada', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    DISPUTED: { label: 'Em contestação', color: 'bg-red-50 text-red-700 border-red-200' },
};
