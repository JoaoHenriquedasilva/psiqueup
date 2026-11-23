import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../contexts/useAuth';
import { extractApiErrorMessage } from '../utils/apiError';
import { getHomeRouteByRole } from '../utils/authRoutes';

export function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'PATIENT' | 'PSYCHOLOGIST'>('PATIENT');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        if (trimmedName.length < 3) {
            setError('O nome deve ter entre 3 e 120 caracteres.');
            return;
        }

        if (!trimmedEmail) {
            setError('O e-mail é obrigatório.');
            return;
        }

        setLoading(true);
        try {
            const createdRole = await register(trimmedName, trimmedEmail, password, role);
            navigate(getHomeRouteByRole(createdRole), { replace: true });
        } catch (err: unknown) {
            setError(extractApiErrorMessage(err, 'Não foi possível concluir o cadastro.'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Criar conta no PsiqueUp"
            subtitle="Escolha seu perfil de acesso"
            error={error}
            footer={
                <>
                    Já possui conta?{' '}
                    <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
                        Fazer login
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setRole('PATIENT')}
                        className={`py-2 text-sm font-medium rounded-md transition cursor-pointer ${
                            role === 'PATIENT'
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Sou Paciente
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('PSYCHOLOGIST')}
                        className={`py-2 text-sm font-medium rounded-md transition cursor-pointer ${
                            role === 'PSYCHOLOGIST'
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Sou Psicólogo(a)
                    </button>
                </div>

                <div>
                    <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 mb-1">
                        Nome completo
                    </label>
                    <div className="relative">
                        <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            id="register-name"
                            type="text"
                            required
                            minLength={3}
                            maxLength={120}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex.: Dra. Ana Silva"
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1">
                        E-mail
                    </label>
                    <div className="relative">
                        <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            id="register-email"
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
                    <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1">
                        Senha
                    </label>
                    <div className="relative">
                        <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            id="register-password"
                            type="password"
                            required
                            minLength={6}
                            maxLength={72}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition cursor-pointer"
                >
                    {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
            </form>
        </AuthLayout>
    );
}
