import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextData {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextData | undefined>(undefined);

/** Hook para acessar e alternar o tema (claro/escuro) dentro do ThemeProvider. */
export function useTheme(): ThemeContextData {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme deve ser usado dentro de um ThemeProvider.');
    }
    return context;
}
