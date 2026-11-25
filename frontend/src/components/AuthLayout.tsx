import type { ReactNode } from 'react';
import { Brain, CalendarCheck, HeartHandshake, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    error?: string;
    footer: ReactNode;
    children: ReactNode;
}

const VALUE_PILLARS = [
    {
        icon: HeartHandshake,
        title: 'Vínculo transparente',
        description:
            'Pacientes conhecem a abordagem clínica de forma acessível e confirmam o vínculo com autonomia.',
    },
    {
        icon: CalendarCheck,
        title: 'Agenda organizada',
        description:
            'Agendamentos claros, registro de presenças e fluxo estruturado para resolução de divergências.',
    },
    {
        icon: ShieldCheck,
        title: 'Privacy by Design',
        description:
            'Gestão operacional sem prontuários sensíveis ou anotações clínicas expostas na plataforma.',
    },
];

/**
 * Container visual compartilhado pelas telas públicas de autenticação (Login e Cadastro).
 */
export function AuthLayout({ title, subtitle, error, footer, children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-canvas">
            {/* Painel Institucional Esquerdo (5 colunas em lg+) */}
            <aside className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-gradient-to-br from-[#1E6B63] to-[#154C46] dark:from-[#103834] dark:to-[#0A2421] text-white p-10 xl:p-12">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                            <Brain className="h-6 w-6 text-white" />
                        </div>
                        <span className="font-display text-xl font-bold tracking-tight">PsiqueUp</span>
                    </div>

                    <div className="mt-12 space-y-3">
                        <p className="text-xs uppercase tracking-widest text-white/75 font-semibold">
                            Acompanhamento Terapêutico
                        </p>
                        <h2 className="font-display text-3xl font-bold leading-tight">
                            Cuidado clínico com clareza, ética e organização.
                        </h2>
                        <p className="text-sm text-white/85 leading-relaxed max-w-md">
                            Conectamos psicólogos e pacientes em um ambiente sereno, focado no vínculo
                            terapêutico e na gestão transparente de sessões.
                        </p>
                    </div>
                </div>

                <div className="space-y-5 mt-10">
                    {VALUE_PILLARS.map((pillar) => {
                        const Icon = pillar.icon;
                        return (
                            <div
                                key={pillar.title}
                                className="flex items-start gap-3.5 rounded-xl bg-white/10 border border-white/15 p-4"
                            >
                                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">{pillar.title}</h3>
                                    <p className="text-xs text-white/80 leading-relaxed mt-0.5">
                                        {pillar.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Área de Formulário Direita (7 colunas em lg+) */}
            <main className="lg:col-span-7 relative flex items-center justify-center px-4 py-12 sm:px-8">
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                    <ThemeToggle variant="icon" />
                </div>

                <div className="w-full max-w-md bg-surface rounded-2xl shadow-surface border border-border-subtle p-7 sm:p-8">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="h-12 w-12 rounded-xl bg-primary-tint text-primary-ink border border-primary-tint-border flex items-center justify-center mb-3 lg:hidden">
                            <Brain className="h-6 w-6" />
                        </div>
                        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
                        <p className="text-sm text-ink-secondary mt-1">{subtitle}</p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-5 rounded-xl bg-danger-bg border border-danger-border border-l-4 border-l-danger-ink px-4 py-3 text-sm text-danger-ink"
                        >
                            {error}
                        </div>
                    )}

                    {children}

                    <div className="mt-6 pt-5 border-t border-border-subtle text-center text-sm text-ink-secondary">
                        {footer}
                    </div>
                </div>
            </main>
        </div>
    );
}
