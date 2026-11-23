import { Brain, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

interface DashboardNavbarProps {
    roleBadgeLabel: string;
    roleBadgeClassName?: string;
    maxWidthClassName?: string;
}

/**
 * Barra superior compartilhada entre os painéis autenticados (Psicólogo, Paciente e Admin).
 */
export function DashboardNavbar({
    roleBadgeLabel,
    roleBadgeClassName = 'bg-teal-50 text-teal-700',
    maxWidthClassName = 'max-w-6xl',
}: DashboardNavbarProps) {
    const { user, logout } = useAuth();

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className={`${maxWidthClassName} mx-auto px-4 h-16 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                        <Brain className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="font-bold text-slate-900">PsiqueUp</span>
                        <span
                            className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClassName}`}
                        >
                            {roleBadgeLabel}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600 hidden sm:inline">
                        Olá, <strong>{user?.name}</strong>
                    </span>
                    <button
                        type="button"
                        onClick={logout}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer"
                    >
                        <LogOut className="h-4 w-4" />
                        Sair
                    </button>
                </div>
            </div>
        </header>
    );
}
