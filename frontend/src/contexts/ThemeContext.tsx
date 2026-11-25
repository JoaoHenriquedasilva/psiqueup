import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './useTheme';

const THEME_STORAGE_KEY = 'psiqueup-theme';
const LIGHT_THEME_COLOR = '#1E6B63';
const DARK_THEME_COLOR = '#0D1517';

function getInitialTheme(): Theme {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
        return 'dark';
    }
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
            return saved;
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    } catch {
        // Fallback seguro para modo claro
    }
    return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // Ignora indisponibilidade de storage
        }

        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
        }
    }, [theme]);

    function toggleTheme() {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
