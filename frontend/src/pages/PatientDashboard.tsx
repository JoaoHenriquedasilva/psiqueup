import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    BookOpen,
    Calendar,
    Clock,
    ShieldAlert,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { FeedbackBanner, type FeedbackMessage } from '../components/FeedbackBanner';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { getSessionStatusBadge } from '../utils/sessionStatus';
import type { SessionItem, TherapeuticLink } from '../types/api';

export function PatientDashboard() {
    const { user } = useAuth();

    const [links, setLinks] = useState<TherapeuticLink[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    // Estado para rejeição de vínculo
    const [rejectingLinkId, setRejectingLinkId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectingSubmitting, setRejectingSubmitting] = useState(false);

    // Estado para atualização e confirmação inline de sessão
    const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);
    const [confirmingSession, setConfirmingSession] = useState<{
        id: number;
        status: 'CANCELED' | 'DISPUTED';
    } | null>(null);

    async function fetchPatientData() {
        const [linksRes, sessionsRes] = await Promise.all([
            api.get<TherapeuticLink[]>('/links'),
            api.get<SessionItem[]>('/sessions'),
        ]);
        return { links: linksRes.data, sessions: sessionsRes.data };
    }

    useEffect(() => {
        let cancelled = false;

        fetchPatientData()
            .then((data) => {
                if (!cancelled) {
                    setLinks(data.links);
                    setSessions(data.sessions);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setFeedback({ type: 'error', text: 'Não foi possível carregar seus dados.' });
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

    async function handleRejectLink(linkId: number) {
        setFeedback(null);
        setRejectingSubmitting(true);
        try {
            const { data: rejectedLink } = await api.patch<TherapeuticLink>(
                `/links/${linkId}/reject`,
                {
                    reason: rejectionReason.trim() || null,
                }
            );
            setRejectingLinkId(null);
            setRejectionReason('');
            setLinks((prev) => prev.map((l) => (l.id === linkId ? rejectedLink : l)));
            setFeedback({ type: 'success', text: 'Vínculo rejeitado com segurança.' });

            try {
                const data = await fetchPatientData();
                setLinks(data.links);
                setSessions(data.sessions);
            } catch {
                // Mantém o vínculo já rejeitado localmente caso a recarga falhe
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao rejeitar vínculo.'),
            });
        } finally {
            setRejectingSubmitting(false);
        }
    }

    async function handleUpdateSession(sessionId: number, status: 'CANCELED' | 'DISPUTED') {
        setFeedback(null);
        setUpdatingSessionId(sessionId);
        try {
            const { data: updatedSession } = await api.patch<SessionItem>(
                `/sessions/${sessionId}/status`,
                { status }
            );
            setConfirmingSession(null);
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? updatedSession : s))
            );
            setFeedback({
                type: 'success',
                text:
                    status === 'DISPUTED'
                        ? 'Contestação registrada. A clínica será notificada.'
                        : 'Sessão cancelada.',
            });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível atualizar a sessão.'),
            });
        } finally {
            setUpdatingSessionId(null);
        }
    }

    const activeLinks = links.filter((l) => l.status === 'ACTIVE');

    return (
        <div className="min-h-screen bg-slate-50">
            <DashboardNavbar
                roleBadgeLabel="Área do Paciente"
                roleBadgeClassName="bg-indigo-50 text-indigo-700"
                maxWidthClassName="max-w-5xl"
            />

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

                {loading ? (
                    <p className="text-center text-slate-500 py-12">Carregando seu acompanhamento...</p>
                ) : (
                    <>
                        {/* Seção 1: Profissional Vinculado & Explicação da Abordagem */}
                        <section className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-teal-600" />
                                    Meu Acompanhamento Terapêutico
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Conheça a abordagem do profissional vinculado a você e gerencie seu vínculo com segurança.
                                </p>
                            </div>

                            {activeLinks.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                                    <p className="text-sm text-slate-600">
                                        Você ainda não possui vínculo ativo com um psicólogo.
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Informe seu e-mail cadastrado (<strong>{user?.email}</strong>) ao seu profissional para iniciar.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {activeLinks.map((link) => (
                                        <div
                                            key={link.id}
                                            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base font-bold text-slate-900">
                                                            {link.psychologistName}
                                                        </h3>
                                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                                            CRP {link.psychologistCrp}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-teal-700 font-medium mt-0.5">
                                                        Abordagem: {link.approach.name}
                                                    </p>
                                                </div>

                                                {rejectingLinkId !== link.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setRejectingLinkId(link.id);
                                                            setRejectionReason('');
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 self-start cursor-pointer"
                                                    >
                                                        <ShieldAlert className="h-3.5 w-3.5" />
                                                        Não reconheço este vínculo
                                                    </button>
                                                )}
                                            </div>

                                            {/* Cartão educativo da abordagem */}
                                            <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-4 flex items-start gap-3">
                                                <BookOpen className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-semibold text-teal-900 mb-1">
                                                        Como funciona a {link.approach.name}?
                                                    </p>
                                                    <p className="text-sm text-teal-800 leading-relaxed">
                                                        {link.approach.patientFriendlyDescription}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Confirmação de rejeição */}
                                            {rejectingLinkId === link.id && (
                                                <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-3">
                                                    <p className="text-xs font-medium text-red-800">
                                                        Deseja realmente desvincular este profissional? Esta ação bloqueia novos agendamentos por ele.
                                                    </p>
                                                    <input
                                                        id={`reject-reason-${link.id}`}
                                                        aria-label="Motivo da rejeição do vínculo"
                                                        type="text"
                                                        maxLength={255}
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="Motivo opcional (ex.: Não sou paciente deste profissional)"
                                                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={rejectingSubmitting}
                                                            onClick={() => handleRejectLink(link.id)}
                                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg cursor-pointer disabled:opacity-60"
                                                        >
                                                            {rejectingSubmitting ? 'Rejeitando...' : 'Confirmar Rejeição'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={rejectingSubmitting}
                                                            onClick={() => {
                                                                setRejectingLinkId(null);
                                                                setRejectionReason('');
                                                            }}
                                                            className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg border border-slate-200 cursor-pointer disabled:opacity-60"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Seção 2: Minhas Sessões */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-1">
                                <Calendar className="h-5 w-5 text-teal-600" />
                                Minhas Sessões
                            </h2>
                            <p className="text-xs text-slate-500 mb-5">
                                Acompanhe seus próximos horários e histórico de atendimentos.
                            </p>

                            {sessions.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">
                                    Você ainda não possui sessões agendadas.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {sessions.map((session) => {
                                        const badge = getSessionStatusBadge(session.status);
                                        const isUpdatingThis = updatingSessionId === session.id;
                                        const pendingConfirm =
                                            confirmingSession?.id === session.id
                                                ? confirmingSession.status
                                                : null;
                                        const canDispute =
                                            session.status === 'COMPLETED' || session.status === 'NO_SHOW';

                                        return (
                                            <div
                                                key={session.id}
                                                className="py-3.5 space-y-3"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                                                            <Clock className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">
                                                                Sessão com {session.psychologistName}
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

                                                        {session.status === 'SCHEDULED' && !pendingConfirm && (
                                                            <button
                                                                type="button"
                                                                disabled={isUpdatingThis}
                                                                onClick={() =>
                                                                    setConfirmingSession({
                                                                        id: session.id,
                                                                        status: 'CANCELED',
                                                                    })
                                                                }
                                                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-60"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Cancelar
                                                            </button>
                                                        )}

                                                        {canDispute && !pendingConfirm && (
                                                            <button
                                                                type="button"
                                                                disabled={isUpdatingThis}
                                                                onClick={() =>
                                                                    setConfirmingSession({
                                                                        id: session.id,
                                                                        status: 'DISPUTED',
                                                                    })
                                                                }
                                                                title="Reportar divergência neste registro de sessão"
                                                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer disabled:opacity-60"
                                                            >
                                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                                Contestar registro
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {pendingConfirm && (
                                                    <div
                                                        className={`rounded-xl p-3.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                            pendingConfirm === 'DISPUTED'
                                                                ? 'bg-red-50 border-red-200'
                                                                : 'bg-slate-50 border-slate-200'
                                                        }`}
                                                    >
                                                        <p
                                                            className={`text-xs font-medium ${
                                                                pendingConfirm === 'DISPUTED'
                                                                    ? 'text-red-800'
                                                                    : 'text-slate-700'
                                                            }`}
                                                        >
                                                            {pendingConfirm === 'DISPUTED'
                                                                ? 'Confirmar contestação deste registro? A sessão ficará marcada em contestação.'
                                                                : 'Deseja realmente cancelar esta sessão agendada?'}
                                                        </p>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={isUpdatingThis}
                                                                onClick={() =>
                                                                    handleUpdateSession(session.id, pendingConfirm)
                                                                }
                                                                className={`px-3 py-1.5 text-white text-xs font-medium rounded-lg cursor-pointer disabled:opacity-60 ${
                                                                    pendingConfirm === 'DISPUTED'
                                                                        ? 'bg-red-600 hover:bg-red-700'
                                                                        : 'bg-slate-700 hover:bg-slate-800'
                                                                }`}
                                                            >
                                                                {isUpdatingThis
                                                                    ? 'Salvando...'
                                                                    : pendingConfirm === 'DISPUTED'
                                                                      ? 'Confirmar contestação'
                                                                      : 'Confirmar cancelamento'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isUpdatingThis}
                                                                onClick={() => setConfirmingSession(null)}
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
                    </>
                )}
            </main>
        </div>
    );
}