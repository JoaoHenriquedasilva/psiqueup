import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    ShieldCheck,
    UserCheck,
    UserX,
    Users,
} from 'lucide-react';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { FeedbackBanner, type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { getSessionStatusBadge } from '../utils/sessionStatus';
import type {
    AdminDashboardMetrics,
    AdminPsychologistItem,
    SessionItem,
    SessionStatus,
} from '../types/api';

type SessionFilter = 'ALL' | SessionStatus;

const SESSION_FILTERS: { value: SessionFilter; label: string }[] = [
    { value: 'ALL', label: 'Todas' },
    { value: 'DISPUTED', label: 'Em Contestação' },
    { value: 'SCHEDULED', label: 'Agendadas' },
    { value: 'COMPLETED', label: 'Realizadas' },
    { value: 'NO_SHOW', label: 'Faltas' },
    { value: 'CANCELED', label: 'Canceladas' },
];

export function AdminDashboard() {
    const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
    const [psychologists, setPsychologists] = useState<AdminPsychologistItem[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [statusFilter, setStatusFilter] = useState<SessionFilter>('ALL');

    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [confirmingDeactivateId, setConfirmingDeactivateId] = useState<number | null>(null);
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
    const [resolvingSessionId, setResolvingSessionId] = useState<number | null>(null);

    async function fetchAdminOverview() {
        const [metricsRes, psychologistsRes] = await Promise.all([
            api.get<AdminDashboardMetrics>('/admin/dashboard'),
            api.get<AdminPsychologistItem[]>('/admin/psychologists'),
        ]);
        return { metrics: metricsRes.data, psychologists: psychologistsRes.data };
    }

    async function fetchAdminSessions(filter: SessionFilter) {
        const params = filter === 'ALL' ? undefined : { status: filter };
        const { data } = await api.get<SessionItem[]>('/admin/sessions', { params });
        return data;
    }

    useEffect(() => {
        let cancelled = false;

        Promise.all([fetchAdminOverview(), fetchAdminSessions('ALL')])
            .then(([overview, sessionsData]) => {
                if (cancelled) return;
                setMetrics(overview.metrics);
                setPsychologists(overview.psychologists);
                setSessions(sessionsData);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(err, 'Erro ao carregar dados do consultório.'),
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
    }, []);

    async function handleFilterChange(nextFilter: SessionFilter) {
        setStatusFilter(nextFilter);
        setFeedback(null);
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

    async function handleToggleUserStatus(userId: number, nextActive: boolean) {
        setFeedback(null);
        setUpdatingUserId(userId);
        try {
            await api.patch(`/admin/users/${userId}/status`, { active: nextActive });
            setConfirmingDeactivateId(null);
            setPsychologists((prev) =>
                prev.map((p) => (p.userId === userId ? { ...p, active: nextActive } : p))
            );
            setFeedback({
                type: 'success',
                text: nextActive
                    ? 'Conta do psicólogo reativada com sucesso.'
                    : 'Conta do psicólogo desativada. Sessões ativas de login foram bloqueadas.',
            });

            try {
                const overview = await fetchAdminOverview();
                setMetrics(overview.metrics);
                setPsychologists(overview.psychologists);
            } catch {
                // Mantém o estado já atualizado localmente caso o refresh falhe
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível atualizar o status da conta.'),
            });
        } finally {
            setUpdatingUserId(null);
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

            try {
                const overview = await fetchAdminOverview();
                setMetrics(overview.metrics);
                setPsychologists(overview.psychologists);
            } catch {
                // Mantém a lista atualizada localmente caso o refresh falhe
            }
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
        <div className="min-h-screen bg-slate-50">
            <DashboardNavbar
                roleBadgeLabel="Administração"
                roleBadgeClassName="bg-amber-50 text-amber-700"
                maxWidthClassName="max-w-6xl"
            />

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

                {loading ? (
                    <p className="text-center text-slate-500 py-12">Carregando indicadores do consultório...</p>
                ) : (
                    <>
                        {/* Seção 1: Métricas Consolidadas */}
                        {metrics && (
                            <section className="space-y-4">
                                <div>
                                    <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-teal-600" />
                                        Visão Geral do Consultório
                                    </h1>
                                    <p className="text-xs text-slate-500">
                                        Indicadores administrativos e operacionais da clínica (sem dados clínicos sigilosos).
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <p className="text-xs font-medium text-slate-500">Psicólogos</p>
                                        <p className="text-2xl font-bold text-slate-900 mt-1">
                                            {metrics.activePsychologists}
                                            <span className="text-sm font-normal text-slate-500 ml-1">ativos</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {metrics.inactivePsychologists} inativo(s)
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <p className="text-xs font-medium text-slate-500">Pacientes & Vínculos</p>
                                        <p className="text-2xl font-bold text-slate-900 mt-1">
                                            {metrics.totalPatients}
                                            <span className="text-sm font-normal text-slate-500 ml-1">pacientes</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Média: <strong>{metrics.averagePatientsPerPsychologist.toFixed(1)}</strong>{' '}
                                            vínculos/psicólogo
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <p className="text-xs font-medium text-slate-500">Agenda de Sessões</p>
                                        <p className="text-2xl font-bold text-slate-900 mt-1">
                                            {metrics.scheduledSessions}
                                            <span className="text-sm font-normal text-slate-500 ml-1">agendadas</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {metrics.completedSessions} realizadas • {metrics.noShowSessions} faltas •{' '}
                                            {metrics.canceledSessions} canceladas
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('DISPUTED')}
                                        className={`text-left rounded-2xl border p-5 shadow-sm transition cursor-pointer ${
                                            metrics.disputedSessions > 0
                                                ? 'bg-red-50 border-red-200 hover:bg-red-100/70'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <p
                                            className={`text-xs font-medium flex items-center gap-1.5 ${
                                                metrics.disputedSessions > 0 ? 'text-red-700' : 'text-slate-500'
                                            }`}
                                        >
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Sessões Contestadas (DISPUTED)
                                        </p>
                                        <p
                                            className={`text-2xl font-bold mt-1 ${
                                                metrics.disputedSessions > 0 ? 'text-red-700' : 'text-slate-900'
                                            }`}
                                        >
                                            {metrics.disputedSessions}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Clique para filtrar e auditar
                                        </p>
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Seção 2: Psicólogos & Governança de CRP */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <Users className="h-5 w-5 text-teal-600" />
                                        Psicólogos da Clínica & Governança de CRP
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Valide registros profissionais no CFP e ative ou desative o acesso dos profissionais.
                                    </p>
                                </div>

                                <a
                                    href="https://cadastro.cfp.org.br/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 self-start"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Consultar Cadastro Nacional CFP
                                </a>
                            </div>

                            {psychologists.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">
                                    Nenhum psicólogo cadastrado até o momento.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {psychologists.map((psych) => {
                                        const isUpdating = updatingUserId === psych.userId;
                                        const isConfirming = confirmingDeactivateId === psych.userId;

                                        return (
                                            <div key={psych.userId} className="py-4 space-y-3">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {psych.name}
                                                            </p>
                                                            <span
                                                                className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                                                    psych.active
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                }`}
                                                            >
                                                                {psych.active ? 'Ativo' : 'Inativo'}
                                                            </span>
                                                            {psych.crp ? (
                                                                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                                                    CRP {psych.crp}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                                                    CRP Pendente
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            {psych.email}
                                                            {psych.approachName ? ` • ${psych.approachName}` : ''}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {psych.activePatientsCount} paciente(s) ativo(s) •{' '}
                                                            {psych.totalSessionsCount} sessão(ões)
                                                            {psych.disputedSessionsCount > 0 && (
                                                                <span className="text-red-600 font-medium ml-1">
                                                                    • {psych.disputedSessionsCount} contestação(ões)
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {psych.active ? (
                                                            !isConfirming && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdating}
                                                                    onClick={() => setConfirmingDeactivateId(psych.userId)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <UserX className="h-3.5 w-3.5" />
                                                                    Desativar conta
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={() => handleToggleUserStatus(psych.userId, true)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer disabled:opacity-60"
                                                            >
                                                                <UserCheck className="h-3.5 w-3.5" />
                                                                {isUpdating ? 'Reativando...' : 'Reativar conta'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {isConfirming && (
                                                    <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <p className="text-xs font-medium text-red-800">
                                                            Desativar o acesso de <strong>{psych.name}</strong>? O token atual será invalidado imediatamente.
                                                        </p>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={() => handleToggleUserStatus(psych.userId, false)}
                                                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg cursor-pointer disabled:opacity-60"
                                                            >
                                                                {isUpdating ? 'Desativando...' : 'Confirmar desativação'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={() => setConfirmingDeactivateId(null)}
                                                                className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg border border-slate-200 cursor-pointer disabled:opacity-60"
                                                            >
                                                                Voltar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Seção 3: Auditoria de Sessões */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-teal-600" />
                                        Auditoria de Sessões
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Acompanhe todas as sessões da clínica e resolva contestações abertas pelos pacientes.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {SESSION_FILTERS.map((filter) => (
                                        <button
                                            key={filter.value}
                                            type="button"
                                            onClick={() => handleFilterChange(filter.value)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                                                statusFilter === filter.value
                                                    ? 'bg-teal-600 text-white border-teal-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {sessions.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">
                                    Nenhuma sessão encontrada para o filtro selecionado.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {sessions.map((session) => {
                                        const badge = getSessionStatusBadge(session.status);
                                        const isResolving = resolvingSessionId === session.id;

                                        return (
                                            <div
                                                key={session.id}
                                                className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                                                        <Clock className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {session.psychologistName}{' '}
                                                            <span className="text-slate-400 font-normal">→</span>{' '}
                                                            {session.patientName}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {formatSessionDateTime(session.startTime, session.endTime)}
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
                                                                    handleResolveSession(session.id, 'COMPLETED')
                                                                }
                                                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer disabled:opacity-60"
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
                                                                className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 cursor-pointer disabled:opacity-60"
                                                            >
                                                                Registrar Falta
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isResolving}
                                                                onClick={() =>
                                                                    handleResolveSession(session.id, 'CANCELED')
                                                                }
                                                                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-60"
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
                    </>
                )}
            </main>
        </div>
    );
}
