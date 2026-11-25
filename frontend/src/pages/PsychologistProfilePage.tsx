import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, BookOpen, Building2, CheckCircle2, Clock } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import { useCnpjField } from '../hooks/useCnpjField';
import { extractApiErrorMessage, isApiHttpStatus } from '../utils/apiError';
import { getClinicLinkBadge, resolvePrimaryClinicLink } from '../utils/clinicLink';
import { formatCnpj } from '../utils/cnpj';
import { PSYCHOLOGIST_NAV_ITEMS } from '../utils/navigation';
import type { ClinicLinkItem, PsychologistProfile, TherapeuticApproach } from '../types/api';

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

    // Vínculo com consultório
    const [clinicLinks, setClinicLinks] = useState<ClinicLinkItem[]>([]);
    const [clinicLinksError, setClinicLinksError] = useState(false);
    const clinicCnpjField = useCnpjField();
    const [joiningClinic, setJoiningClinic] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadProfileData() {
            try {
                const [approachesRes, clinicLinksRes] = await Promise.allSettled([
                    api.get<TherapeuticApproach[]>('/approaches'),
                    api.get<ClinicLinkItem[]>('/clinics/my-links'),
                ]);
                if (cancelled) return;

                if (approachesRes.status === 'fulfilled') {
                    setApproaches(approachesRes.value.data);
                } else {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(
                            approachesRes.reason,
                            'Erro ao carregar abordagens terapêuticas.'
                        ),
                    });
                }

                if (clinicLinksRes.status === 'fulfilled') {
                    setClinicLinks(clinicLinksRes.value.data);
                    setClinicLinksError(false);
                } else {
                    setClinicLinksError(true);
                }

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

    async function handleJoinClinic(e: FormEvent) {
        e.preventDefault();
        setFeedback(null);

        if (!profile) {
            setFeedback({
                type: 'error',
                text: 'Salve seu perfil profissional (CRP e abordagem) antes de solicitar vínculo com um consultório.',
            });
            return;
        }

        if (!clinicCnpjField.validate()) {
            return;
        }

        setJoiningClinic(true);
        try {
            const { data } = await api.post<ClinicLinkItem>('/clinics/join', {
                cnpj: clinicCnpjField.strippedValue,
            });
            setClinicLinks((prev) => [data, ...prev.filter((l) => l.id !== data.id)]);
            clinicCnpjField.reset();
            setFeedback({
                type: 'success',
                text: `Solicitação de vínculo enviada para ${data.clinicName}.`,
            });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Não foi possível solicitar vínculo com o consultório.'),
            });
        } finally {
            setJoiningClinic(false);
        }
    }

    const selectedApproach = approaches.find((a) => a.id === approachId) ?? null;
    const primaryClinicLink = resolvePrimaryClinicLink(clinicLinks);
    const clinicBadge = getClinicLinkBadge(primaryClinicLink?.status ?? null);

    return (
        <DashboardShell
            roleBadgeLabel="Psicólogo(a)"
            roleBadgeClassName="bg-primary-tint text-primary-tint-ink"
            navItems={PSYCHOLOGIST_NAV_ITEMS}
            pageTitle="Perfil Profissional"
            pageSubtitle="Configure seu registro CRP e abordagem terapêutica visíveis aos seus pacientes."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-surface">
                    <p className="text-sm text-ink-secondary">Carregando perfil profissional...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Formulário de Perfil */}
                    <section className="lg:col-span-7 bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface">
                        <div className="flex items-center justify-between gap-2 mb-5">
                            <h2 className="font-display text-lg font-semibold text-ink">
                                Dados de Registro e Abordagem
                            </h2>
                            {profile && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-success-bg text-success-ink border border-success-border">
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
                                        className="block text-xs font-medium text-ink-secondary mb-1.5"
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
                                        className="w-full px-3.5 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink tabular-nums focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="psych-approach"
                                        className="block text-xs font-medium text-ink-secondary mb-1.5"
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
                                        className="w-full px-3.5 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
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
                                    className="block text-xs font-medium text-ink-secondary mb-1.5"
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
                                    className="w-full px-3.5 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink"
                                />
                                <p className="text-[11px] text-ink-secondary mt-1 text-right tabular-nums">
                                    {bio.length}/500
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={savingProfile || approaches.length === 0 || !approachId}
                                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition cursor-pointer disabled:opacity-60"
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
                    <aside className="lg:col-span-5 bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                                Pré-visualização do Paciente
                            </p>
                            <h3 className="font-display text-base font-semibold text-ink mt-0.5">
                                Como o paciente lê sua abordagem
                            </h3>
                        </div>

                        {selectedApproach ? (
                            <div className="rounded-xl bg-primary-tint border border-primary-tint-border p-4 flex items-start gap-3">
                                <BookOpen className="h-5 w-5 text-primary-ink shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-primary-tint-ink mb-1">
                                        Como funciona a {selectedApproach.name}?
                                    </p>
                                    <p className="text-sm text-primary-tint-ink/90 leading-relaxed">
                                        {selectedApproach.patientFriendlyDescription}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-subsurface border border-dashed border-border-subtle p-5 text-center">
                                <p className="text-xs text-ink-secondary">
                                    Selecione uma abordagem terapêutica ao lado para visualizar a
                                    descrição didática exibida ao paciente.
                                </p>
                            </div>
                        )}
                    </aside>

                    {/* Vínculo com Consultório */}
                    <section className="lg:col-span-12 bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-slate-inst-tint text-slate-inst flex items-center justify-center shrink-0">
                                    <Building2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="font-display text-lg font-semibold text-ink">
                                        Vínculo com Consultório
                                    </h2>
                                    <p className="text-xs text-ink-secondary">
                                        Atue de forma autônoma ou solicite vínculo com um consultório cadastrado por CNPJ.
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border self-start sm:self-center ${
                                    clinicLinksError
                                        ? 'bg-danger-bg text-danger-ink border-danger-border'
                                        : clinicBadge.className
                                }`}
                            >
                                {clinicLinksError ? 'Indisponível' : clinicBadge.label}
                            </span>
                        </div>

                        {clinicLinksError ? (
                            <div className="rounded-xl bg-danger-bg border border-danger-border p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-danger-ink shrink-0 mt-0.5" />
                                <div className="space-y-0.5 text-sm text-danger-ink">
                                    <p className="font-semibold">
                                        Não foi possível carregar seu vínculo com consultório.
                                    </p>
                                    <p className="text-xs opacity-90">
                                        Ocorreu uma falha ao consultar suas solicitações. Recarregue
                                        a página para tentar novamente.
                                    </p>
                                </div>
                            </div>
                        ) : primaryClinicLink?.status === 'PENDING' ? (
                            <div className="rounded-xl bg-warning-bg border border-warning-border p-4 flex items-start gap-3">
                                <Clock className="h-5 w-5 text-warning-ink shrink-0 mt-0.5" />
                                <div className="space-y-1 text-sm text-warning-ink">
                                    <p className="font-semibold">
                                        Solicitação aguardando aprovação de {primaryClinicLink.clinicName}
                                    </p>
                                    <p className="text-xs opacity-90 tabular-nums">
                                        CNPJ: {formatCnpj(primaryClinicLink.clinicCnpj)} • Enviada em{' '}
                                        {new Date(primaryClinicLink.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className="text-xs opacity-90">
                                        Enquanto aguarda a análise do administrador, você continua atendendo normalmente como profissional autônomo.
                                    </p>
                                </div>
                            </div>
                        ) : primaryClinicLink?.status === 'APPROVED' ? (
                            <div className="rounded-xl bg-success-bg border border-success-border p-4 flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-success-ink shrink-0 mt-0.5" />
                                <div className="space-y-1 text-sm text-success-ink">
                                    <p className="font-semibold">
                                        Vinculado ao consultório {primaryClinicLink.clinicName}
                                    </p>
                                    <p className="text-xs opacity-90 tabular-nums">
                                        CNPJ: {formatCnpj(primaryClinicLink.clinicCnpj)}
                                    </p>
                                    <p className="text-xs opacity-90">
                                        O consultório pode indicar novos pacientes diretamente para você através da triagem administrativa.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {primaryClinicLink?.status === 'REJECTED' && (
                                    <div className="rounded-xl bg-danger-bg border border-danger-border p-4 flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-danger-ink shrink-0 mt-0.5" />
                                        <div className="text-xs text-danger-ink space-y-0.5">
                                            <p className="font-semibold">
                                                Sua solicitação anterior para {primaryClinicLink.clinicName} foi recusada.
                                            </p>
                                            <p className="opacity-90">
                                                Você continua atuando normalmente como autônomo e pode solicitar vínculo com outro consultório informando o CNPJ abaixo.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!primaryClinicLink && (
                                    <p className="text-xs text-ink-secondary">
                                        Atualmente você atua de forma exclusivamente autônoma. Se desejar integrar a equipe de um consultório cadastrado no PsiqueUp, informe o CNPJ da clínica para enviar uma solicitação de vínculo.
                                    </p>
                                )}

                                {!profile && (
                                    <div className="rounded-xl bg-warning-bg border border-warning-border px-4 py-3 text-xs text-warning-ink">
                                        Salve seu registro <strong>CRP</strong> e abordagem terapêutica acima antes de solicitar vínculo com um consultório.
                                    </div>
                                )}

                                <form
                                    onSubmit={handleJoinClinic}
                                    className="flex flex-col sm:flex-row sm:items-start gap-3"
                                >
                                    <div className="flex-1 max-w-xs">
                                        <label
                                            htmlFor="clinic-join-cnpj"
                                            className="block text-xs font-medium text-ink-secondary mb-1.5"
                                        >
                                            CNPJ do Consultório
                                        </label>
                                        <input
                                            id="clinic-join-cnpj"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={18}
                                            value={clinicCnpjField.value}
                                            onChange={(e) => clinicCnpjField.handleChange(e.target.value)}
                                            onBlur={clinicCnpjField.handleBlur}
                                            placeholder="00.000.000/0000-00"
                                            className={`w-full px-3.5 py-2.5 bg-subsurface border rounded-xl text-sm text-ink tabular-nums focus:bg-surface focus:outline-none focus:ring-2 transition ${
                                                clinicCnpjField.error
                                                    ? 'border-danger-ink focus:ring-danger-ink/20 focus:border-danger-ink'
                                                    : 'border-border-subtle focus:ring-primary-ink/20 focus:border-primary-ink'
                                            }`}
                                        />
                                        {clinicCnpjField.error && (
                                            <p className="text-xs text-danger-ink mt-1">
                                                {clinicCnpjField.error}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={joiningClinic || !profile}
                                        className="sm:mt-6 px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition cursor-pointer shrink-0"
                                    >
                                        {joiningClinic ? 'Enviando...' : 'Solicitar vínculo'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </DashboardShell>
    );
}
