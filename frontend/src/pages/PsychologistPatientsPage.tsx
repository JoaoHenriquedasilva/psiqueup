import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeAlert, Clock, ShieldX, UserPlus, Users } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { useCpfField } from '../hooks/useCpfField';
import { api } from '../services/api';
import { extractApiErrorMessage, isApiHttpStatus } from '../utils/apiError';
import { PSYCHOLOGIST_NAV_ITEMS } from '../utils/navigation';
import type {
    LinkStatus,
    NeutralActionResponse,
    PsychologistProfile,
    TherapeuticLink,
} from '../types/api';

const LINK_STATUS_BADGE: Record<LinkStatus, { label: string; className: string }> = {
    PENDING: {
        label: 'Aguardando aceite',
        className: 'bg-warning-bg text-warning-ink border-warning-border',
    },
    ACTIVE: {
        label: 'Ativo',
        className: 'bg-success-bg text-success-ink border-success-border',
    },
    REJECTED: {
        label: 'Rejeitado',
        className: 'bg-danger-bg text-danger-ink border-danger-border',
    },
    REVOKED: {
        label: 'Revogado',
        className: 'bg-neutral-bg text-neutral-ink border-neutral-border',
    },
};

export function PsychologistPatientsPage() {
    const [links, setLinks] = useState<TherapeuticLink[]>([]);
    const [profileMissing, setProfileMissing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    const cpfField = useCpfField();
    const [linkingPatient, setLinkingPatient] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadPatientsData() {
            try {
                const [linksRes, profileRes] = await Promise.allSettled([
                    api.get<TherapeuticLink[]>('/links'),
                    api.get<PsychologistProfile>('/profiles/psychologist/me'),
                ]);

                if (cancelled) return;

                if (linksRes.status === 'fulfilled') {
                    setLinks(linksRes.value.data);
                } else {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(
                            linksRes.reason,
                            'Erro ao carregar lista de pacientes.'
                        ),
                    });
                }

                if (profileRes.status === 'fulfilled') {
                    setProfileMissing(false);
                } else if (isApiHttpStatus(profileRes.reason, 404)) {
                    setProfileMissing(true);
                } else if (linksRes.status === 'fulfilled') {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(
                            profileRes.reason,
                            'Erro ao verificar perfil profissional.'
                        ),
                    });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadPatientsData();

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleLinkPatient(e: FormEvent) {
        e.preventDefault();
        setFeedback(null);

        if (!cpfField.validateCpf()) {
            return;
        }

        setLinkingPatient(true);
        try {
            const { data } = await api.post<NeutralActionResponse>('/links', {
                cpf: cpfField.strippedCpf,
            });
            cpfField.resetCpf();
            setFeedback({
                type: 'info',
                text:
                    data?.message ||
                    'Solicitação processada. Se o CPF estiver cadastrado e elegível, o paciente receberá o pedido de consentimento no painel dele.',
            });

            try {
                const { data: updatedLinks } = await api.get<TherapeuticLink[]>('/links');
                setLinks(updatedLinks);
            } catch {
                // Mantém a lista atual caso a recarga falhe
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível enviar a solicitação de vínculo.'),
            });
        } finally {
            setLinkingPatient(false);
        }
    }

    return (
        <DashboardShell
            roleBadgeLabel="Psicólogo(a)"
            roleBadgeClassName="bg-primary-tint text-primary-tint-ink"
            navItems={PSYCHOLOGIST_NAV_ITEMS}
            pageTitle="Meus Pacientes"
            pageSubtitle="Envie solicitações de vínculo por CPF. O agendamento é liberado após o aceite do paciente."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-surface">
                    <p className="text-sm text-ink-secondary">Carregando pacientes...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {profileMissing && (
                        <div className="rounded-2xl bg-warning-bg border border-warning-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-surface">
                            <div className="flex items-start gap-3">
                                <BadgeAlert className="h-5 w-5 text-warning-ink shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-warning-ink">
                                        Configure seu CRP antes de vincular pacientes
                                    </p>
                                    <p className="text-xs text-warning-ink/90 mt-0.5">
                                        Para vincular pacientes e liberar agendamentos, preencha seu
                                        registro CRP e abordagem no Perfil Profissional.
                                    </p>
                                </div>
                            </div>
                            <Link
                                to="/psychologist/profile"
                                className="inline-flex items-center gap-1.5 bg-warning-solid hover:bg-warning-solid-hover text-white text-xs font-semibold px-4 py-2 rounded-xl transition self-start sm:self-center shrink-0"
                            >
                                Configurar CRP agora
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* Formulário de vínculo por CPF */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <h2 className="font-display text-lg font-semibold text-ink mb-1">
                            Vincular Novo Paciente
                        </h2>
                        <p className="text-xs text-ink-secondary mb-4">
                            Informe o CPF do paciente cadastrado no PsiqueUp para enviar um pedido de
                            consentimento.
                        </p>

                        <form
                            onSubmit={handleLinkPatient}
                            className="flex flex-col sm:flex-row items-start gap-3"
                        >
                            <div className="w-full flex-1">
                                <input
                                    id="link-patient-cpf"
                                    aria-label="CPF do paciente para vínculo"
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    maxLength={14}
                                    disabled={linkingPatient || profileMissing}
                                    value={cpfField.cpf}
                                    onChange={(e) => cpfField.handleCpfChange(e.target.value)}
                                    onBlur={cpfField.handleCpfBlur}
                                    placeholder="000.000.000-00"
                                    className={`w-full px-3.5 py-2.5 bg-subsurface border rounded-xl text-sm text-ink tabular-nums placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                                        cpfField.cpfError
                                            ? 'border-danger-ink focus:ring-danger-ink/20 focus:border-danger-ink'
                                            : 'border-border-subtle focus:ring-primary-ink/20 focus:border-primary-ink'
                                    }`}
                                />
                                {cpfField.cpfError && (
                                    <p className="text-xs text-danger-ink mt-1.5">
                                        {cpfField.cpfError}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={linkingPatient || profileMissing}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                            >
                                <UserPlus className="h-4 w-4" />
                                {linkingPatient ? 'Enviando...' : 'Solicitar Vínculo'}
                            </button>
                        </form>
                        {profileMissing && (
                            <p className="text-xs text-ink-secondary mt-2">
                                O envio de novos vínculos será liberado assim que seu CRP for
                                salvo.
                            </p>
                        )}
                    </section>

                    {/* Lista completa de pacientes */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary-ink" />
                                Vínculos Terapêuticos
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-subsurface-muted text-ink-secondary tabular-nums">
                                {links.length}
                            </span>
                        </div>

                        {links.length === 0 ? (
                            <p className="text-sm text-ink-secondary text-center py-8">
                                Nenhum paciente vinculado ainda.
                            </p>
                        ) : (
                            <div className="divide-y divide-border-subtle">
                                {links.map((link) => {
                                    const badge = LINK_STATUS_BADGE[link.status];
                                    const hasPatientName = Boolean(link.patientName?.trim());
                                    const isPending = link.status === 'PENDING';
                                    const isRejected = link.status === 'REJECTED';

                                    return (
                                        <div
                                            key={link.id}
                                            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-start gap-3">
                                                {hasPatientName ? (
                                                    <InitialsAvatar name={link.patientName} />
                                                ) : isPending ? (
                                                    <div
                                                        aria-hidden="true"
                                                        className="h-9 w-9 rounded-full bg-warning-bg text-warning-ink border border-warning-border flex items-center justify-center shrink-0"
                                                    >
                                                        <Clock className="h-4 w-4" />
                                                    </div>
                                                ) : (
                                                    <div
                                                        aria-hidden="true"
                                                        className={`h-9 w-9 rounded-full border flex items-center justify-center shrink-0 ${
                                                            isRejected
                                                                ? 'bg-danger-bg text-danger-ink border-danger-border'
                                                                : 'bg-neutral-bg text-neutral-ink border-neutral-border'
                                                        }`}
                                                    >
                                                        <ShieldX className="h-4 w-4" />
                                                    </div>
                                                )}
                                                <div>
                                                    {hasPatientName ? (
                                                        <p className="text-sm font-semibold text-ink">
                                                            {link.patientName}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-ink">
                                                            Paciente (
                                                            <span className="tabular-nums">
                                                                {link.patientCpfMasked ??
                                                                    'CPF protegido'}
                                                            </span>
                                                            )
                                                        </p>
                                                    )}

                                                    {isPending ? (
                                                        <p className="text-xs text-ink-secondary">
                                                            Agendamento bloqueado até o
                                                            consentimento do paciente.
                                                        </p>
                                                    ) : link.patientEmail ? (
                                                        <p className="text-xs text-ink-secondary">
                                                            {link.patientEmail}
                                                        </p>
                                                    ) : isRejected ? (
                                                        <p className="text-xs text-ink-secondary">
                                                            Vínculo recusado pelo paciente.
                                                        </p>
                                                    ) : link.status === 'REVOKED' ? (
                                                        <p className="text-xs text-ink-secondary">
                                                            Vínculo revogado.
                                                        </p>
                                                    ) : null}

                                                    {isRejected && link.rejectionReason && (
                                                        <p className="text-xs text-danger-ink mt-1 bg-danger-bg border border-danger-border rounded-lg px-2.5 py-1 inline-block">
                                                            Motivo: {link.rejectionReason}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <span
                                                className={`text-xs px-2.5 py-1 rounded-full font-medium border self-start sm:self-center ${badge.className}`}
                                            >
                                                {badge.label}
                                            </span>
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
