import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { PSYCHOLOGIST_NAV_ITEMS } from '../utils/navigation';
import type { TherapeuticLink } from '../types/api';

export function PsychologistPatientsPage() {
    const [links, setLinks] = useState<TherapeuticLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    const [patientEmail, setPatientEmail] = useState('');
    const [linkingPatient, setLinkingPatient] = useState(false);

    useEffect(() => {
        let cancelled = false;

        api.get<TherapeuticLink[]>('/links')
            .then((res) => {
                if (!cancelled) {
                    setLinks(res.data);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(err, 'Erro ao carregar lista de pacientes.'),
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

    async function handleLinkPatient(e: FormEvent) {
        e.preventDefault();
        const trimmedEmail = patientEmail.trim();
        if (!trimmedEmail) {
            setFeedback({ type: 'error', text: 'Informe o e-mail do paciente.' });
            return;
        }

        setLinkingPatient(true);
        setFeedback(null);
        try {
            const { data: createdLink } = await api.post<TherapeuticLink>('/links', {
                patientEmail: trimmedEmail,
            });
            setPatientEmail('');
            setLinks((prev) => [...prev, createdLink]);
            setFeedback({ type: 'success', text: 'Paciente vinculado com sucesso!' });

            try {
                const { data } = await api.get<TherapeuticLink[]>('/links');
                setLinks(data);
            } catch {
                // Mantém o estado já atualizado localmente se a recarga falhar
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível vincular o paciente.'),
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
            pageSubtitle="Vincule pacientes cadastrados pelo e-mail para liberar o agendamento de sessões."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-surface">
                    <p className="text-sm text-ink-secondary">Carregando pacientes...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Formulário de vínculo */}
                    <section className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <h2 className="font-display text-lg font-semibold text-ink mb-1">
                            Vincular Novo Paciente
                        </h2>
                        <p className="text-xs text-ink-secondary mb-4">
                            O paciente precisa já possuir uma conta cadastrada com este e-mail no
                            PsiqueUp.
                        </p>

                        <form
                            onSubmit={handleLinkPatient}
                            className="flex flex-col sm:flex-row gap-3"
                        >
                            <input
                                id="link-patient-email"
                                aria-label="E-mail do paciente para vínculo"
                                type="email"
                                required
                                maxLength={150}
                                value={patientEmail}
                                onChange={(e) => setPatientEmail(e.target.value)}
                                placeholder="paciente@email.com"
                                className="flex-1 px-3.5 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
                            />
                            <button
                                type="submit"
                                disabled={linkingPatient}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-60 shrink-0"
                            >
                                <UserPlus className="h-4 w-4" />
                                {linkingPatient ? 'Vinculando...' : 'Vincular Paciente'}
                            </button>
                        </form>
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
                                {links.map((link) => (
                                    <div
                                        key={link.id}
                                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <InitialsAvatar name={link.patientName} />
                                            <div>
                                                <p className="text-sm font-semibold text-ink">
                                                    {link.patientName}
                                                </p>
                                                <p className="text-xs text-ink-secondary">
                                                    {link.patientEmail}
                                                </p>
                                                {link.status === 'REJECTED' &&
                                                    link.rejectionReason && (
                                                        <p className="text-xs text-danger-ink mt-1 bg-danger-bg border border-danger-border rounded-lg px-2.5 py-1 inline-block">
                                                            Motivo: {link.rejectionReason}
                                                        </p>
                                                    )}
                                            </div>
                                        </div>

                                        <span
                                            className={`text-xs px-2.5 py-1 rounded-full font-medium border self-start sm:self-center ${
                                                link.status === 'ACTIVE'
                                                    ? 'bg-success-bg text-success-ink border-success-border'
                                                    : 'bg-danger-bg text-danger-ink border-danger-border'
                                            }`}
                                        >
                                            {link.status === 'ACTIVE' ? 'Ativo' : 'Rejeitado'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </DashboardShell>
    );
}
