import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../contexts/useAuth';
import { extractApiErrorMessage } from '../utils/apiError';
import { getHomeRouteByRole } from '../utils/authRoutes';

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
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
            setError(extractApiErrorMessage(err, 'E-mail ou senha inválidos.'));
        } finally {
            setLoading(false);
        }
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
                    <label
                        htmlFor="login-password"
                        className="block text-sm font-medium text-ink mb-1.5"
                    >
                        Senha
                    </label>
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
