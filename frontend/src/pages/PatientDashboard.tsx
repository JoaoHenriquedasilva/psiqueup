import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    Clock,
    ShieldAlert,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { PATIENT_NAV_ITEMS } from '../utils/navigation';
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

    const activeLinks = links.filter((l) => l.status === 'ACTIVE');
    const upcomingSessions = sessions
        .filter((s) => s.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const nextSession = upcomingSessions[0] ?? null;

    return (
        <DashboardShell
            roleBadgeLabel="Área do Paciente"
            roleBadgeClassName="bg-slate-inst-tint text-slate-inst-ink"
            navItems={PATIENT_NAV_ITEMS}
            pageTitle="Meu Acompanhamento"
            pageSubtitle="Conheça a abordagem do profissional vinculado a você e acompanhe sua próxima sessão."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-surface">
                    <p className="text-sm text-ink-secondary">Carregando seu acompanhamento...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Card Resumo da Próxima Sessão */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-5 sm:p-6 shadow-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="h-10 w-10 rounded-xl bg-slate-inst-tint text-slate-inst flex items-center justify-center shrink-0">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                                    Próxima Sessão
                                </p>
                                {nextSession ? (
                                    <>
                                        <p className="text-base font-semibold text-ink mt-0.5">
                                            Sessão com {nextSession.psychologistName}
                                        </p>
                                        <p className="text-sm text-ink-secondary mt-0.5 flex items-center gap-1.5 tabular-nums">
                                            <Clock className="h-3.5 w-3.5 text-slate-inst" />
                                            {formatSessionDateTime(nextSession.startTime, nextSession.endTime)}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-ink-secondary mt-1">
                                        Nenhuma sessão agendada no momento.
                                    </p>
                                )}
                            </div>
                        </div>

                        <Link
                            to="/patient/sessions"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-subsurface hover:bg-subsurface-muted text-ink border border-border-subtle transition self-start sm:self-center shrink-0"
                        >
                            Ver todas as sessões ({sessions.length})
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </section>

                    {/* Profissional(is) Vinculado(s) */}
                    <section className="space-y-4">
                        <h2 className="font-display text-lg font-semibold text-ink">
                            Profissional Vinculado
                        </h2>

                        {activeLinks.length === 0 ? (
                            <div className="bg-surface rounded-2xl border border-border-subtle p-8 text-center shadow-surface">
                                <p className="text-sm font-medium text-ink">
                                    Você ainda não possui vínculo ativo com um psicólogo.
                                </p>
                                <p className="text-xs text-ink-secondary mt-1.5">
                                    Informe seu e-mail cadastrado (<strong>{user?.email}</strong>) ao seu
                                    profissional para iniciar o acompanhamento.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {activeLinks.map((link) => (
                                    <article
                                        key={link.id}
                                        className="bg-surface rounded-2xl border border-border-subtle shadow-surface overflow-hidden"
                                    >
                                        <div className="p-6 space-y-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3.5">
                                                    <InitialsAvatar
                                                        name={link.psychologistName}
                                                        sizeClassName="h-11 w-11 text-sm"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-display text-base font-bold text-ink">
                                                                {link.psychologistName}
                                                            </h3>
                                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-inst-tint text-slate-inst-ink border border-slate-inst-border font-medium tabular-nums">
                                                                CRP {link.psychologistCrp}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-primary-ink font-medium mt-0.5">
                                                            Abordagem: {link.approach.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sub-painel acolhedor da abordagem */}
                                            <div className="rounded-xl bg-primary-tint border border-primary-tint-border p-4 flex items-start gap-3">
                                                <BookOpen className="h-5 w-5 text-primary-ink shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-semibold text-primary-tint-ink mb-1">
                                                        Como funciona a {link.approach.name}?
                                                    </p>
                                                    <p className="text-sm text-primary-tint-ink/90 leading-relaxed">
                                                        {link.approach.patientFriendlyDescription}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Confirmação de rejeição */}
                                            {rejectingLinkId === link.id && (
                                                <div className="rounded-xl bg-danger-bg border border-danger-border p-4 space-y-3">
                                                    <p className="text-xs font-medium text-danger-ink">
                                                        Deseja realmente desvincular este profissional? Esta
                                                        ação bloqueia novos agendamentos por ele.
                                                    </p>
                                                    <input
                                                        id={`reject-reason-${link.id}`}
                                                        aria-label="Motivo da rejeição do vínculo"
                                                        type="text"
                                                        maxLength={255}
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="Motivo opcional (ex.: Não sou paciente deste profissional)"
                                                        className="w-full px-3 py-2 bg-surface border border-danger-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-danger-ink/20"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={rejectingSubmitting}
                                                            onClick={() => handleRejectLink(link.id)}
                                                            className="px-3.5 py-1.5 bg-danger-solid hover:bg-danger-solid-hover text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            {rejectingSubmitting
                                                                ? 'Rejeitando...'
                                                                : 'Confirmar Rejeição'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={rejectingSubmitting}
                                                            onClick={() => {
                                                                setRejectingLinkId(null);
                                                                setRejectionReason('');
                                                            }}
                                                            className="px-3.5 py-1.5 bg-surface text-ink-secondary text-xs font-medium rounded-lg border border-border-subtle hover:bg-subsurface-muted cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Rodapé discreto com ação de segurança */}
                                        {rejectingLinkId !== link.id && (
                                            <div className="px-6 py-3 bg-subsurface border-t border-border-subtle flex items-center justify-between gap-3">
                                                <span className="text-xs text-ink-secondary">
                                                    Vínculo ativo para agendamentos clínicos
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRejectingLinkId(link.id);
                                                        setRejectionReason('');
                                                    }}
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-danger-ink transition cursor-pointer"
                                                >
                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                    Não reconheço este vínculo
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </DashboardShell>
    );
}
