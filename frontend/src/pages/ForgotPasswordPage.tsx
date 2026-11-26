import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { FeedbackBanner, type FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import type { MessageResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/apiError';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setFeedback(null);

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Informe o e-mail cadastrado.');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post<MessageResponse>('/auth/forgot-password', {
                email: trimmedEmail,
            });
            setFeedback({
                type: 'info',
                text:
                    data.message ||
                    'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.',
            });
        } catch (err: unknown) {
            setError(
                extractApiErrorMessage(err, 'Não foi possível processar a solicitação agora.')
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Recuperar acesso"
            subtitle="Informe seu e-mail para receber o link de redefinição"
            error={error}
            footer={
                <>
                    Lembrou da senha?{' '}
                    <Link
                        to="/login"
                        className="font-semibold text-primary-ink hover:underline transition"
                    >
                        Voltar para o login
                    </Link>
                </>
            }
        >
            <div className="space-y-4">
                <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="forgot-email"
                            className="block text-sm font-medium text-ink mb-1.5"
                        >
                            E-mail cadastrado
                        </label>
                        <div className="relative">
                            <Mail className="h-4 w-4 text-ink-secondary absolute left-3.5 top-3" />
                            <input
                                id="forgot-email"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                    >
                        {loading ? 'Enviando instruções...' : 'Enviar link de recuperação'}
                    </button>
                </form>
            </div>
        </AuthLayout>
    );
}
