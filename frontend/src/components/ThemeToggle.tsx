import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/useTheme';

interface ThemeToggleProps {
    variant?: 'icon' | 'full';
    className?: string;
}

/**
 * Botão reutilizável para alternar entre modo claro e modo escuro.
 */
export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const label = isDark ? 'Modo claro' : 'Modo escuro';
    const ariaLabel = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';

    if (variant === 'full') {
        return (
            <button
                type="button"
                onClick={toggleTheme}
                aria-label={ariaLabel}
                aria-pressed={isDark}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-ink-secondary hover:text-ink bg-surface hover:bg-subsurface-muted rounded-xl border border-border-subtle transition cursor-pointer ${className}`}
            >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span>{label}</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={ariaLabel}
            aria-pressed={isDark}
            title={ariaLabel}
            className={`p-2 rounded-xl bg-subsurface hover:bg-subsurface-muted text-ink-secondary hover:text-ink border border-border-subtle transition cursor-pointer ${className}`}
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    );
}
