import { useEffect, useState, type FormEvent } from 'react';
import {
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    Send,
    UserCheck,
    UserPlus,
    UserX,
    Users,
    XCircle,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { useCpfField } from '../hooks/useCpfField';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { ADMIN_NAV_ITEMS } from '../utils/navigation';
import type {
    AdminPsychologistItem,
    ClinicLinkItem,
    NeutralActionResponse,
} from '../types/api';

export function AdminPsychologistsPage() {
    const [psychologists, setPsychologists] = useState<AdminPsychologistItem[]>([]);
    const [pendingRequests, setPendingRequests] = useState<ClinicLinkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    // Controle de solicitação de vínculo (aprovar / recusar com confirmação inline)
    const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
    const [confirmingRejectId, setConfirmingRejectId] = useState<number | null>(null);

    // Triagem de pacientes
    const [triagePsychologistId, setTriagePsychologistId] = useState<number | ''>('');
    const triageCpfField = useCpfField();
    const [submittingTriage, setSubmittingTriage] = useState(false);

    // Controle de ativação/desativação inline de profissionais
    const [confirmingDeactivateId, setConfirmingDeactivateId] = useState<number | null>(null);
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            api.get<AdminPsychologistItem[]>('/admin/psychologists'),
            api.get<ClinicLinkItem[]>('/admin/psychologist-requests', {
                params: { status: 'PENDING' },
            }),
        ])
            .then(([psychologistsRes, requestsRes]) => {
                if (cancelled) return;
                setPsychologists(psychologistsRes.data);
                setPendingRequests(requestsRes.data);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(
                            err,
                            'Erro ao carregar psicólogos e solicitações.'
                        ),
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

    async function refreshClinicData() {
        const [psychologistsRes, requestsRes] = await Promise.all([
            api.get<AdminPsychologistItem[]>('/admin/psychologists'),
            api.get<ClinicLinkItem[]>('/admin/psychologist-requests', {
                params: { status: 'PENDING' },
            }),
        ]);
        setPsychologists(psychologistsRes.data);
        setPendingRequests(requestsRes.data);
    }

    async function handleApproveRequest(request: ClinicLinkItem) {
        setFeedback(null);
        setProcessingRequestId(request.id);
        setConfirmingRejectId(null);
        try {
            await api.patch<ClinicLinkItem>(
                `/admin/psychologist-requests/${request.id}/approve`
            );
            setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
            setFeedback({
                type: 'success',
                text: `${request.psychologistName} foi aprovado(a) no consultório.`,
            });
            try {
                await refreshClinicData();
            } catch {
                // Mantém estado local caso o refresh falhe
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível aprovar a solicitação.'),
            });
        } finally {
            setProcessingRequestId(null);
        }
    }

    async function handleRejectRequest(request: ClinicLinkItem) {
        setFeedback(null);
        setProcessingRequestId(request.id);
        try {
            await api.patch<ClinicLinkItem>(
                `/admin/psychologist-requests/${request.id}/reject`
            );
            setConfirmingRejectId(null);
            setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
            setFeedback({
                type: 'success',
                text: `Solicitação de ${request.psychologistName} recusada.`,
            });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível recusar a solicitação.'),
            });
        } finally {
            setProcessingRequestId(null);
        }
    }

    async function handleTriageSubmit(e: FormEvent) {
        e.preventDefault();
        setFeedback(null);

        if (!triagePsychologistId) {
            setFeedback({
                type: 'error',
                text: 'Selecione um psicólogo de destino para a triagem.',
            });
            return;
        }

        if (!triageCpfField.validateCpf()) {
            return;
        }

        setSubmittingTriage(true);
        try {
            const { data } = await api.post<NeutralActionResponse>('/admin/triage', {
                psychologistId: Number(triagePsychologistId),
                cpf: triageCpfField.strippedCpf,
            });
            triageCpfField.resetCpf();
            setTriagePsychologistId('');
            setFeedback({
                type: 'info',
                text:
                    data?.message ||
                    'Encaminhamento processado. Se o CPF estiver cadastrado e elegível, o paciente receberá a solicitação de vínculo.',
            });
            try {
                const { data: updatedPsychs } = await api.get<AdminPsychologistItem[]>(
                    '/admin/psychologists'
                );
                setPsychologists(updatedPsychs);
            } catch {
                // Mantém estado local caso o refresh falhe
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível enviar a indicação.'),
            });
        } finally {
            setSubmittingTriage(false);
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
                const { data } = await api.get<AdminPsychologistItem[]>('/admin/psychologists');
                setPsychologists(data);
            } catch {
                // Mantém o estado já atualizado localmente caso o refresh falhe
            }
        } catch (err: unknown) {
            setConfirmingDeactivateId(null);
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(
                    err,
                    'Não foi possível desativar a conta. Verifique se há vínculos ativos externos ou autônomos.'
                ),
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setUpdatingUserId(null);
        }
    }

    const activeApprovedPsychologists = psychologists.filter((p) => p.active && p.crp);

    return (
        <DashboardShell
            roleBadgeLabel="Administração"
            roleBadgeClassName="bg-warning-bg text-warning-ink"
            navItems={ADMIN_NAV_ITEMS}
            pageTitle="Psicólogos & Triagem"
            pageSubtitle="Aprove solicitações de vínculo, encaminhe pacientes na triagem e gerencie os profissionais do consultório."
            headerAction={
                <a
                    href="https://cadastro.cfp.org.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary-tint-ink bg-primary-tint hover:opacity-90 rounded-xl border border-primary-tint-border transition"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Consultar Cadastro Nacional CFP
                </a>
            }
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-surface">
                    <p className="text-sm text-ink-secondary">
                        Carregando equipe e solicitações do consultório...
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Bloco 1: Solicitações de Vínculo Pendentes (PENDING) */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                                <Clock className="h-5 w-5 text-warning-ink" />
                                Solicitações de Vínculo Pendentes
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-ink border border-warning-border tabular-nums">
                                {pendingRequests.length}
                            </span>
                        </div>

                        {pendingRequests.length === 0 ? (
                            <div className="rounded-xl bg-subsurface border border-border-subtle p-5 flex items-center gap-3 text-sm text-ink-secondary">
                                <CheckCircle2 className="h-4 w-4 text-success-ink shrink-0" />
                                Nenhuma solicitação de vínculo pendente no momento.
                            </div>
                        ) : (
                            <div className="divide-y divide-border-subtle">
                                {pendingRequests.map((req) => {
                                    const isProcessing = processingRequestId === req.id;
                                    const isConfirmingReject = confirmingRejectId === req.id;

                                    return (
                                        <div key={req.id} className="py-4 space-y-3">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <InitialsAvatar name={req.psychologistName} />
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-ink">
                                                                {req.psychologistName}
                                                            </p>
                                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-inst-tint text-slate-inst-ink border border-slate-inst-border font-medium tabular-nums">
                                                                CRP {req.psychologistCrp}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-ink-secondary">
                                                            {req.psychologistEmail}
                                                            {req.approachName
                                                                ? ` • ${req.approachName}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                {!isConfirmingReject && (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <button
                                                            type="button"
                                                            disabled={isProcessing}
                                                            onClick={() =>
                                                                handleApproveRequest(req)
                                                            }
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-success-solid hover:bg-success-solid-hover rounded-lg cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            <UserCheck className="h-3.5 w-3.5" />
                                                            {isProcessing
                                                                ? 'Processando...'
                                                                : 'Aprovar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isProcessing}
                                                            onClick={() =>
                                                                setConfirmingRejectId(req.id)
                                                            }
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-danger-ink bg-danger-bg hover:opacity-90 rounded-lg border border-danger-border cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            Recusar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isConfirmingReject && (
                                                <div className="rounded-xl bg-danger-bg border border-danger-border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <p className="text-xs font-medium text-danger-ink">
                                                        Recusar a solicitação de{' '}
                                                        <strong>{req.psychologistName}</strong>?
                                                    </p>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={isProcessing}
                                                            onClick={() =>
                                                                handleRejectRequest(req)
                                                            }
                                                            className="px-3 py-1.5 bg-danger-solid hover:bg-danger-solid-hover text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            {isProcessing
                                                                ? 'Recusando...'
                                                                : 'Confirmar recusa'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isProcessing}
                                                            onClick={() =>
                                                                setConfirmingRejectId(null)
                                                            }
                                                            className="px-3 py-1.5 bg-surface text-ink-secondary text-xs font-medium rounded-lg border border-border-subtle hover:bg-subsurface-muted cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            Cancelar
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

                    {/* Bloco 2: Triagem de Pacientes */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-inst-tint text-slate-inst flex items-center justify-center shrink-0">
                                <UserPlus className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="font-display text-lg font-semibold text-ink">
                                    Triagem de Pacientes
                                </h2>
                                <p className="text-xs text-ink-secondary mt-0.5">
                                    Encaminhe pacientes pelo CPF para os psicólogos aprovados. O vínculo será ativado após o consentimento do paciente.
                                </p>
                            </div>
                        </div>

                        {activeApprovedPsychologists.length === 0 && (
                            <div className="rounded-xl bg-neutral-bg border border-neutral-border px-4 py-3 text-xs text-neutral-ink">
                                Nenhum psicólogo aprovado e ativo com CRP disponível para triagem no momento. Aprove uma solicitação acima para iniciar encaminhamentos.
                            </div>
                        )}

                        <form
                            onSubmit={handleTriageSubmit}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                        >
                            <div className="md:col-span-5">
                                <label
                                    htmlFor="triage-psychologist"
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                >
                                    Psicólogo(a) de destino
                                </label>
                                <select
                                    id="triage-psychologist"
                                    required
                                    disabled={
                                        submittingTriage ||
                                        activeApprovedPsychologists.length === 0
                                    }
                                    value={triagePsychologistId}
                                    onChange={(e) =>
                                        setTriagePsychologistId(
                                            e.target.value ? Number(e.target.value) : ''
                                        )
                                    }
                                    className="w-full px-3.5 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink disabled:opacity-60"
                                >
                                    <option value="">Selecione um profissional...</option>
                                    {activeApprovedPsychologists.map((psych) => (
                                        <option key={psych.userId} value={psych.userId}>
                                            {psych.name} — CRP {psych.crp}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-5">
                                <label
                                    htmlFor="triage-patient-cpf"
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                                >
                                    CPF do paciente
                                </label>
                                <div className="relative">
                                    <FileText className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                                    <input
                                        id="triage-patient-cpf"
                                        type="text"
                                        inputMode="numeric"
                                        required
                                        maxLength={14}
                                        disabled={
                                            submittingTriage ||
                                            activeApprovedPsychologists.length === 0
                                        }
                                        value={triageCpfField.cpf}
                                        onChange={(e) =>
                                            triageCpfField.handleCpfChange(e.target.value)
                                        }
                                        onBlur={triageCpfField.handleCpfBlur}
                                        placeholder="000.000.000-00"
                                        className={`w-full pl-10 pr-3.5 py-2.5 bg-subsurface border rounded-xl text-sm text-ink tabular-nums placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 transition disabled:opacity-60 ${
                                            triageCpfField.cpfError
                                                ? 'border-danger-ink focus:ring-danger-ink/20 focus:border-danger-ink'
                                                : 'border-border-subtle focus:ring-primary-ink/20 focus:border-primary-ink'
                                        }`}
                                    />
                                </div>
                                {triageCpfField.cpfError && (
                                    <p className="text-xs text-danger-ink mt-1">
                                        {triageCpfField.cpfError}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2 md:pt-[22px]">
                                <button
                                    type="submit"
                                    disabled={
                                        submittingTriage ||
                                        activeApprovedPsychologists.length === 0
                                    }
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    {submittingTriage ? 'Enviando...' : 'Enviar indicação'}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Bloco 3: Profissionais do Consultório (APPROVED) */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary-ink" />
                                Profissionais do Consultório
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-subsurface-muted text-ink-secondary tabular-nums">
                                {psychologists.length}
                            </span>
                        </div>

                        {psychologists.length === 0 ? (
                            <p className="text-sm text-ink-secondary text-center py-8">
                                Nenhum psicólogo vinculado ao consultório até o momento.
                            </p>
                        ) : (
                            <div className="divide-y divide-border-subtle">
                                {psychologists.map((psych) => {
                                    const isUpdating = updatingUserId === psych.userId;
                                    const isConfirming = confirmingDeactivateId === psych.userId;

                                    return (
                                        <div key={psych.userId} className="py-4 space-y-3">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <InitialsAvatar name={psych.name} />
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-ink">
                                                                {psych.name}
                                                            </p>
                                                            <span
                                                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                                                                    psych.active
                                                                        ? 'bg-success-bg text-success-ink border-success-border'
                                                                        : 'bg-neutral-bg text-neutral-ink border-neutral-border'
                                                                }`}
                                                            >
                                                                {psych.active ? 'Ativo' : 'Inativo'}
                                                            </span>
                                                            {psych.crp ? (
                                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-inst-tint text-slate-inst-ink border border-slate-inst-border font-medium tabular-nums">
                                                                    CRP {psych.crp}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-ink border border-warning-border font-medium">
                                                                    CRP Pendente
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-ink-secondary">
                                                            {psych.email}
                                                            {psych.approachName
                                                                ? ` • ${psych.approachName}`
                                                                : ''}
                                                        </p>
                                                        <p className="text-xs text-ink-secondary tabular-nums">
                                                            {psych.activePatientsCount} paciente(s)
                                                            ativo(s) • {psych.totalSessionsCount}{' '}
                                                            sessão(ões)
                                                            {psych.disputedSessionsCount > 0 && (
                                                                <span className="text-danger-ink font-semibold ml-1.5">
                                                                    • {psych.disputedSessionsCount}{' '}
                                                                    contestação(ões)
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {psych.active ? (
                                                        !isConfirming && (
                                                            <button
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={() =>
                                                                    setConfirmingDeactivateId(
                                                                        psych.userId
                                                                    )
                                                                }
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger-ink bg-danger-bg hover:opacity-90 rounded-lg border border-danger-border cursor-pointer disabled:opacity-60 transition"
                                                            >
                                                                <UserX className="h-3.5 w-3.5" />
                                                                Desativar conta
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={isUpdating}
                                                            onClick={() =>
                                                                handleToggleUserStatus(
                                                                    psych.userId,
                                                                    true
                                                                )
                                                            }
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success-ink bg-success-bg hover:opacity-90 rounded-lg border border-success-border cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            <UserCheck className="h-3.5 w-3.5" />
                                                            {isUpdating
                                                                ? 'Reativando...'
                                                                : 'Reativar conta'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {isConfirming && (
                                                <div className="rounded-xl bg-danger-bg border border-danger-border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <p className="text-xs font-medium text-danger-ink">
                                                        Desativar a conta de{' '}
                                                        <strong>{psych.name}</strong>? O acesso será
                                                        bloqueado imediatamente. Contas com vínculos
                                                        ativos externos ou autônomos não podem ser
                                                        desativadas.
                                                    </p>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={isUpdating}
                                                            onClick={() =>
                                                                handleToggleUserStatus(
                                                                    psych.userId,
                                                                    false
                                                                )
                                                            }
                                                            className="px-3 py-1.5 bg-danger-solid hover:bg-danger-solid-hover text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 transition"
                                                        >
                                                            {isUpdating
                                                                ? 'Desativando...'
                                                                : 'Confirmar desativação'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isUpdating}
                                                            onClick={() =>
                                                                setConfirmingDeactivateId(null)
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
