import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    BadgeAlert,
    Calendar,
    CheckCircle2,
    Clock,
    Plus,
    XCircle,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import { extractApiErrorMessage, isApiHttpStatus } from '../utils/apiError';
import {
    formatSessionDateTime,
    getTodayDateInputValue,
    localDateTimeToIso,
} from '../utils/dateTime';
import { PSYCHOLOGIST_NAV_ITEMS } from '../utils/navigation';
import { getSessionStatusBadge } from '../utils/sessionStatus';
import type {
    PsychologistProfile,
    SessionItem,
    SessionStatus,
    TherapeuticLink,
} from '../types/api';

export function PsychologistDashboard() {
    const [profileMissing, setProfileMissing] = useState(false);
    const [links, setLinks] = useState<TherapeuticLink[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    // Form Nova Sessão
    const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
    const [sessionDate, setSessionDate] = useState('');
    const [startHour, setStartHour] = useState('14:00');
    const [endHour, setEndHour] = useState('15:00');
    const [scheduling, setScheduling] = useState(false);

    // Controle de atualização de status e confirmação de adiantamento
    const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);
    const [confirmingEarlySessionId, setConfirmingEarlySessionId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadAgendaData() {
            try {
                const [linksRes, sessionsRes] = await Promise.all([
                    api.get<TherapeuticLink[]>('/links'),
                    api.get<SessionItem[]>('/sessions'),
                ]);

                if (cancelled) return;
                setLinks(linksRes.data);
                setSessions(sessionsRes.data);

                try {
                    await api.get<PsychologistProfile>('/profiles/psychologist/me');
                    if (!cancelled) {
                        setProfileMissing(false);
                    }
                } catch (profileErr: unknown) {
                    if (cancelled) return;
                    if (isApiHttpStatus(profileErr, 404)) {
                        setProfileMissing(true);
                    } else {
                        setFeedback({
                            type: 'error',
                            text: extractApiErrorMessage(
                                profileErr,
                                'Erro ao verificar perfil profissional.'
                            ),
                        });
                    }
                }
            } catch {
                if (!cancelled) {
                    setFeedback({ type: 'error', text: 'Erro ao carregar dados da agenda.' });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadAgendaData();
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleScheduleSession(e: FormEvent) {
        e.preventDefault();
        if (!selectedPatientId || !sessionDate || !startHour || !endHour) {
            setFeedback({
                type: 'error',
                text: 'Selecione o paciente, a data e os horários de início e término.',
            });
            return;
        }

        const startTime = localDateTimeToIso(sessionDate, startHour);
        const endTime = localDateTimeToIso(sessionDate, endHour);

        if (!startTime || !endTime) {
            setFeedback({
                type: 'error',
                text: 'Data ou horário informados são inválidos.',
            });
            return;
        }

        if (new Date(endTime) <= new Date(startTime)) {
            setFeedback({
                type: 'error',
                text: 'O horário de término deve ser posterior ao horário de início.',
            });
            return;
        }

        if (new Date(startTime) <= new Date()) {
            setFeedback({
                type: 'error',
                text: 'A sessão deve ser agendada para uma data e horário futuros.',
            });
            return;
        }

        setScheduling(true);
        setFeedback(null);
        try {
            const { data: createdSession } = await api.post<SessionItem>('/sessions', {
                patientId: Number(selectedPatientId),
                startTime,
                endTime,
            });
            setSelectedPatientId('');
            setSessionDate('');
            setSessions((prev) =>
                [...prev, createdSession].sort(
                    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                )
            );
            setFeedback({ type: 'success', text: 'Sessão agendada com sucesso!' });

            try {
                const { data } = await api.get<SessionItem[]>('/sessions');
                setSessions(data);
            } catch {
                // Mantém a sessão já adicionada localmente se o refresh falhar
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao agendar sessão.'),
            });
        } finally {
            setScheduling(false);
        }
    }

    function requestSessionStatusChange(session: SessionItem, status: SessionStatus) {
        const isBeforeStart = new Date() < new Date(session.startTime);

        if (status === 'NO_SHOW' && isBeforeStart) {
            setFeedback({
                type: 'error',
                text: 'Não é possível registrar falta antes do horário agendado da sessão.',
            });
            return;
        }

        if (status === 'COMPLETED' && isBeforeStart) {
            setConfirmingEarlySessionId(session.id);
            return;
        }

        void handleUpdateSessionStatus(session.id, status, false);
    }

    async function handleUpdateSessionStatus(
        sessionId: number,
        status: SessionStatus,
        confirmEarlyCompletion = false
    ) {
        setFeedback(null);
        setUpdatingSessionId(sessionId);
        try {
            const { data: updated } = await api.patch<SessionItem>(
                `/sessions/${sessionId}/status`,
                {
                    status,
                    confirmEarlyCompletion: confirmEarlyCompletion || undefined,
                }
            );
            setConfirmingEarlySessionId(null);
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? updated : s))
            );
            setFeedback({ type: 'success', text: 'Status da sessão atualizado.' });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao atualizar status da sessão.'),
            });
        } finally {
            setUpdatingSessionId(null);
        }
    }

    const activeLinks = links.filter((l) => l.status === 'ACTIVE');

    return (
        <DashboardShell
            roleBadgeLabel="Psicólogo(a)"
            roleBadgeClassName="bg-primary-tint text-primary-tint-ink"
            navItems={PSYCHOLOGIST_NAV_ITEMS}
            pageTitle="Agenda & Sessões"
            pageSubtitle="Agende horários com pacientes ativos e acompanhe o status dos atendimentos."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-surface">
                    <p className="text-sm text-ink-secondary">Carregando informações clínicas...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Banner de Onboarding quando perfil profissional não existe (404) */}
                    {profileMissing && (
                        <div className="rounded-2xl bg-warning-bg border border-warning-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-surface">
                            <div className="flex items-start gap-3">
                                <BadgeAlert className="h-5 w-5 text-warning-ink shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-warning-ink">
                                        Complete seu Perfil Profissional para ativar seus atendimentos
                                    </p>
                                    <p className="text-xs text-warning-ink/90 mt-0.5">
                                        Configure seu número de CRP e sua abordagem terapêutica para
                                        vincular pacientes e realizar agendamentos.
                                    </p>
                                </div>
                            </div>
                            <Link
                                to="/psychologist/profile"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-warning-solid hover:bg-warning-solid-hover text-white text-xs font-semibold rounded-xl transition self-start sm:self-center shrink-0"
                            >
                                Configurar CRP e Abordagem
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* Card Novo Agendamento */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <div className="mb-4">
                            <h2 className="font-display text-lg font-semibold text-ink">
                                Novo Agendamento
                            </h2>
                            <p className="text-xs text-ink-secondary mt-0.5">
                                Selecione um paciente com vínculo ativo para reservar um novo horário.
                            </p>
                        </div>

                        {activeLinks.length === 0 && (
                            <p className="text-xs text-warning-ink bg-warning-bg border border-warning-border rounded-xl px-3.5 py-2.5 mb-4">
                                Você ainda não possui pacientes ativos vinculados.{' '}
                                <Link
                                    to="/psychologist/patients"
                                    className="font-semibold underline hover:opacity-80"
                                >
                                    Vincular paciente
                                </Link>
                            </p>
                        )}

                        <form
                            onSubmit={handleScheduleSession}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
                        >
                            <div>
                                <label
                                    htmlFor="schedule-patient"
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                >
                                    Paciente Ativo
                                </label>
                                <select
                                    id="schedule-patient"
                                    required
                                    value={selectedPatientId}
                                    onChange={(e) =>
                                        setSelectedPatientId(
                                            e.target.value ? Number(e.target.value) : ''
                                        )
                                    }
                                    className="w-full px-3 py-2 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
                                >
                                    <option value="">Selecione...</option>
                                    {activeLinks.map((l) => (
                                        <option key={l.patientId} value={l.patientId}>
                                            {l.patientName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="schedule-date"
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                >
                                    Data
                                </label>
                                <input
                                    id="schedule-date"
                                    type="date"
                                    required
                                    min={getTodayDateInputValue()}
                                    value={sessionDate}
                                    onChange={(e) => setSessionDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink tabular-nums focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="schedule-start"
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                >
                                    Início
                                </label>
                                <input
                                    id="schedule-start"
                                    type="time"
                                    required
                                    value={startHour}
                                    onChange={(e) => setStartHour(e.target.value)}
                                    className="w-full px-3 py-2 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink tabular-nums focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="schedule-end"
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                >
                                    Fim
                                </label>
                                <input
                                    id="schedule-end"
                                    type="time"
                                    required
                                    value={endHour}
                                    onChange={(e) => setEndHour(e.target.value)}
                                    className="w-full px-3 py-2 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink tabular-nums focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={scheduling || activeLinks.length === 0}
                                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-60"
                            >
                                <Plus className="h-4 w-4" />
                                {scheduling ? 'Agendando...' : 'Agendar'}
                            </button>
                        </form>
                    </section>

                    {/* Lista de Sessões */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary-ink" />
                                Sessões Agendadas e Histórico
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-subsurface-muted text-ink-secondary tabular-nums">
                                {sessions.length}
                            </span>
                        </div>

                        {sessions.length === 0 ? (
                            <p className="text-sm text-ink-secondary text-center py-8">
                                Nenhuma sessão agendada até o momento.
                            </p>
                        ) : (
                            <div className="divide-y divide-border-subtle">
                                {sessions.map((session) => {
                                    const badge = getSessionStatusBadge(session.status);
                                    const isUpdatingThis = updatingSessionId === session.id;
                                    const isConfirmingEarly = confirmingEarlySessionId === session.id;

                                    return (
                                        <div key={session.id} className="py-4 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-xl bg-subsurface-muted text-ink-secondary mt-0.5">
                                                        <Clock className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-ink">
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

                                                    {session.status === 'SCHEDULED' &&
                                                        !isConfirmingEarly && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdatingThis}
                                                                    onClick={() =>
                                                                        requestSessionStatusChange(
                                                                            session,
                                                                            'COMPLETED'
                                                                        )
                                                                    }
                                                                    title="Marcar como realizada"
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-success-ink bg-success-bg hover:opacity-90 rounded-lg border border-success-border cursor-pointer disabled:opacity-60 transition"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    Realizada
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdatingThis}
                                                                    onClick={() =>
                                                                        requestSessionStatusChange(
                                                                            session,
                                                                            'NO_SHOW'
                                                                        )
                                                                    }
                                                                    title="Registrar falta"
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-warning-ink bg-warning-bg hover:opacity-90 rounded-lg border border-warning-border cursor-pointer disabled:opacity-60 transition"
                                                                >
                                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                                    Falta
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdatingThis}
                                                                    onClick={() =>
                                                                        requestSessionStatusChange(
                                                                            session,
                                                                            'CANCELED'
                                                                        )
                                                                    }
                                                                    title="Cancelar sessão"
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-ink bg-subsurface hover:bg-subsurface-muted rounded-lg border border-border-subtle cursor-pointer disabled:opacity-60 transition"
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5" />
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        )}
                                                </div>
                                            </div>

                                            {isConfirmingEarly && (
                                                <div className="rounded-xl bg-warning-bg border border-warning-border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <p className="text-xs font-medium text-warning-ink">
                                                        Esta sessão está agendada para mais tarde.
                                                        Confirmar que o atendimento foi adiantado (foi
                                                        atendido antes)?
                                                    </p>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={isUpdatingThis}
                                                            onClick={() =>
                                                                handleUpdateSessionStatus(
                                                                    session.id,
                                                                    'COMPLETED',
                                                                    true
                                                                )
                                                            }
                                                            className="px-3 py-1.5 bg-success-solid hover:bg-success-solid-hover text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            {isUpdatingThis
                                                                ? 'Confirmando...'
                                                                : 'Confirmar adiantamento'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isUpdatingThis}
                                                            onClick={() =>
                                                                setConfirmingEarlySessionId(null)
                                                            }
                                                            className="px-3 py-1.5 bg-surface text-ink-secondary text-xs font-medium rounded-lg border border-border-subtle hover:bg-subsurface-muted cursor-pointer disabled:opacity-60 transition"
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
                </div>
            )}
        </DashboardShell>
    );
}
