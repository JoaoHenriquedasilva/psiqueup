import type { ReactNode } from 'react';
import { Brain } from 'lucide-react';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    error?: string;
    footer: ReactNode;
    children: ReactNode;
}

/**
 * Container visual compartilhado pelas telas públicas de autenticação (Login e Cadastro).
 */
export function AuthLayout({ title, subtitle, error, footer, children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-indigo-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="h-12 w-12 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-3 shadow-sm">
                        <Brain className="h-7 w-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {children}

                <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
            </div>
        </div>
    );
}
