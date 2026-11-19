import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    BookOpen,
    Brain,
    Calendar,
    Clock,
    LogOut,
    ShieldAlert,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { SESSION_STATUS_LABELS } from '../utils/sessionStatus';
import type { SessionItem, TherapeuticLink } from '../types/api';

export function PatientDashboard() {
    const { user, logout } = useAuth();

    const [links, setLinks] = useState<TherapeuticLink[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Estado para rejeição de vínculo
    const [rejectingLinkId, setRejectingLinkId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

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
        try {
            await api.patch(`/links/${linkId}/reject`, {
                reason: rejectionReason.trim() || null,
            });
            setRejectingLinkId(null);
            setRejectionReason('');
            setFeedback({ type: 'success', text: 'Vínculo rejeitado com segurança.' });
            const data = await fetchPatientData();
            setLinks(data.links);
            setSessions(data.sessions);
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao rejeitar vínculo.'),
            });
        }
    }

    async function handleUpdateSession(sessionId: number, status: 'CANCELED' | 'DISPUTED') {
        setFeedback(null);
        try {
            await api.patch(`/sessions/${sessionId}/status`, { status });
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, status } : s))
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
        }
    }

    const activeLinks = links.filter((l) => l.status === 'ACTIVE');

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                            <Brain className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="font-bold text-slate-900">PsiqueUp</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                                Área do Paciente
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 hidden sm:inline">
                            Olá, <strong>{user?.name}</strong>
                        </span>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer"
                        >
                            <LogOut className="h-4 w-4" />
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                {feedback && (
                    <div
                        className={`rounded-xl px-4 py-3 text-sm border flex items-center justify-between ${feedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                    >
                        <span>{feedback.text}</span>
                        <button onClick={() => setFeedback(null)} className="text-xs underline ml-4 cursor-pointer">
                            Fechar
                        </button>
                    </div>
                )}

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
                                                        onClick={() => setRejectingLinkId(link.id)}
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
                                                        type="text"
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="Motivo opcional (ex.: Não sou paciente deste profissional)"
                                                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleRejectLink(link.id)}
                                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                                                        >
                                                            Confirmar Rejeição
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRejectingLinkId(null);
                                                                setRejectionReason('');
                                                            }}
                                                            className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg border border-slate-200 cursor-pointer"
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
                                        const badge = SESSION_STATUS_LABELS[session.status];

                                        return (
                                            <div
                                                key={session.id}
                                                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
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

                                                    {session.status === 'SCHEDULED' && (
                                                        <button
                                                            onClick={() => handleUpdateSession(session.id, 'CANCELED')}
                                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            Cancelar
                                                        </button>
                                                    )}

                                                    {session.status === 'COMPLETED' && (
                                                        <button
                                                            onClick={() => handleUpdateSession(session.id, 'DISPUTED')}
                                                            title="Reportar que este atendimento não ocorreu"
                                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer"
                                                        >
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                            Contestar registro
                                                        </button>
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