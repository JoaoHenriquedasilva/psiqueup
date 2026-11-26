import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { api } from '../services/api';
import type { MessageResponse } from '../types/api';
import { extractApiErrorMessage, isApiHttpStatus } from '../utils/apiError';

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const [urlToken] = useState(() => searchParams.get('token')?.trim() ?? '');

    useEffect(() => {
        if (searchParams.has('token')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [searchParams]);

    const [manualToken, setManualToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [validationError, setValidationError] = useState('');
    const [error, setError] = useState('');
    const [tokenExpiredError, setTokenExpiredError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const activeToken = urlToken || manualToken.trim();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setValidationError('');
        setTokenExpiredError(false);

        if (!activeToken) {
            setValidationError('Informe o código de recuperação.');
            return;
        }

        if (newPassword.length < 6) {
            setValidationError('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setValidationError('As senhas informadas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post<MessageResponse>('/auth/reset-password', {
                token: activeToken,
                newPassword,
            });
            setSuccessMessage(data.message || 'Senha atualizada com sucesso!');
        } catch (err: unknown) {
            if (isApiHttpStatus(err, 400)) {
                setTokenExpiredError(true);
            }
            setError(
                extractApiErrorMessage(err, 'Não foi possível redefinir sua senha. Tente novamente.')
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Definir nova senha"
            subtitle="Escolha uma senha segura para voltar a acessar sua conta"
            error={error}
            footer={
                <>
                    Deseja voltar para a entrada?{' '}
                    <Link
                        to="/login"
                        className="font-semibold text-primary-ink hover:underline transition"
                    >
                        Ir para o login
                    </Link>
                </>
            }
        >
            {successMessage ? (
                <div className="rounded-xl bg-success-bg border border-success-border p-5 text-center space-y-3">
                    <div className="h-11 w-11 rounded-full bg-success-solid/15 text-success-ink flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-success-ink">
                            Senha atualizada com sucesso!
                        </p>
                        <p className="text-xs text-success-ink/90 leading-relaxed">
                            {successMessage}
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="inline-block w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-sm transition"
                    >
                        Ir para o login
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!urlToken && (
                        <div>
                            <label
                                htmlFor="reset-token"
                                className="block text-sm font-medium text-ink mb-1.5"
                            >
                                Código de recuperação
                            </label>
                            <div className="relative">
                                <KeyRound className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                                <input
                                    id="reset-token"
                                    type="text"
                                    required
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                    placeholder="Cole o código recebido por e-mail"
                                    className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="reset-new-password"
                            className="block text-sm font-medium text-ink mb-1.5"
                        >
                            Nova senha
                        </label>
                        <div className="relative">
                            <Lock className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                            <input
                                id="reset-new-password"
                                type="password"
                                required
                                minLength={6}
                                maxLength={72}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (validationError) setValidationError('');
                                }}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="reset-confirm-password"
                            className="block text-sm font-medium text-ink mb-1.5"
                        >
                            Confirmar nova senha
                        </label>
                        <div className="relative">
                            <Lock className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                            <input
                                id="reset-confirm-password"
                                type="password"
                                required
                                minLength={6}
                                maxLength={72}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (validationError) setValidationError('');
                                }}
                                placeholder="Repita a nova senha"
                                className="w-full pl-10 pr-3 py-2.5 bg-subsurface border border-border-subtle rounded-xl text-sm text-ink placeholder:text-ink-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-ink/20 focus:border-primary-ink transition"
                            />
                        </div>
                    </div>

                    {validationError && (
                        <p className="text-xs text-danger-ink font-medium">{validationError}</p>
                    )}

                    {tokenExpiredError && (
                        <div className="text-xs text-ink-secondary text-center">
                            Token inválido ou expirado?{' '}
                            <Link
                                to="/forgot-password"
                                className="font-semibold text-primary-ink hover:underline"
                            >
                                Solicitar novo link
                            </Link>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                    >
                        {loading ? 'Salvando...' : 'Salvar nova senha'}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}
