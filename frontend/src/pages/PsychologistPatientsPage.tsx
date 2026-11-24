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
            roleBadgeClassName="bg-[#E8F3F1] text-[#164E48]"
            navItems={PSYCHOLOGIST_NAV_ITEMS}
            pageTitle="Meus Pacientes"
            pageSubtitle="Vincule pacientes cadastrados pelo e-mail para liberar o agendamento de sessões."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-white rounded-2xl border border-[#E2E6E1] p-12 text-center shadow-surface">
                    <p className="text-sm text-[#4A5D61]">Carregando pacientes...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Formulário de vínculo */}
                    <section className="bg-white rounded-2xl border border-[#E2E6E1] p-6 shadow-surface">
                        <h2 className="font-display text-lg font-semibold text-[#132226] mb-1">
                            Vincular Novo Paciente
                        </h2>
                        <p className="text-xs text-[#4A5D61] mb-4">
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
                                className="flex-1 px-3.5 py-2.5 bg-[#F9FAF8] border border-[#E2E6E1] rounded-xl text-sm text-[#132226] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B63]/20 focus:border-[#1E6B63]"
                            />
                            <button
                                type="submit"
                                disabled={linkingPatient}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1E6B63] hover:bg-[#16544E] text-white text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-60 shrink-0"
                            >
                                <UserPlus className="h-4 w-4" />
                                {linkingPatient ? 'Vinculando...' : 'Vincular Paciente'}
                            </button>
                        </form>
                    </section>

                    {/* Lista completa de pacientes */}
                    <section className="bg-white rounded-2xl border border-[#E2E6E1] p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-display text-lg font-semibold text-[#132226] flex items-center gap-2">
                                <Users className="h-5 w-5 text-[#1E6B63]" />
                                Vínculos Terapêuticos
                            </h2>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F0F2ED] text-[#4A5D61] tabular-nums">
                                {links.length}
                            </span>
                        </div>

                        {links.length === 0 ? (
                            <p className="text-sm text-[#4A5D61] text-center py-8">
                                Nenhum paciente vinculado ainda.
                            </p>
                        ) : (
                            <div className="divide-y divide-[#E2E6E1]">
                                {links.map((link) => (
                                    <div
                                        key={link.id}
                                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <InitialsAvatar name={link.patientName} />
                                            <div>
                                                <p className="text-sm font-semibold text-[#132226]">
                                                    {link.patientName}
                                                </p>
                                                <p className="text-xs text-[#4A5D61]">
                                                    {link.patientEmail}
                                                </p>
                                                {link.status === 'REJECTED' &&
                                                    link.rejectionReason && (
                                                        <p className="text-xs text-[#9E2A2B] mt-1 bg-[#FDF0EF] border border-[#F3C9C8] rounded-lg px-2.5 py-1 inline-block">
                                                            Motivo: {link.rejectionReason}
                                                        </p>
                                                    )}
                                            </div>
                                        </div>

                                        <span
                                            className={`text-xs px-2.5 py-1 rounded-full font-medium border self-start sm:self-center ${
                                                link.status === 'ACTIVE'
                                                    ? 'bg-[#E8F4EE] text-[#1B5E3F] border-[#C6E3D3]'
                                                    : 'bg-[#FDF0EF] text-[#9E2A2B] border-[#F3C9C8]'
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
