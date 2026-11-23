import { useEffect, useState, type FormEvent } from 'react';
import {
    Brain,
    Calendar,
    CheckCircle2,
    Clock,
    LogOut,
    Plus,
    UserPlus,
    Users,
    XCircle,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { extractApiErrorMessage, isApiHttpStatus } from '../utils/apiError';
import {
    formatSessionDateTime,
    getTodayDateInputValue,
    localDateTimeToIso,
} from '../utils/dateTime';
import { SESSION_STATUS_LABELS } from '../utils/sessionStatus';
import type {
    PsychologistProfile,
    SessionItem,
    SessionStatus,
    TherapeuticApproach,
    TherapeuticLink,
} from '../types/api';

export function PsychologistDashboard() {
    const { user, logout } = useAuth();

    const [approaches, setApproaches] = useState<TherapeuticApproach[]>([]);
    const [profile, setProfile] = useState<PsychologistProfile | null>(null);
    const [links, setLinks] = useState<TherapeuticLink[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form Perfil Profissional
    const [crp, setCrp] = useState('');
    const [approachId, setApproachId] = useState<number | ''>('');
    const [bio, setBio] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Form Novo Vínculo
    const [patientEmail, setPatientEmail] = useState('');
    const [linkingPatient, setLinkingPatient] = useState(false);

    // Form Nova Sessão
    const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
    const [sessionDate, setSessionDate] = useState('');
    const [startHour, setStartHour] = useState('14:00');
    const [endHour, setEndHour] = useState('15:00');
    const [scheduling, setScheduling] = useState(false);

    // Controle de atualização de status e confirmação de adiantamento
    const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);
    const [confirmingEarlySessionId, setConfirmingEarlySessionId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadAllData() {
            try {
                const [approachesRes, linksRes, sessionsRes] = await Promise.all([
                    api.get<TherapeuticApproach[]>('/approaches'),
                    api.get<TherapeuticLink[]>('/links'),
                    api.get<SessionItem[]>('/sessions'),
                ]);

                if (cancelled) return;
                setApproaches(approachesRes.data);
                setLinks(linksRes.data);
                setSessions(sessionsRes.data);

                try {
                    const profileRes = await api.get<PsychologistProfile>('/profiles/psychologist/me');
                    if (cancelled) return;
                    setProfile(profileRes.data);
                    setCrp(profileRes.data.crp);
                    setApproachId(profileRes.data.approach.id);
                    setBio(profileRes.data.bio || '');
                } catch (profileErr: unknown) {
                    if (cancelled) return;
                    if (isApiHttpStatus(profileErr, 404)) {
                        if (approachesRes.data.length > 0) {
                            setApproachId(approachesRes.data[0].id);
                        }
                    } else {
                        setFeedback({
                            type: 'error',
                            text: extractApiErrorMessage(profileErr, 'Erro ao carregar perfil profissional.'),
                        });
                    }
                }
            } catch {
                if (!cancelled) {
                    setFeedback({ type: 'error', text: 'Erro ao carregar dados do painel.' });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadAllData();
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

    async function handleScheduleSession(e: FormEvent) {
        e.preventDefault();
        if (!selectedPatientId || !sessionDate || !startHour || !endHour) {
            setFeedback({
                type: 'error',
                text: 'Selecione o paciente, a data e os horários de início e término.',
            });
            return;
        }

        const startTime = localDateTimeToIso(sessionDate, startHour);
        const endTime = localDateTimeToIso(sessionDate, endHour);

        if (!startTime || !endTime) {
            setFeedback({
                type: 'error',
                text: 'Data ou horário informados são inválidos.',
            });
            return;
        }

        if (new Date(endTime) <= new Date(startTime)) {
            setFeedback({
                type: 'error',
                text: 'O horário de término deve ser posterior ao horário de início.',
            });
            return;
        }

        if (new Date(startTime) <= new Date()) {
            setFeedback({
                type: 'error',
                text: 'A sessão deve ser agendada para uma data e horário futuros.',
            });
            return;
        }

        setScheduling(true);
        setFeedback(null);
        try {
            const { data: createdSession } = await api.post<SessionItem>('/sessions', {
                patientId: Number(selectedPatientId),
                startTime,
                endTime,
            });
            setSelectedPatientId('');
            setSessionDate('');
            setSessions((prev) =>
                [...prev, createdSession].sort(
                    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                )
            );
            setFeedback({ type: 'success', text: 'Sessão agendada com sucesso!' });

            try {
                const { data } = await api.get<SessionItem[]>('/sessions');
                setSessions(data);
            } catch {
                // Mantém a sessão já adicionada localmente se o refresh falhar
            }
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao agendar sessão.'),
            });
        } finally {
            setScheduling(false);
        }
    }

    function requestSessionStatusChange(session: SessionItem, status: SessionStatus) {
        const isBeforeStart = new Date() < new Date(session.startTime);

        if (status === 'NO_SHOW' && isBeforeStart) {
            setFeedback({
                type: 'error',
                text: 'Não é possível registrar falta antes do horário agendado da sessão.',
            });
            return;
        }

        if (status === 'COMPLETED' && isBeforeStart) {
            setConfirmingEarlySessionId(session.id);
            return;
        }

        void handleUpdateSessionStatus(session.id, status, false);
    }

    async function handleUpdateSessionStatus(
        sessionId: number,
        status: SessionStatus,
        confirmEarlyCompletion = false
    ) {
        setFeedback(null);
        setUpdatingSessionId(sessionId);
        try {
            const { data: updated } = await api.patch<SessionItem>(
                `/sessions/${sessionId}/status`,
                {
                    status,
                    confirmEarlyCompletion: confirmEarlyCompletion || undefined,
                }
            );
            setConfirmingEarlySessionId(null);
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? updated : s))
            );
            setFeedback({ type: 'success', text: 'Status da sessão atualizado.' });
        } catch (err: unknown) {
            setFeedback({
                type: 'error',
                text: extractApiErrorMessage(err, 'Erro ao atualizar status da sessão.'),
            });
        } finally {
            setUpdatingSessionId(null);
        }
    }

    const activeLinks = links.filter((l) => l.status === 'ACTIVE');

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                            <Brain className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="font-bold text-slate-900">PsiqueUp</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                                Psicólogo(a)
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

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
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
                    <p className="text-center text-slate-500 py-12">Carregando informações clínicas...</p>
                ) : (
                    <>
                        {/* Linha 1: Perfil Profissional + Vincular Paciente */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Perfil Profissional */}
                            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">Perfil Profissional</h2>
                                <p className="text-xs text-slate-500 mb-4">
                                    Configure seu CRP e abordagem terapêutica visíveis aos seus pacientes.
                                </p>

                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">CRP</label>
                                            <input
                                                type="text"
                                                required
                                                maxLength={20}
                                                value={crp}
                                                onChange={(e) => setCrp(e.target.value)}
                                                placeholder="Ex.: 02/12345"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Abordagem Terapêutica
                                            </label>
                                            <select
                                                required
                                                value={approachId}
                                                onChange={(e) =>
                                                    setApproachId(e.target.value ? Number(e.target.value) : '')
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Apresentação / Bio (opcional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            maxLength={500}
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Breve descrição da sua atuação clínica..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingProfile || approaches.length === 0 || !approachId}
                                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition cursor-pointer disabled:opacity-60"
                                    >
                                        {savingProfile ? 'Salvando...' : profile ? 'Atualizar Perfil' : 'Ativar Perfil'}
                                    </button>
                                </form>
                            </section>

                            {/* Vincular Paciente */}
                            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                                        <Users className="h-5 w-5 text-teal-600" />
                                        Meus Pacientes
                                    </h2>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Vincule um paciente cadastrado pelo e-mail para liberar o agendamento.
                                    </p>

                                    <form onSubmit={handleLinkPatient} className="flex gap-2 mb-5">
                                        <input
                                            type="email"
                                            required
                                            maxLength={150}
                                            value={patientEmail}
                                            onChange={(e) => setPatientEmail(e.target.value)}
                                            placeholder="E-mail do paciente..."
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={linkingPatient}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition cursor-pointer disabled:opacity-60"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            {linkingPatient ? 'Vinculando...' : 'Vincular'}
                                        </button>
                                    </form>

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {links.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-4">
                                                Nenhum paciente vinculado ainda.
                                            </p>
                                        ) : (
                                            links.map((link) => (
                                                <div
                                                    key={link.id}
                                                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">{link.patientName}</p>
                                                        <p className="text-xs text-slate-500">{link.patientEmail}</p>
                                                        {link.status === 'REJECTED' && link.rejectionReason && (
                                                            <p className="text-xs text-red-600 mt-1">
                                                                Motivo: {link.rejectionReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${link.status === 'ACTIVE'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}
                                                    >
                                                        {link.status === 'ACTIVE' ? 'Ativo' : 'Rejeitado'}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Linha 2: Agendar Sessão + Lista de Sessões */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-teal-600" />
                                        Agenda de Sessões
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Agende horários com pacientes ativos e acompanhe o status dos atendimentos.
                                    </p>
                                </div>

                                {/* Formulário compacto de agendamento */}
                                <form onSubmit={handleScheduleSession} className="flex flex-wrap items-end gap-2">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                            Paciente Ativo
                                        </label>
                                        <select
                                            required
                                            value={selectedPatientId}
                                            onChange={(e) =>
                                                setSelectedPatientId(
                                                    e.target.value ? Number(e.target.value) : ''
                                                )
                                            }
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="">Selecione...</option>
                                            {activeLinks.map((l) => (
                                                <option key={l.patientId} value={l.patientId}>
                                                    {l.patientName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Data</label>
                                        <input
                                            type="date"
                                            required
                                            min={getTodayDateInputValue()}
                                            value={sessionDate}
                                            onChange={(e) => setSessionDate(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                            Início
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={startHour}
                                            onChange={(e) => setStartHour(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Fim</label>
                                        <input
                                            type="time"
                                            required
                                            value={endHour}
                                            onChange={(e) => setEndHour(e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={scheduling || activeLinks.length === 0}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition cursor-pointer disabled:opacity-60"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {scheduling ? 'Agendando...' : 'Agendar'}
                                    </button>
                                </form>
                            </div>

                            {sessions.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">
                                    Nenhuma sessão agendada até o momento.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {sessions.map((session) => {
                                        const badge = SESSION_STATUS_LABELS[session.status];
                                        const isUpdatingThis = updatingSessionId === session.id;
                                        const isConfirmingEarly = confirmingEarlySessionId === session.id;

                                        return (
                                            <div
                                                key={session.id}
                                                className="py-3.5 space-y-3"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                                                            <Clock className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {session.patientName}
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

                                                        {session.status === 'SCHEDULED' && !isConfirmingEarly && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdatingThis}
                                                                    onClick={() => requestSessionStatusChange(session, 'COMPLETED')}
                                                                    title="Marcar como realizada"
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    Realizada
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdatingThis}
                                                                    onClick={() => requestSessionStatusChange(session, 'NO_SHOW')}
                                                                    title="Registrar falta"
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                                    Falta
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdatingThis}
                                                                    onClick={() => requestSessionStatusChange(session, 'CANCELED')}
                                                                    title="Cancelar sessão"
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5" />
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {isConfirmingEarly && (
                                                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <p className="text-xs font-medium text-amber-900">
                                                            Esta sessão está agendada para mais tarde. Confirmar que o atendimento foi adiantado (foi atendido antes)?
                                                        </p>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={isUpdatingThis}
                                                                onClick={() =>
                                                                    handleUpdateSessionStatus(session.id, 'COMPLETED', true)
                                                                }
                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg cursor-pointer disabled:opacity-60"
                                                            >
                                                                {isUpdatingThis ? 'Confirmando...' : 'Confirmar adiantamento'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isUpdatingThis}
                                                                onClick={() => setConfirmingEarlySessionId(null)}
                                                                className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg border border-slate-200 cursor-pointer disabled:opacity-60"
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
                    </>
                )}
            </main>
        </div>
    );
}