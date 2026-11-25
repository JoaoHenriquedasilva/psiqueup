import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    Lock,
    ShieldAlert,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { useCpfField } from '../hooks/useCpfField';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { PATIENT_NAV_ITEMS } from '../utils/navigation';
import type { PatientProfile, SessionItem, TherapeuticLink } from '../types/api';

export function PatientDashboard() {
    const [links, setLinks] = useState<TherapeuticLink[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    // Cadastro complementar de CPF (quando ausente)
    const cpfField = useCpfField();
    const [savingCpf, setSavingCpf] = useState(false);

    // Estado para aceite ou rejeição de vínculo
    const [acceptingLinkId, setAcceptingLinkId] = useState<number | null>(null);
    const [rejectingLinkId, setRejectingLinkId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectingSubmitting, setRejectingSubmitting] = useState(false);

    async function fetchPatientData() {
        const [linksRes, sessionsRes, profileRes] = await Promise.all([
            api.get<TherapeuticLink[]>('/links'),
            api.get<SessionItem[]>('/sessions'),
            api.get<PatientProfile>('/profiles/patient/me'),
        ]);
        return {
            links: linksRes.data,
            sessions: sessionsRes.data,
            profile: profileRes.data,
        };
    }

    useEffect(() => {
        let cancelled = false;

        fetchPatientData()
            .then((data) => {
                if (!cancelled) {
                    setLinks(data.links);
                    setSessions(data.sessions);
                    setPatientProfile(data.profile);
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

    async function handleSaveCpf(e: FormEvent) {
        e.preventDefault();
        setFeedback(null);

        if (!cpfField.validateCpf()) {
            return;
        }

        setSavingCpf(true);
        try {
            const { data } = await api.put<PatientProfile>('/profiles/patient/me', {
                cpf: cpfField.strippedCpf,
            });
            setPatientProfile(data);
            cpfField.resetCpf();
            setFeedback({
                type: 'success',
                text: 'CPF salvo com segurança! Agora você pode receber solicitações de vínculo.',
            });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível salvar seu CPF.'),
            });
        } finally {
            setSavingCpf(false);
        }
    }

    async function handleAcceptLink(linkId: number) {
        setFeedback(null);
        setAcceptingLinkId(linkId);
        setRejectingLinkId(null);
        setRejectionReason('');
        try {
            const { data: acceptedLink } = await api.patch<TherapeuticLink>(
                `/links/${linkId}/accept`
            );
            setLinks((prev) => prev.map((l) => (l.id === linkId ? acceptedLink : l)));
            setFeedback({
                type: 'success',
                text: 'Vínculo aceito! Agora você e seu psicólogo podem acompanhar suas sessões.',
            });

            try {
                const data = await fetchPatientData();
                setLinks(data.links);
                setSessions(data.sessions);
                setPatientProfile(data.profile);
            } catch {
                // Mantém o vínculo aceito localmente caso a recarga falhe
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao aceitar vínculo.'),
            });
        } finally {
            setAcceptingLinkId(null);
        }
    }

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
            setFeedback({ type: 'success', text: 'Vínculo recusado com segurança.' });

            try {
                const data = await fetchPatientData();
                setLinks(data.links);
                setSessions(data.sessions);
                setPatientProfile(data.profile);
            } catch {
                // Mantém o vínculo já rejeitado localmente caso a recarga falhe
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao recusar vínculo.'),
            });
        } finally {
            setRejectingSubmitting(false);
        }
    }

    const pendingLinks = links.filter((l) => l.status === 'PENDING');
    const activeLinks = links.filter((l) => l.status === 'ACTIVE');
    const needsCpf = patientProfile !== null && (!patientProfile.hasCpf || patientProfile.cpfMasked === null);

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
                    {/* Solicitações de Vínculo Pendentes (Consentimento Ativo — topo absoluto) */}
                    {pendingLinks.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-warning-ink" />
                                    Solicitações de Vínculo Pendentes
                                </h2>
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-ink border border-warning-border tabular-nums">
                                    {pendingLinks.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {pendingLinks.map((link) => {
                                    const isAccepting = acceptingLinkId === link.id;
                                    const isConfirmingReject = rejectingLinkId === link.id;

                                    return (
                                        <article
                                            key={link.id}
                                            className="bg-surface rounded-2xl border-2 border-warning-border shadow-surface overflow-hidden"
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
                                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-ink border border-warning-border font-medium">
                                                                    Aguardando sua ação
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-primary-ink font-medium mt-0.5">
                                                                Abordagem: {link.approach.name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Box educativo da abordagem */}
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

                                                {isConfirmingReject ? (
                                                    <div className="rounded-xl bg-danger-bg border border-danger-border p-4 space-y-3">
                                                        <p className="text-xs font-medium text-danger-ink">
                                                            Deseja recusar esta solicitação de vínculo?
                                                            O profissional não poderá agendar sessões
                                                            com você.
                                                        </p>
                                                        <input
                                                            id={`reject-pending-reason-${link.id}`}
                                                            aria-label="Motivo opcional da recusa do vínculo"
                                                            type="text"
                                                            maxLength={255}
                                                            value={rejectionReason}
                                                            onChange={(e) =>
                                                                setRejectionReason(e.target.value)
                                                            }
                                                            placeholder="Motivo opcional (ex.: Não reconheço esta solicitação)"
                                                            className="w-full px-3 py-2 bg-surface border border-danger-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-danger-ink/20"
                                                        />
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={rejectingSubmitting}
                                                                onClick={() =>
                                                                    handleRejectLink(link.id)
                                                                }
                                                                className="px-3.5 py-1.5 bg-danger-solid hover:bg-danger-solid-hover text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 transition"
                                                            >
                                                                {rejectingSubmitting
                                                                    ? 'Recusando...'
                                                                    : 'Confirmar recusa'}
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
                                                ) : (
                                                    <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <p className="text-xs text-ink-secondary">
                                                            Ao aceitar, este profissional poderá
                                                            agendar sessões com você.
                                                        </p>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={isAccepting}
                                                                onClick={() =>
                                                                    handleAcceptLink(link.id)
                                                                }
                                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-success-solid hover:bg-success-solid-hover text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-60 transition"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                {isAccepting
                                                                    ? 'Aceitando...'
                                                                    : 'Aceitar vínculo'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isAccepting}
                                                                onClick={() => {
                                                                    setRejectingLinkId(link.id);
                                                                    setRejectionReason('');
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-danger-bg text-danger-ink border border-danger-border hover:opacity-90 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-60 transition"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Recusar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Banner discreto de CPF ausente */}
                    {needsCpf && (
                        <section className="bg-slate-inst-tint border border-slate-inst-border rounded-2xl p-5 shadow-surface space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-xl bg-surface border border-slate-inst-border text-slate-inst flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-inst-ink">
                                        Complete seu cadastro com seu CPF
                                    </h2>
                                    <p className="text-xs text-slate-inst-ink/85 mt-0.5 leading-relaxed">
                                        Protegido por criptografia (hash). Usado apenas para que seu
                                        psicólogo ou consultório possa solicitar vínculo clínico com
                                        você, em sigilo (LGPD).
                                    </p>
                                </div>
                            </div>

                            <form
                                onSubmit={handleSaveCpf}
                                className="flex flex-col sm:flex-row items-start gap-2.5 sm:pl-12"
                            >
                                <div className="w-full sm:max-w-xs">
                                    <input
                                        id="patient-profile-cpf"
                                        aria-label="Seu CPF"
                                        type="text"
                                        inputMode="numeric"
                                        required
                                        maxLength={14}
                                        disabled={savingCpf}
                                        value={cpfField.cpf}
                                        onChange={(e) => cpfField.handleCpfChange(e.target.value)}
                                        onBlur={cpfField.handleCpfBlur}
                                        placeholder="000.000.000-00"
                                        className={`w-full px-3.5 py-2 bg-surface border rounded-xl text-sm text-ink tabular-nums placeholder:text-ink-secondary/60 focus:outline-none focus:ring-2 transition disabled:opacity-60 ${
                                            cpfField.cpfError
                                                ? 'border-danger-ink focus:ring-danger-ink/20 focus:border-danger-ink'
                                                : 'border-slate-inst-border focus:ring-slate-inst/20 focus:border-slate-inst'
                                        }`}
                                    />
                                    {cpfField.cpfError && (
                                        <p className="text-xs text-danger-ink mt-1">
                                            {cpfField.cpfError}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={savingCpf}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-60 shrink-0"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    {savingCpf ? 'Salvando...' : 'Salvar CPF'}
                                </button>
                            </form>
                        </section>
                    )}

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
                                            {formatSessionDateTime(
                                                nextSession.startTime,
                                                nextSession.endTime
                                            )}
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
                                    Informe seu <strong>CPF</strong> cadastrado
                                    {patientProfile?.cpfMasked ? (
                                        <>
                                            {' '}
                                            (
                                            <span className="tabular-nums font-medium">
                                                {patientProfile.cpfMasked}
                                            </span>
                                            )
                                        </>
                                    ) : null}{' '}
                                    ao seu psicólogo ou consultório para receber a solicitação de
                                    vínculo aqui.
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
                                                        Deseja realmente desvincular este
                                                        profissional? Esta ação bloqueia novos
                                                        agendamentos por ele.
                                                    </p>
                                                    <input
                                                        id={`reject-reason-${link.id}`}
                                                        aria-label="Motivo da rejeição do vínculo"
                                                        type="text"
                                                        maxLength={255}
                                                        value={rejectionReason}
                                                        onChange={(e) =>
                                                            setRejectionReason(e.target.value)
                                                        }
                                                        placeholder="Motivo opcional (ex.: Não sou paciente deste profissional)"
                                                        className="w-full px-3 py-2 bg-surface border border-danger-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-danger-ink/20"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={rejectingSubmitting}
                                                            onClick={() =>
                                                                handleRejectLink(link.id)
                                                            }
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
