import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Brain, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { FeedbackBanner, type FeedbackMessage } from './FeedbackBanner';
import { InitialsAvatar } from './InitialsAvatar';

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
    roleBadgeClassName = 'bg-[#E8F3F1] text-[#164E48]',
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
                                        ? 'bg-[#E8F3F1] text-[#1E6B63] font-semibold'
                                        : 'text-[#4A5D61] font-medium hover:bg-[#F9FAF8] hover:text-[#132226]'
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
            <div className="p-4 border-t border-[#E2E6E1] bg-[#F9FAF8]/60">
                <div className="flex items-center gap-3 mb-3">
                    <InitialsAvatar name={user?.name} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#132226] truncate">
                            {user?.name}
                        </p>
                        <p className="text-xs text-[#4A5D61] truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#4A5D61] hover:text-[#9E2A2B] hover:bg-[#FDF0EF] rounded-xl border border-[#E2E6E1] hover:border-[#F3C9C8] transition cursor-pointer"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair da conta
                </button>
            </div>
        );
    }

    function renderBrandHeader() {
        return (
            <div className="px-5 py-5 border-b border-[#E2E6E1] flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#1E6B63] text-white flex items-center justify-center shrink-0">
                    <Brain className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <span className="font-display text-base font-bold text-[#1E6B63] block leading-tight">
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
        <div className="min-h-screen bg-[#F6F7F4] text-[#132226]">
            {/* Sidebar Desktop (lg+) */}
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white border-r border-[#E2E6E1] z-20">
                {renderBrandHeader()}
                {renderNavLinks()}
                {renderSidebarFooter()}
            </aside>

            {/* Topbar Mobile (< lg) */}
            <header className="lg:hidden sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-[#E2E6E1]">
                <div className="px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-[#1E6B63] text-white flex items-center justify-center">
                            <Brain className="h-4 w-4" />
                        </div>
                        <span className="font-display font-bold text-[#1E6B63]">PsiqueUp</span>
                        <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${roleBadgeClassName}`}
                        >
                            {roleBadgeLabel}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Abrir menu de navegação"
                        className="p-2 rounded-lg text-[#132226] hover:bg-[#F0F2ED] transition cursor-pointer"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Drawer Mobile */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div
                        className="fixed inset-0 bg-[#132226]/40 backdrop-blur-[1px]"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-hidden="true"
                    />
                    <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-[#E2E6E1] shadow-xl z-50">
                        <div className="flex items-center justify-between pr-3 border-b border-[#E2E6E1]">
                            <div className="flex-1">{renderBrandHeader()}</div>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Fechar menu"
                                className="p-2 rounded-lg text-[#4A5D61] hover:bg-[#F0F2ED] cursor-pointer"
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
            <div className="lg:pl-64">
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="font-display text-2xl font-bold text-[#132226] tracking-tight">
                                {pageTitle}
                            </h1>
                            <p className="text-sm text-[#4A5D61] mt-1">{pageSubtitle}</p>
                        </div>
                        {headerAction && <div className="shrink-0">{headerAction}</div>}
                    </div>

                    <FeedbackBanner feedback={feedback} onClose={onCloseFeedback} />

                    {children}
                </main>
            </div>
        </div>
    );
}
