import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, MailWarning } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { FeedbackBanner } from '../components/FeedbackBanner';
import { useAuth } from '../contexts/useAuth';
import { useResendVerification } from '../hooks/useResendVerification';
import { extractApiErrorMessage, isApiHttpStatus } from '../utils/apiError';
import { getHomeRouteByRole } from '../utils/authRoutes';

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(
        () => searchParams.get('expired') === '1'
    );

    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const { resending, resendFeedback, setResendFeedback, resendVerification } =
        useResendVerification();

    useEffect(() => {
        if (searchParams.get('expired') === '1') {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('expired');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setSessionExpired(false);
        setUnverifiedEmail(null);
        setResendFeedback(null);

        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
            setError('O e-mail é obrigatório.');
            return;
        }

        setLoading(true);
        try {
            const role = await login(normalizedEmail, password);
            navigate(getHomeRouteByRole(role), { replace: true });
        } catch (err: unknown) {
            if (isApiHttpStatus(err, 403)) {
                setUnverifiedEmail(normalizedEmail);
            } else {
                setError(extractApiErrorMessage(err, 'E-mail ou senha inválidos.'));
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleResendVerification() {
        if (!unverifiedEmail) return;
        await resendVerification(unverifiedEmail);
    }

    return (
        <AuthLayout
            title="Entrar no PsiqueUp"
            subtitle="Acesse seu painel clínico ou de acompanhamento"
            error={error}
            footer={
                <>
                    Ainda não tem conta?{' '}
                    <Link
                        to="/register"
                        className="font-semibold text-primary-ink hover:underline transition"
                    >
                        Cadastre-se
                    </Link>
                </>
            }
        >
            {sessionExpired && (
                <div className="mb-5">
                    <FeedbackBanner
                        feedback={{
                            type: 'info',
                            text: 'Sua sessão expirou por segurança. Entre novamente para continuar.',
                        }}
                        onClose={() => setSessionExpired(false)}
                    />
                </div>
            )}

            {unverifiedEmail && (
                <div
                    role="alert"
                    className="mb-5 rounded-xl bg-warning-bg border border-warning-border border-l-4 border-l-warning-ink p-4 text-sm text-warning-ink space-y-2.5"
                >
                    <div className="flex items-start gap-2.5">
                        <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-semibold">Confirme seu e-mail antes de entrar</p>
                            <p className="text-xs leading-relaxed opacity-90">
                                Enviamos um link de confirmação para{' '}
                                <span className="font-semibold">{unverifiedEmail}</span>. Confira
                                sua caixa de entrada e a pasta de spam.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-warning-solid hover:bg-warning-solid-hover text-white disabled:opacity-60 transition cursor-pointer"
                    >
                        {resending ? 'Reenviando...' : 'Reenviar e-mail de verificação'}
                    </button>

                    {resendFeedback && (
                        <div className="pt-1">
                            <FeedbackBanner
                                feedback={resendFeedback}
                                onClose={() => setResendFeedback(null)}
                            />
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="login-email"
                        className="block text-sm font-medium text-ink mb-1.5"
                    >
                        E-mail
                    </label>
                    <div className="relative">
                        <Mail className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                        <input
                            id="login-email"
                            type="email"
                            required
                            maxLength={150}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label
                            htmlFor="login-password"
                            className="block text-sm font-medium text-ink"
                        >
                            Senha
                        </label>
                        <Link
                            to="/forgot-password"
                            className="text-xs font-medium text-primary-ink hover:underline transition"
                        >
                            Esqueci minha senha?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                        <input
                            id="login-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </AuthLayout>
    );
}
