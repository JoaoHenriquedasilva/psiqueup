import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import { extractApiErrorMessage, isApiHttpStatus } from '../utils/apiError';
import { PSYCHOLOGIST_NAV_ITEMS } from '../utils/navigation';
import type { PsychologistProfile, TherapeuticApproach } from '../types/api';

const BRAZILIAN_CRP_REGEX = /^(0[1-9]|1[0-9]|2[0-4])\/\d{4,6}$/;

export function PsychologistProfilePage() {
    const [approaches, setApproaches] = useState<TherapeuticApproach[]>([]);
    const [profile, setProfile] = useState<PsychologistProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    const [crp, setCrp] = useState('');
    const [approachId, setApproachId] = useState<number | ''>('');
    const [bio, setBio] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadProfileData() {
            try {
                const approachesRes = await api.get<TherapeuticApproach[]>('/approaches');
                if (cancelled) return;
                setApproaches(approachesRes.data);

                try {
                    const profileRes = await api.get<PsychologistProfile>(
                        '/profiles/psychologist/me'
                    );
                    if (cancelled) return;
                    setProfile(profileRes.data);
                    setCrp(profileRes.data.crp);
                    setApproachId(profileRes.data.approach.id);
                    setBio(profileRes.data.bio || '');
                } catch (profileErr: unknown) {
                    if (cancelled) return;
                    if (!isApiHttpStatus(profileErr, 404)) {
                        setFeedback({
                            type: 'error',
                            text: extractApiErrorMessage(
                                profileErr,
                                'Erro ao carregar perfil profissional.'
                            ),
                        });
                    }
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(
                            err,
                            'Erro ao carregar abordagens terapêuticas.'
                        ),
                    });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadProfileData();
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSaveProfile(e: FormEvent) {
        e.preventDefault();
        const trimmedCrp = crp.trim();
        if (!trimmedCrp || !approachId) {
            setFeedback({
                type: 'error',
                text: 'Preencha o CRP e selecione uma abordagem terapêutica.',
            });
            return;
        }

        if (!BRAZILIAN_CRP_REGEX.test(trimmedCrp)) {
            setFeedback({
                type: 'error',
                text: 'Informe um CRP brasileiro válido no formato XX/NNNNN (ex.: 06/12345).',
            });
            return;
        }

        setSavingProfile(true);
        setFeedback(null);
        try {
            const { data } = await api.put<PsychologistProfile>('/profiles/psychologist', {
                crp: trimmedCrp,
                approachId: Number(approachId),
                bio: bio.trim() || null,
            });
            setProfile(data);
            setCrp(data.crp);
            setFeedback({ type: 'success', text: 'Perfil profissional atualizado com sucesso!' });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao salvar perfil profissional.'),
            });
        } finally {
            setSavingProfile(false);
        }
    }

    const selectedApproach = approaches.find((a) => a.id === approachId) ?? null;

    return (
        <DashboardShell
            roleBadgeLabel="Psicólogo(a)"
            roleBadgeClassName="bg-[#E8F3F1] text-[#164E48]"
            navItems={PSYCHOLOGIST_NAV_ITEMS}
            pageTitle="Perfil Profissional"
            pageSubtitle="Configure seu registro CRP e abordagem terapêutica visíveis aos seus pacientes."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-white rounded-2xl border border-[#E2E6E1] p-12 text-center shadow-surface">
                    <p className="text-sm text-[#4A5D61]">Carregando perfil profissional...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Formulário de Perfil */}
                    <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E6E1] p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-2 mb-5">
                            <h2 className="font-display text-lg font-semibold text-[#132226]">
                                Dados de Registro e Abordagem
                            </h2>
                            {profile && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#E8F4EE] text-[#1B5E3F] border border-[#C6E3D3]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Perfil ativo
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="psych-crp"
                                        className="block text-xs font-medium text-[#4A5D61] mb-1.5"
                                    >
                                        CRP
                                    </label>
                                    <input
                                        id="psych-crp"
                                        type="text"
                                        required
                                        maxLength={20}
                                        pattern="^\s*(0[1-9]|1[0-9]|2[0-4])/\d{4,6}\s*$"
                                        title="Formato brasileiro XX/NNNNN (regiões 01 a 24, ex.: 06/12345)"
                                        value={crp}
                                        onChange={(e) => setCrp(e.target.value)}
                                        placeholder="Ex.: 06/12345"
                                        className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-[#E2E6E1] rounded-xl text-sm text-[#132226] tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B63]/20 focus:border-[#1E6B63]"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="psych-approach"
                                        className="block text-xs font-medium text-[#4A5D61] mb-1.5"
                                    >
                                        Abordagem Terapêutica
                                    </label>
                                    <select
                                        id="psych-approach"
                                        required
                                        value={approachId}
                                        onChange={(e) =>
                                            setApproachId(
                                                e.target.value ? Number(e.target.value) : ''
                                            )
                                        }
                                        className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-[#E2E6E1] rounded-xl text-sm text-[#132226] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B63]/20 focus:border-[#1E6B63]"
                                    >
                                        <option value="">Selecione...</option>
                                        {approaches.map((app) => (
                                            <option key={app.id} value={app.id}>
                                                {app.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="psych-bio"
                                    className="block text-xs font-medium text-[#4A5D61] mb-1.5"
                                >
                                    Apresentação / Bio (opcional)
                                </label>
                                <textarea
                                    id="psych-bio"
                                    rows={4}
                                    maxLength={500}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Breve descrição da sua atuação clínica..."
                                    className="w-full px-3.5 py-2.5 bg-[#F9FAF8] border border-[#E2E6E1] rounded-xl text-sm text-[#132226] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B63]/20 focus:border-[#1E6B63]"
                                />
                                <p className="text-[11px] text-[#4A5D61] mt-1 text-right tabular-nums">
                                    {bio.length}/500
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={savingProfile || approaches.length === 0 || !approachId}
                                className="px-5 py-2.5 bg-[#1E6B63] hover:bg-[#16544E] text-white text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-60"
                            >
                                {savingProfile
                                    ? 'Salvando...'
                                    : profile
                                      ? 'Atualizar Perfil'
                                      : 'Ativar Perfil'}
                            </button>
                        </form>
                    </section>

                    {/* Preview para o Paciente */}
                    <aside className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E6E1] p-6 shadow-surface space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#4A5D61]">
                                Pré-visualização do Paciente
                            </p>
                            <h3 className="font-display text-base font-semibold text-[#132226] mt-0.5">
                                Como o paciente lê sua abordagem
                            </h3>
                        </div>

                        {selectedApproach ? (
                            <div className="rounded-xl bg-[#E8F3F1] border border-[#C9E2DD] p-4 flex items-start gap-3">
                                <BookOpen className="h-5 w-5 text-[#1E6B63] shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-[#164E48] mb-1">
                                        Como funciona a {selectedApproach.name}?
                                    </p>
                                    <p className="text-sm text-[#164E48]/90 leading-relaxed">
                                        {selectedApproach.patientFriendlyDescription}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-[#F9FAF8] border border-dashed border-[#E2E6E1] p-5 text-center">
                                <p className="text-xs text-[#4A5D61]">
                                    Selecione uma abordagem terapêutica ao lado para visualizar a
                                    descrição didática exibida ao paciente.
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </DashboardShell>
    );
}
