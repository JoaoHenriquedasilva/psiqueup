import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake, Lock, Mail, Stethoscope, User } from 'lucide-react';
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
            subtitle="Escolha seu perfil de acesso para começar"
            error={error}
            footer={
                <>
                    Já possui conta?{' '}
                    <Link
                        to="/login"
                        className="font-semibold text-primary-ink hover:underline transition"
                    >
                        Fazer login
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        onClick={() => setRole('PATIENT')}
                        className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                            role === 'PATIENT'
                                ? 'bg-primary-tint border-primary-ink text-primary-tint-ink'
                                : 'bg-subsurface border-border-subtle text-ink-secondary hover:bg-subsurface-muted hover:text-ink'
                        }`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <HeartHandshake className="h-4 w-4 shrink-0" />
                            <span>Sou Paciente</span>
                        </div>
                        <p className="text-[11px] mt-1 leading-snug opacity-85">
                            Acompanho minhas sessões e abordagem clínica
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setRole('PSYCHOLOGIST')}
                        className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                            role === 'PSYCHOLOGIST'
                                ? 'bg-primary-tint border-primary-ink text-primary-tint-ink'
                                : 'bg-subsurface border-border-subtle text-ink-secondary hover:bg-subsurface-muted hover:text-ink'
                        }`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Stethoscope className="h-4 w-4 shrink-0" />
                            <span>Sou Psicólogo(a)</span>
                        </div>
                        <p className="text-[11px] mt-1 leading-snug opacity-85">
                            Gerencio agenda, pacientes e perfil CRP
                        </p>
                    </button>
                </div>

                <div>
                    <label
                        htmlFor="register-name"
                        className="block text-sm font-medium text-ink mb-1.5"
                    >
                        Nome completo
                    </label>
                    <div className="relative">
                        <User className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                        <input
                            id="register-name"
                            type="text"
                            required
                            minLength={3}
                            maxLength={120}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex.: Dra. Ana Silva"
                            className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="register-email"
                        className="block text-sm font-medium text-ink mb-1.5"
                    >
                        E-mail
                    </label>
                    <div className="relative">
                        <Mail className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                        <input
                            id="register-email"
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
                        htmlFor="register-password"
                        className="block text-sm font-medium text-ink mb-1.5"
                    >
                        Senha
                    </label>
                    <div className="relative">
                        <Lock className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                        <input
                            id="register-password"
                            type="password"
                            required
                            minLength={6}
                            maxLength={72}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                    {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
            </form>
        </AuthLayout>
    );
}
