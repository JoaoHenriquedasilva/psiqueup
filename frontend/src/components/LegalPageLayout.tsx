import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Mail, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface LegalPageLayoutProps {
    title: string;
    subtitle: string;
    lastUpdated: string;
    summaryItems: string[];
    children: ReactNode;
}

/**
 * Layout público compartilhado pelas páginas legais (Política de Privacidade e Termos de Uso).
 */
export function LegalPageLayout({
    title,
    subtitle,
    lastUpdated,
    summaryItems,
    children,
}: LegalPageLayoutProps) {
    const navigate = useNavigate();

    function handleBack() {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/login');
        }
    }

    return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col">
            <header className="sticky top-0 z-20 bg-surface/85 backdrop-blur-md border-b border-border-subtle">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-ink-secondary hover:text-ink hover:bg-subsurface-muted border border-border-subtle transition cursor-pointer shrink-0"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Voltar</span>
                        </button>

                        <Link to="/login" className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                                <Brain className="h-4 w-4" />
                            </div>
                            <span className="font-display font-bold text-primary-ink truncate hidden sm:inline">
                                PsiqueUp
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <nav aria-label="Documentos legais" className="flex items-center gap-1">
                            <NavLink
                                to="/privacy"
                                className={({ isActive }) =>
                                    `px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                        isActive
                                            ? 'bg-primary-tint text-primary-tint-ink font-semibold'
                                            : 'text-ink-secondary hover:bg-subsurface-muted hover:text-ink'
                                    }`
                                }
                            >
                                Privacidade
                            </NavLink>
                            <NavLink
                                to="/terms"
                                className={({ isActive }) =>
                                    `px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                        isActive
                                            ? 'bg-primary-tint text-primary-tint-ink font-semibold'
                                            : 'text-ink-secondary hover:bg-subsurface-muted hover:text-ink'
                                    }`
                                }
                            >
                                Termos
                            </NavLink>
                        </nav>

                        <ThemeToggle variant="icon" />
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
                <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-tint text-primary-tint-ink border border-primary-tint-border">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Conformidade LGPD • Transparência
                    </span>
                    <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
                        {title}
                    </h1>
                    <p className="text-sm text-ink-secondary leading-relaxed">{subtitle}</p>
                    <p className="text-xs text-ink-secondary/80">
                        Versão vigente: <span className="font-medium text-ink">{lastUpdated}</span>
                    </p>
                </div>

                <section
                    aria-label="Em resumo"
                    className="rounded-2xl bg-primary-tint border border-primary-tint-border p-5 space-y-2.5"
                >
                    <h2 className="font-display text-sm font-bold text-primary-tint-ink uppercase tracking-wider">
                        Em resumo
                    </h2>
                    <ul className="space-y-1.5 text-sm text-primary-tint-ink/95 list-disc pl-5">
                        {summaryItems.map((item) => (
                            <li key={item} className="leading-relaxed">
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                <article className="bg-surface rounded-2xl border border-border-subtle shadow-surface p-6 sm:p-8 space-y-7 text-sm text-ink-secondary leading-relaxed">
                    {children}
                </article>

                <section
                    aria-label="Contato do Encarregado (DPO)"
                    className="rounded-2xl bg-slate-inst-tint border border-slate-inst-border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div className="space-y-1">
                        <h2 className="font-display text-base font-bold text-slate-inst-ink">
                            Encarregado pelo Tratamento de Dados (DPO)
                        </h2>
                        <p className="text-xs text-slate-inst-ink/85 leading-relaxed">
                            Para dúvidas sobre privacidade, solicitações da LGPD (Art. 18) ou
                            exercício de direitos do titular, fale com nosso canal dedicado.
                        </p>
                    </div>
                    <a
                        href="mailto:dpo@psiqueup.com.br"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-slate-inst-border text-xs font-semibold text-slate-inst-ink hover:bg-subsurface transition shrink-0"
                    >
                        <Mail className="h-3.5 w-3.5" />
                        <span>dpo@psiqueup.com.br</span>
                    </a>
                </section>
            </main>
        </div>
    );
}
