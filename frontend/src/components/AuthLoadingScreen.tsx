import { Brain, Loader2 } from 'lucide-react';

/**
 * Tela de transição exibida durante a validação inicial da sessão via cookies HttpOnly.
 */
export function AuthLoadingScreen() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="min-h-screen w-full bg-canvas flex flex-col items-center justify-center px-4"
        >
            <div className="flex flex-col items-center text-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary-tint text-primary-ink border border-primary-tint-border flex items-center justify-center">
                    <Brain className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2.5 text-sm text-ink-secondary">
                    <Loader2
                        className="h-4 w-4 animate-spin text-primary-ink shrink-0 motion-reduce:animate-none"
                        aria-hidden="true"
                    />
                    <span>Verificando sua sessão...</span>
                </div>
            </div>
        </div>
    );
}
