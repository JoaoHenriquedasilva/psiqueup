import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, FileText, HeartHandshake, Lock, Mail, Stethoscope, User } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../contexts/useAuth';
import { useCnpjField } from '../hooks/useCnpjField';
import { useCpfField } from '../hooks/useCpfField';
import { extractApiErrorMessage } from '../utils/apiError';
import { getHomeRouteByRole } from '../utils/authRoutes';

type RegisterProfileMode = 'PATIENT' | 'PSYCHOLOGIST' | 'CLINIC';

export function RegisterPage() {
    const { register, registerClinic } = useAuth();
    const navigate = useNavigate();

    const [profileMode, setProfileMode] = useState<RegisterProfileMode>('PATIENT');
    const [clinicName, setClinicName] = useState('');
    const cnpjField = useCnpjField();
    const cpfField = useCpfField();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isClinicMode = profileMode === 'CLINIC';
    const isPatientMode = profileMode === 'PATIENT';

    function handleSelectMode(nextMode: RegisterProfileMode) {
        setProfileMode(nextMode);
        setError('');
        if (nextMode !== 'CLINIC') {
            cnpjField.setError('');
        }
        if (nextMode !== 'PATIENT') {
            cpfField.setCpfError('');
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        if (isClinicMode) {
            const trimmedClinicName = clinicName.trim();
            if (trimmedClinicName.length < 3) {
                setError('O nome do consultório deve ter entre 3 e 150 caracteres.');
                return;
            }
            if (!cnpjField.validate()) {
                return;
            }
        }

        if (trimmedName.length < 3) {
            setError('O nome deve ter entre 3 e 120 caracteres.');
            return;
        }

        if (isPatientMode && !cpfField.validateCpf()) {
            return;
        }

        if (!trimmedEmail) {
            setError('O e-mail é obrigatório.');
            return;
        }

        setLoading(true);
        try {
            const createdRole = isClinicMode
                ? await registerClinic({
                      clinicName: clinicName.trim(),
                      cnpj: cnpjField.strippedValue,
                      adminName: trimmedName,
                      adminEmail: trimmedEmail,
                      password,
                  })
                : await register(
                      trimmedName,
                      trimmedEmail,
                      password,
                      profileMode,
                      isPatientMode ? cpfField.strippedCpf : undefined
                  );
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
                        onClick={() => handleSelectMode('PATIENT')}
                        className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                            profileMode === 'PATIENT'
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
                        onClick={() => handleSelectMode('PSYCHOLOGIST')}
                        className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                            profileMode === 'PSYCHOLOGIST'
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

                    <button
                        type="button"
                        onClick={() => handleSelectMode('CLINIC')}
                        className={`sm:col-span-2 text-left p-3 rounded-xl border transition cursor-pointer ${
                            isClinicMode
                                ? 'bg-slate-inst-tint border-slate-inst text-slate-inst-ink'
                                : 'bg-subsurface border-border-subtle text-ink-secondary hover:bg-subsurface-muted hover:text-ink'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <Building2 className="h-4 w-4 shrink-0" />
                                <span>Abrir Consultório</span>
                            </div>
                            <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    isClinicMode
                                        ? 'bg-surface border-slate-inst-border text-slate-inst-ink'
                                        : 'bg-surface border-border-subtle text-ink-secondary'
                                }`}
                            >
                                Admin
                            </span>
                        </div>
                        <p className="text-[11px] mt-1 leading-snug opacity-85">
                            Cadastre sua clínica por CNPJ, aprove psicólogos e faça triagens
                        </p>
                    </button>
                </div>

                {isClinicMode && (
                    <>
                        <div className="pt-1 border-t border-border-subtle">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                                DADOS DO CONSULTÓRIO
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="register-clinic-name"
                                className="block text-sm font-medium text-ink mb-1.5"
                            >
                                Nome do consultório
                            </label>
                            <div className="relative">
                                <Building2 className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                                <input
                                    id="register-clinic-name"
                                    type="text"
                                    required
                                    minLength={3}
                                    maxLength={150}
                                    value={clinicName}
                                    onChange={(e) => setClinicName(e.target.value)}
                                    placeholder="Ex.: Instituto Cuidar Psicologia"
                                    className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="register-clinic-cnpj"
                                className="block text-sm font-medium text-ink mb-1.5"
                            >
                                CNPJ
                            </label>
                            <div className="relative">
                                <FileText className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                                <input
                                    id="register-clinic-cnpj"
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    maxLength={18}
                                    value={cnpjField.value}
                                    onChange={(e) => cnpjField.handleChange(e.target.value)}
                                    onBlur={cnpjField.handleBlur}
                                    placeholder="00.000.000/0000-00"
                                    className={`w-full pl-10 pr-3 py-2.5 bg-subsurface border rounded-xl text-sm text-ink tabular-nums placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 transition ${
                                        cnpjField.error
                                            ? 'border-danger-ink focus:ring-danger-ink/20 focus:border-danger-ink'
                                            : 'border-border-subtle focus:ring-primary-ink/20 focus:border-primary-ink'
                                    }`}
                                />
                            </div>
                            {cnpjField.error ? (
                                <p className="text-xs text-danger-ink mt-1">{cnpjField.error}</p>
                            ) : (
                                <p className="text-[11px] text-ink-secondary mt-1">
                                    Utilizado para identificar seu consultório e permitir solicitações de psicólogos.
                                </p>
                            )}
                        </div>

                        <div className="pt-1 border-t border-border-subtle">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                                DADOS DO(A) RESPONSÁVEL
                            </p>
                        </div>
                    </>
                )}

                <div>
                    <label
                        htmlFor="register-name"
                        className="block text-sm font-medium text-ink mb-1.5"
                    >
                        {isClinicMode ? 'Nome completo do(a) responsável' : 'Nome completo'}
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
                            placeholder={
                                isClinicMode
                                    ? 'Ex.: Dr. Carlos Mendes'
                                    : isPatientMode
                                      ? 'Ex.: Maria Oliveira'
                                      : 'Ex.: Dra. Ana Silva'
                            }
                            className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                        />
                    </div>
                </div>

                {isPatientMode && (
                    <div>
                        <label
                            htmlFor="register-cpf"
                            className="block text-sm font-medium text-ink mb-1.5"
                        >
                            CPF
                        </label>
                        <div className="relative">
                            <FileText className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                            <input
                                id="register-cpf"
                                type="text"
                                inputMode="numeric"
                                required
                                maxLength={14}
                                value={cpfField.cpf}
                                onChange={(e) => cpfField.handleCpfChange(e.target.value)}
                                onBlur={cpfField.handleCpfBlur}
                                placeholder="000.000.000-00"
                                className={`w-full pl-10 pr-3 py-2.5 bg-subsurface border rounded-xl text-sm text-ink tabular-nums placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 transition ${
                                    cpfField.cpfError
                                        ? 'border-danger-ink focus:ring-danger-ink/20 focus:border-danger-ink'
                                        : 'border-border-subtle focus:ring-primary-ink/20 focus:border-primary-ink'
                                }`}
                            />
                        </div>
                        {cpfField.cpfError && (
                            <p className="text-xs text-danger-ink mt-1">{cpfField.cpfError}</p>
                        )}
                        <p className="text-[11px] text-ink-secondary mt-1.5 flex items-start gap-1.5 leading-snug">
                            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ink-secondary" />
                            <span>
                                Protegido por criptografia (hash). Usado apenas para vínculos
                                clínicos autorizados por você, em sigilo (LGPD).
                            </span>
                        </p>
                    </div>
                )}

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
                    {loading
                        ? isClinicMode
                            ? 'Abrindo consultório...'
                            : 'Criando conta...'
                        : isClinicMode
                          ? 'Criar consultório e conta'
                          : 'Criar conta'}
                </button>
            </form>
        </AuthLayout>
    );
}
