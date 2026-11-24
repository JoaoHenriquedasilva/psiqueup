import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { ADMIN_NAV_ITEMS } from '../utils/navigation';
import { getSessionStatusBadge } from '../utils/sessionStatus';
import type { SessionItem, SessionStatus } from '../types/api';

type SessionFilter = 'ALL' | SessionStatus;

const SESSION_FILTERS: { value: SessionFilter; label: string }[] = [
    { value: 'ALL', label: 'Todas' },
    { value: 'DISPUTED', label: 'Em Contestação' },
    { value: 'SCHEDULED', label: 'Agendadas' },
    { value: 'COMPLETED', label: 'Realizadas' },
    { value: 'NO_SHOW', label: 'Faltas' },
    { value: 'CANCELED', label: 'Canceladas' },
];

const VALID_FILTERS = new Set<SessionFilter>(SESSION_FILTERS.map((f) => f.value));

function parseFilterFromParams(param: string | null): SessionFilter {
    if (param && VALID_FILTERS.has(param as SessionFilter)) {
        return param as SessionFilter;
    }
    return 'ALL';
}

export function AdminSessionsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialFilter = parseFilterFromParams(searchParams.get('status'));

    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [statusFilter, setStatusFilter] = useState<SessionFilter>(initialFilter);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [resolvingSessionId, setResolvingSessionId] = useState<number | null>(null);

    async function fetchAdminSessions(filter: SessionFilter) {
        const params = filter === 'ALL' ? undefined : { status: filter };
        const { data } = await api.get<SessionItem[]>('/admin/sessions', { params });
        return data;
    }

    useEffect(() => {
        let cancelled = false;

        fetchAdminSessions(initialFilter)
            .then((data) => {
                if (!cancelled) {
                    setSessions(data);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(err, 'Erro ao carregar sessões da clínica.'),
                    });
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [initialFilter]);

    async function handleFilterChange(nextFilter: SessionFilter) {
        setStatusFilter(nextFilter);
        setFeedback(null);
        if (nextFilter === 'ALL') {
            setSearchParams({});
        } else {
            setSearchParams({ status: nextFilter });
        }

        try {
            const data = await fetchAdminSessions(nextFilter);
            setSessions(data);
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao filtrar sessões da clínica.'),
            });
        }
    }

    async function handleResolveSession(
        sessionId: number,
        resolutionStatus: 'COMPLETED' | 'NO_SHOW' | 'CANCELED'
    ) {
        setFeedback(null);
        setResolvingSessionId(sessionId);
        try {
            const { data: resolved } = await api.patch<SessionItem>(
                `/admin/sessions/${sessionId}/resolve`,
                { resolutionStatus }
            );
            setSessions((prev) =>
                statusFilter === 'DISPUTED'
                    ? prev.filter((s) => s.id !== sessionId)
                    : prev.map((s) => (s.id === sessionId ? resolved : s))
            );
            setFeedback({ type: 'success', text: 'Contestação resolvida com sucesso.' });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao resolver contestação.'),
            });
        } finally {
            setResolvingSessionId(null);
        }
    }

    return (
        <DashboardShell
            roleBadgeLabel="Administração"
            roleBadgeClassName="bg-warning-bg text-warning-ink"
            navItems={ADMIN_NAV_ITEMS}
            pageTitle="Auditoria de Sessões"
            pageSubtitle="Acompanhe todas as sessões da clínica e resolva contestações abertas pelos pacientes."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary-ink" />
                        <h2 className="font-display text-lg font-semibold text-ink">
                            Registros da Clínica
                        </h2>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {SESSION_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => handleFilterChange(filter.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition cursor-pointer ${
                                    statusFilter === filter.value
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-subsurface text-ink-secondary border-border-subtle hover:bg-subsurface-muted'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <p className="text-sm text-ink-secondary text-center py-8">
                        Carregando sessões...
                    </p>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-ink-secondary text-center py-8">
                        Nenhuma sessão encontrada para o filtro selecionado.
                    </p>
                ) : (
                    <div className="divide-y divide-border-subtle">
                        {sessions.map((session) => {
                            const badge = getSessionStatusBadge(session.status);
                            const isResolving = resolvingSessionId === session.id;

                            return (
                                <div
                                    key={session.id}
                                    className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-subsurface-muted text-ink-secondary mt-0.5">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-ink">
                                                {session.psychologistName}{' '}
                                                <span className="text-ink-secondary font-normal">→</span>{' '}
                                                {session.patientName}
                                            </p>
                                            <p className="text-xs text-ink-secondary mt-0.5 tabular-nums">
                                                {formatSessionDateTime(
                                                    session.startTime,
                                                    session.endTime
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${badge.color}`}
                                        >
                                            {badge.label}
                                        </span>

                                        {session.status === 'DISPUTED' && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={isResolving}
                                                    onClick={() =>
                                                        handleResolveSession(
                                                            session.id,
                                                            'COMPLETED'
                                                        )
                                                    }
                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-success-ink bg-success-bg hover:opacity-90 rounded-lg border border-success-border cursor-pointer disabled:opacity-60 transition"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Confirmar Realizada
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isResolving}
                                                    onClick={() =>
                                                        handleResolveSession(session.id, 'NO_SHOW')
                                                    }
                                                    className="px-2.5 py-1 text-xs font-medium text-warning-ink bg-warning-bg hover:opacity-90 rounded-lg border border-warning-border cursor-pointer disabled:opacity-60 transition"
                                                >
                                                    Registrar Falta
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isResolving}
                                                    onClick={() =>
                                                        handleResolveSession(session.id, 'CANCELED')
                                                    }
                                                    className="px-2.5 py-1 text-xs font-medium text-neutral-ink bg-subsurface hover:bg-subsurface-muted rounded-lg border border-border-subtle cursor-pointer disabled:opacity-60 transition"
                                                >
                                                    Cancelar Sessão
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </DashboardShell>
    );
}
