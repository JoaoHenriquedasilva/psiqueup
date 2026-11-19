import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { extractApiErrorMessage } from '../utils/apiError';

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
        setLoading(true);
        try {
            const createdRole = await register(name, email, password, role);
            navigate(createdRole === 'PSYCHOLOGIST' ? '/psychologist' : '/patient');
        } catch (err: unknown) {
            setError(extractApiErrorMessage(err, 'Não foi possível concluir o cadastro.'));
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
                    <h1 className="text-2xl font-bold text-slate-900">Criar conta no PsiqueUp</h1>
                    <p className="text-sm text-slate-500 mt-1">Escolha seu perfil de acesso</p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
                        <div className="relative">
                            <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex.: Dra. Ana Silva"
                                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                        <div className="relative">
                            <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="email"
                                required
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
                                minLength={6}
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

                <p className="mt-6 text-center text-sm text-slate-600">
                    Já possui conta?{' '}
                    <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
                        Fazer login
                    </Link>
                </p>
            </div>
        </div>
    );
}