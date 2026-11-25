import { useEffect, useState } from 'react';
import { ExternalLink, UserCheck, UserX, Users } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { ADMIN_NAV_ITEMS } from '../utils/navigation';
import type { AdminPsychologistItem } from '../types/api';

export function AdminPsychologistsPage() {
    const [psychologists, setPsychologists] = useState<AdminPsychologistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
    const [confirmingDeactivateId, setConfirmingDeactivateId] = useState<number | null>(null);
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        api.get<AdminPsychologistItem[]>('/admin/psychologists')
            .then((res) => {
                if (!cancelled) {
                    setPsychologists(res.data);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(err, 'Erro ao carregar psicólogos.'),
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
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível atualizar o status da conta.'),
            });
        } finally {
            setUpdatingUserId(null);
        }
    }

    return (
        <DashboardShell
            roleBadgeLabel="Administração"
            roleBadgeClassName="bg-warning-bg text-warning-ink"
            navItems={ADMIN_NAV_ITEMS}
            pageTitle="Psicólogos & CRP"
            pageSubtitle="Valide registros profissionais no CFP e ative ou desative o acesso dos profissionais."
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
                    <p className="text-sm text-ink-secondary">Carregando psicólogos da clínica...</p>
                </div>
            ) : (
                <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary-ink" />
                            Profissionais Cadastrados
                        </h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-subsurface-muted text-ink-secondary tabular-nums">
                            {psychologists.length}
                        </span>
                    </div>

                    {psychologists.length === 0 ? (
                        <p className="text-sm text-ink-secondary text-center py-8">
                            Nenhum psicólogo cadastrado até o momento.
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
                                                    Desativar o acesso de{' '}
                                                    <strong>{psych.name}</strong>? O token atual será
                                                    invalidado imediatamente.
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
            )}
        </DashboardShell>
    );
}
