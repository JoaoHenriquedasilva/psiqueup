import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Clock,
    ShieldAlert,
    UserCheck,
    Users,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import { extractApiErrorMessage } from '../utils/apiError';
import { formatSessionDateTime } from '../utils/dateTime';
import { ADMIN_NAV_ITEMS } from '../utils/navigation';
import type {
    AdminDashboardMetrics,
    AdminPsychologistItem,
    SessionItem,
} from '../types/api';

export function AdminDashboard() {
    const navigate = useNavigate();

    const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
    const [psychologists, setPsychologists] = useState<AdminPsychologistItem[]>([]);
    const [disputedSessions, setDisputedSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            api.get<AdminDashboardMetrics>('/admin/dashboard'),
            api.get<AdminPsychologistItem[]>('/admin/psychologists'),
            api.get<SessionItem[]>('/admin/sessions', { params: { status: 'DISPUTED' } }),
        ])
            .then(([metricsRes, psychologistsRes, disputedRes]) => {
                if (cancelled) return;
                setMetrics(metricsRes.data);
                setPsychologists(psychologistsRes.data);
                setDisputedSessions(disputedRes.data);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFeedback({
                        type: 'error',
                        text: extractApiErrorMessage(
                            err,
                            'Erro ao carregar dados do consultório.'
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

    const pendingCrpPsychologists = psychologists.filter((p) => !p.crp);

    return (
        <DashboardShell
            roleBadgeLabel="Administração"
            roleBadgeClassName="bg-warning-bg text-warning-ink"
            navItems={ADMIN_NAV_ITEMS}
            pageTitle="Visão Geral"
            pageSubtitle="Indicadores administrativos e pendências prioritárias da clínica (sem dados clínicos sigilosos)."
            feedback={feedback}
            onCloseFeedback={() => setFeedback(null)}
        >
            {loading ? (
                <div className="bg-surface rounded-2xl border border-border-subtle p-12 text-center shadow-surface">
                    <p className="text-sm text-ink-secondary">
                        Carregando indicadores do consultório...
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* 4 KPIs */}
                    {metrics && (
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-surface rounded-2xl border border-border-subtle p-5 shadow-surface">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-ink-secondary">Psicólogos</p>
                                    <div className="h-8 w-8 rounded-lg bg-primary-tint text-primary-ink flex items-center justify-center">
                                        <UserCheck className="h-4 w-4" />
                                    </div>
                                </div>
                                <p className="font-display text-2xl font-bold text-ink mt-2 tabular-nums">
                                    {metrics.activePsychologists}
                                    <span className="text-sm font-normal text-ink-secondary ml-1.5">
                                        ativos
                                    </span>
                                </p>
                                <p className="text-xs text-ink-secondary mt-1 tabular-nums">
                                    {metrics.inactivePsychologists} inativo(s)
                                </p>
                            </div>

                            <div className="bg-surface rounded-2xl border border-border-subtle p-5 shadow-surface">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-ink-secondary">
                                        Pacientes & Vínculos
                                    </p>
                                    <div className="h-8 w-8 rounded-lg bg-slate-inst-tint text-slate-inst flex items-center justify-center">
                                        <Users className="h-4 w-4" />
                                    </div>
                                </div>
                                <p className="font-display text-2xl font-bold text-ink mt-2 tabular-nums">
                                    {metrics.totalPatients}
                                    <span className="text-sm font-normal text-ink-secondary ml-1.5">
                                        pacientes
                                    </span>
                                </p>
                                <p className="text-xs text-ink-secondary mt-1 tabular-nums">
                                    Média:{' '}
                                    <strong className="text-ink">
                                        {metrics.averagePatientsPerPsychologist.toFixed(1)}
                                    </strong>{' '}
                                    vínculos/psicólogo
                                </p>
                            </div>

                            <div className="bg-surface rounded-2xl border border-border-subtle p-5 shadow-surface">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-ink-secondary">
                                        Agenda de Sessões
                                    </p>
                                    <div className="h-8 w-8 rounded-lg bg-slate-inst-tint text-slate-inst flex items-center justify-center">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                </div>
                                <p className="font-display text-2xl font-bold text-ink mt-2 tabular-nums">
                                    {metrics.scheduledSessions}
                                    <span className="text-sm font-normal text-ink-secondary ml-1.5">
                                        agendadas
                                    </span>
                                </p>
                                <p className="text-xs text-ink-secondary mt-1 tabular-nums">
                                    {metrics.completedSessions} realizadas • {metrics.noShowSessions}{' '}
                                    faltas • {metrics.canceledSessions} canceladas
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate('/admin/sessions?status=DISPUTED')}
                                className={`text-left rounded-2xl border p-5 shadow-surface transition cursor-pointer ${
                                    metrics.disputedSessions > 0
                                        ? 'bg-danger-bg border-danger-border hover:opacity-90'
                                        : 'bg-surface border-border-subtle hover:bg-subsurface'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <p
                                        className={`text-xs font-medium ${
                                            metrics.disputedSessions > 0
                                                ? 'text-danger-ink'
                                                : 'text-ink-secondary'
                                        }`}
                                    >
                                        Sessões Contestadas
                                    </p>
                                    <div
                                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                            metrics.disputedSessions > 0
                                                ? 'bg-danger-ink/15 text-danger-ink'
                                                : 'bg-subsurface-muted text-ink-secondary'
                                        }`}
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                </div>
                                <p
                                    className={`font-display text-2xl font-bold mt-2 tabular-nums ${
                                        metrics.disputedSessions > 0
                                            ? 'text-danger-ink'
                                            : 'text-ink'
                                    }`}
                                >
                                    {metrics.disputedSessions}
                                </p>
                                <p className="text-xs text-ink-secondary mt-1 flex items-center gap-1">
                                    Auditar contestações
                                    <ArrowRight className="h-3 w-3" />
                                </p>
                            </button>
                        </section>
                    )}

                    {/* Pendências Prioritárias */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Contestações DISPUTED */}
                        <div className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-danger-ink" />
                                        Contestações em Aberto
                                    </h2>
                                    <Link
                                        to="/admin/sessions?status=DISPUTED"
                                        className="text-xs font-semibold text-primary-ink hover:underline inline-flex items-center gap-1"
                                    >
                                        Resolver na Auditoria
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>

                                {disputedSessions.length === 0 ? (
                                    <div className="rounded-xl bg-subsurface border border-border-subtle p-5 flex items-center gap-3 text-sm text-ink-secondary">
                                        <CheckCircle2 className="h-4 w-4 text-success-ink shrink-0" />
                                        Nenhuma sessão em contestação no momento.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border-subtle">
                                        {disputedSessions.slice(0, 5).map((session) => (
                                            <div key={session.id} className="py-3">
                                                <p className="text-sm font-medium text-ink">
                                                    {session.psychologistName}{' '}
                                                    <span className="text-ink-secondary font-normal">
                                                        →
                                                    </span>{' '}
                                                    {session.patientName}
                                                </p>
                                                <p className="text-xs text-ink-secondary mt-0.5 flex items-center gap-1.5 tabular-nums">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatSessionDateTime(
                                                        session.startTime,
                                                        session.endTime
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Psicólogos com CRP Pendente */}
                        <div className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-surface flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <h2 className="font-display text-base font-semibold text-ink flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-warning-ink" />
                                        Psicólogos com CRP Pendente
                                    </h2>
                                    <Link
                                        to="/admin/psychologists"
                                        className="text-xs font-semibold text-primary-ink hover:underline inline-flex items-center gap-1"
                                    >
                                        Gerenciar Psicólogos
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>

                                {pendingCrpPsychologists.length === 0 ? (
                                    <div className="rounded-xl bg-subsurface border border-border-subtle p-5 flex items-center gap-3 text-sm text-ink-secondary">
                                        <CheckCircle2 className="h-4 w-4 text-success-ink shrink-0" />
                                        Todos os psicólogos cadastrados já possuem CRP informado.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border-subtle">
                                        {pendingCrpPsychologists.slice(0, 5).map((psych) => (
                                            <div
                                                key={psych.userId}
                                                className="py-3 flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-ink truncate">
                                                        {psych.name}
                                                    </p>
                                                    <p className="text-xs text-ink-secondary truncate">
                                                        {psych.email}
                                                    </p>
                                                </div>
                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-ink border border-warning-border font-medium shrink-0">
                                                    CRP Pendente
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </DashboardShell>
    );
}
