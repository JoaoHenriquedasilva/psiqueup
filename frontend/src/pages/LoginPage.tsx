import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Lock, Mail } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-indigo-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="h-12 w-12 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-3 shadow-sm">
                        <Brain className="h-7 w-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">PsiqueUp</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestão clínica e acompanhamento terapêutico</p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                        <div className="relative">
                            <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="email"
                                required
                                maxLength={150}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition cursor-pointer"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                    Ainda não tem conta?{' '}
                    <Link to="/register" className="font-medium text-teal-600 hover:text-teal-700">
                        Cadastre-se
                    </Link>
                </p>
            </div>
        </div>
    );
}