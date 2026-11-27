import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Brain, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { FeedbackBanner, type FeedbackMessage } from './FeedbackBanner';
import { InitialsAvatar } from './InitialsAvatar';
import { ThemeToggle } from './ThemeToggle';

export interface DashboardNavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    end?: boolean;
}

interface DashboardShellProps {
    roleBadgeLabel: string;
    roleBadgeClassName?: string;
    navItems: DashboardNavItem[];
    pageTitle: string;
    pageSubtitle: string;
    headerAction?: ReactNode;
    feedback: FeedbackMessage | null;
    onCloseFeedback: () => void;
    children: ReactNode;
}

/**
 * Shell autenticado compartilhado entre todos os perfis (Sidebar fixa desktop + Drawer mobile).
 */
export function DashboardShell({
    roleBadgeLabel,
    roleBadgeClassName = 'bg-primary-tint text-primary-tint-ink',
    navItems,
    pageTitle,
    pageSubtitle,
    headerAction,
    feedback,
    onCloseFeedback,
    children,
}: DashboardShellProps) {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await logout();
        } finally {
            setLoggingOut(false);
        }
    }

    function renderNavLinks(onItemClick?: () => void) {
        return (
            <nav aria-label="Navegação principal" className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={onItemClick}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                                    isActive
                                        ? 'bg-primary-tint text-primary-tint-ink font-semibold'
                                        : 'text-ink-secondary font-medium hover:bg-subsurface hover:text-ink'
                                }`
                            }
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>
        );
    }

    function renderSidebarFooter() {
        return (
            <div className="p-4 border-t border-border-subtle bg-subsurface/60 space-y-2.5">
                <div className="flex items-center gap-3 pb-1">
                    <InitialsAvatar name={user?.name} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">
                            {user?.name}
                        </p>
                        <p className="text-xs text-ink-secondary truncate">{user?.email}</p>
                    </div>
                </div>
                <ThemeToggle variant="full" />
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-ink-secondary hover:text-danger-ink hover:bg-danger-bg rounded-xl border border-border-subtle hover:border-danger-border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    {loggingOut ? 'Saindo...' : 'Sair da conta'}
                </button>
            </div>
        );
    }

    function renderBrandHeader() {
        return (
            <div className="px-5 py-5 border-b border-border-subtle flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                    <Brain className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <span className="font-display text-base font-bold text-primary-ink block leading-tight">
                        PsiqueUp
                    </span>
                    <span
                        className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${roleBadgeClassName}`}
                    >
                        {roleBadgeLabel}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas text-ink">
            {/* Sidebar Desktop (lg+) */}
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-surface border-r border-border-subtle z-20">
                {renderBrandHeader()}
                {renderNavLinks()}
                {renderSidebarFooter()}
            </aside>

            {/* Topbar Mobile (< lg) */}
            <header className="lg:hidden sticky top-0 z-20 bg-surface/85 backdrop-blur-md border-b border-border-subtle">
                <div className="px-4 h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                            <Brain className="h-4 w-4" />
                        </div>
                        <span className="font-display font-bold text-primary-ink">PsiqueUp</span>
                        <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium truncate ${roleBadgeClassName}`}
                        >
                            {roleBadgeLabel}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle variant="icon" />
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Abrir menu de navegação"
                            className="p-2 rounded-xl text-ink hover:bg-subsurface-muted transition cursor-pointer"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Drawer Mobile */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-hidden="true"
                    />
                    <aside className="relative w-72 max-w-[85vw] bg-surface h-full flex flex-col border-r border-border-subtle shadow-xl z-50">
                        <div className="flex items-center justify-between pr-3 border-b border-border-subtle">
                            <div className="flex-1">{renderBrandHeader()}</div>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Fechar menu"
                                className="p-2 rounded-lg text-ink-secondary hover:bg-subsurface-muted cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {renderNavLinks(() => setMobileMenuOpen(false))}
                        {renderSidebarFooter()}
                    </aside>
                </div>
            )}

            {/* Conteúdo Principal */}
            <div className="lg:pl-64 min-h-screen flex flex-col">
                <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="font-display text-2xl font-bold text-ink tracking-tight">
                                {pageTitle}
                            </h1>
                            <p className="text-sm text-ink-secondary mt-1">{pageSubtitle}</p>
                        </div>
                        {headerAction && <div className="shrink-0">{headerAction}</div>}
                    </div>

                    <FeedbackBanner feedback={feedback} onClose={onCloseFeedback} />

                    {children}
                </main>

                <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-border-subtle/70 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
                    <span>PsiqueUp • Gestão Terapêutica</span>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/terms"
                            className="hover:text-primary-ink hover:underline transition"
                        >
                            Termos de Uso
                        </Link>
                        <span aria-hidden="true">•</span>
                        <Link
                            to="/privacy"
                            className="hover:text-primary-ink hover:underline transition"
                        >
                            Política de Privacidade
                        </Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}
