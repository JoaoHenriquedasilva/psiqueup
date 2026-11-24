import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    Calendar,
    Clock,
    History,
    XCircle,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { PATIENT_NAV_ITEMS } from '../utils/navigation';
import { getSessionStatusBadge } from '../utils/sessionStatus';
import type { SessionItem } from '../types/api';

export function PatientSessionsPage() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);
    const [confirmingSession, setConfirmingSession] = useState<{
        id: number;
        status: 'CANCELED' | 'DISPUTED';
    } | null>(null);

    useEffect(() => {
        let cancelled = false;

        api.get<SessionItem[]>('/sessions')
            .then((res) => {
                if (!cancelled) {
                    setSessions(res.data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: 'Não foi possível carregar suas sessões.',
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

    const upcomingSessions = sessions
        .filter((s) => s.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const historySessions = sessions
        .filter((s) => s.status !== 'SCHEDULED')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    function renderSessionRow(session: SessionItem) {
        const badge = getSessionStatusBadge(session.status);
        const isUpdatingThis = updatingSessionId === session.id;
        const pendingConfirm =
            confirmingSession?.id === session.id ? confirmingSession.status : null;
        const canDispute =
            session.status === 'COMPLETED' || session.status === 'NO_SHOW';

        return (
            <div key={session.id} className="py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-[#F0F2ED] text-[#4A5D61] mt-0.5">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#132226]">
                                Sessão com {session.psychologistName}
                            </p>
                            <p className="text-xs text-[#4A5D61] mt-0.5 tabular-nums">
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
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#526064] bg-[#F9FAF8] hover:bg-[#F0F2ED] rounded-lg border border-[#E2E6E1] cursor-pointer disabled:opacity-60 transition"
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
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#9E2A2B] bg-[#FDF0EF] hover:bg-[#FADBD9] rounded-lg border border-[#F3C9C8] cursor-pointer disabled:opacity-60 transition"
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
                                ? 'bg-[#FDF0EF] border-[#F3C9C8]'
                                : 'bg-[#F9FAF8] border-[#E2E6E1]'
                        }`}
                    >
                        <p
                            className={`text-xs font-medium ${
                                pendingConfirm === 'DISPUTED'
                                    ? 'text-[#9E2A2B]'
                                    : 'text-[#132226]'
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
                                className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 transition ${
                                    pendingConfirm === 'DISPUTED'
                                        ? 'bg-[#9E2A2B] hover:bg-[#822223]'
                                        : 'bg-[#132226] hover:bg-[#23393F]'
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
                                className="px-3 py-1.5 bg-white text-[#4A5D61] text-xs font-medium rounded-lg border border-[#E2E6E1] hover:bg-[#F9FAF8] cursor-pointer disabled:opacity-60 transition"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <DashboardShell
            roleBadgeLabel="Área do Paciente"
            roleBadgeClassName="bg-[#EEF3F7] text-[#2E4A63]"
            navItems={PATIENT_NAV_ITEMS}
            pageTitle="Minhas Sessões"
            pageSubtitle="Acompanhe seus próximos horários agendados e o histórico de atendimentos."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-white rounded-2xl border border-[#E2E6E1] p-12 text-center shadow-surface">
                    <p className="text-sm text-[#4A5D61]">Carregando suas sessões...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Próximas Sessões (SCHEDULED) */}
                    <section className="bg-white rounded-2xl border border-[#E2E6E1] p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-display text-lg font-semibold text-[#132226] flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-[#1E6B63]" />
                                Próximas Sessões
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EEF3F7] text-[#2E4A63] tabular-nums">
                                {upcomingSessions.length}
                            </span>
                        </div>

                        {upcomingSessions.length === 0 ? (
                            <p className="text-sm text-[#4A5D61] text-center py-6">
                                Você não possui próximas sessões agendadas.
                            </p>
                        ) : (
                            <div className="divide-y divide-[#E2E6E1]">
                                {upcomingSessions.map(renderSessionRow)}
                            </div>
                        )}
                    </section>

                    {/* Histórico */}
                    <section className="bg-white rounded-2xl border border-[#E2E6E1] p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-display text-lg font-semibold text-[#132226] flex items-center gap-2">
                                <History className="h-5 w-5 text-[#3B5B78]" />
                                Histórico de Atendimentos
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F0F2ED] text-[#4A5D61] tabular-nums">
                                {historySessions.length}
                            </span>
                        </div>

                        {historySessions.length === 0 ? (
                            <p className="text-sm text-[#4A5D61] text-center py-6">
                                Nenhum registro no histórico até o momento.
                            </p>
                        ) : (
                            <div className="divide-y divide-[#E2E6E1]">
                                {historySessions.map(renderSessionRow)}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </DashboardShell>
    );
}
