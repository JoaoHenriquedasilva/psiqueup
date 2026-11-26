import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { FeedbackBanner } from '../components/FeedbackBanner';
import { useResendVerification } from '../hooks/useResendVerification';
import { api } from '../services/api';
import type { MessageResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/apiError';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const [token] = useState(() => searchParams.get('token')?.trim() ?? '');

    const [status, setStatus] = useState<VerificationStatus>(token ? 'verifying' : 'idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const { resending, resendFeedback, setResendFeedback, resendVerification } =
        useResendVerification();
    const attemptedTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (searchParams.has('token')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!token || attemptedTokenRef.current === token) {
            return;
        }
        attemptedTokenRef.current = token;

        let active = true;
        api.post<MessageResponse>('/auth/verify-email', { token })
            .then(({ data }) => {
                if (!active) return;
                setStatus('success');
                setStatusMessage(data.message || 'Seu e-mail foi confirmado com sucesso!');
            })
            .catch((err: unknown) => {
                if (!active) return;
                setStatus('error');
                setStatusMessage(
                    extractApiErrorMessage(
                        err,
                        'O link de confirmação é inválido ou já expirou.'
                    )
                );
            });

        return () => {
            active = false;
        };
    }, [token]);

    async function handleResendSubmit(e: FormEvent) {
        e.preventDefault();
        await resendVerification(resendEmail);
    }

    return (
        <AuthLayout
            title="Confirmação de e-mail"
            subtitle="Validação de segurança da sua conta PsiqueUp"
            footer={
                <>
                    Já confirmou sua conta?{' '}
                    <Link
                        to="/login"
                        className="font-semibold text-primary-ink hover:underline transition"
                    >
                        Ir para o login
                    </Link>
                </>
            }
        >
            {status === 'verifying' && (
                <div className="py-6 text-center space-y-3">
                    <Loader2 className="h-9 w-9 text-primary-ink animate-spin mx-auto" />
                    <p className="text-sm font-medium text-ink">Validando seu e-mail...</p>
                    <p className="text-xs text-ink-secondary">
                        Aguarde apenas alguns instantes.
                    </p>
                </div>
            )}

            {status === 'success' && (
                <div className="rounded-xl bg-success-bg border border-success-border p-5 text-center space-y-3.5">
                    <div className="h-11 w-11 rounded-full bg-success-solid/15 text-success-ink flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-success-ink">
                            E-mail verificado!
                        </p>
                        <p className="text-xs text-success-ink/90 leading-relaxed">
                            {statusMessage}
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="inline-block w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-sm transition"
                    >
                        Entrar na minha conta
                    </Link>
                </div>
            )}

            {(status === 'error' || status === 'idle') && (
                <div className="space-y-4">
                    {status === 'error' && (
                        <div
                            role="alert"
                            className="rounded-xl bg-danger-bg border border-danger-border p-4 text-sm text-danger-ink flex items-start gap-2.5"
                        >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold">Não foi possível confirmar</p>
                                <p className="text-xs leading-relaxed opacity-90">
                                    {statusMessage}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <p className="text-sm font-medium text-ink">
                            Reenviar e-mail de confirmação
                        </p>
                        <p className="text-xs text-ink-secondary leading-relaxed">
                            Informe o e-mail usado no cadastro para receber um novo link de
                            verificação.
                        </p>
                    </div>

                    <FeedbackBanner
                        feedback={resendFeedback}
                        onClose={() => setResendFeedback(null)}
                    />

                    <form onSubmit={handleResendSubmit} className="space-y-3">
                        <div className="relative">
                            <Mail className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                            <input
                                id="verify-resend-email"
                                type="email"
                                required
                                maxLength={150}
                                value={resendEmail}
                                onChange={(e) => setResendEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={resending}
                            className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                        >
                            {resending ? 'Reenviando...' : 'Reenviar link de confirmação'}
                        </button>
                    </form>
                </div>
            )}
        </AuthLayout>
    );
}
