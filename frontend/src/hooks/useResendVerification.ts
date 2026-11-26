import { useState } from 'react';
import type { FeedbackMessage } from '../components/FeedbackBanner';
import { api } from '../services/api';
import type { MessageResponse } from '../types/api';
import { extractApiErrorMessage } from '../utils/apiError';

/**
 * Hook compartilhado para reenvio do e-mail de confirmação de conta.
 */
export function useResendVerification() {
    const [resending, setResending] = useState(false);
    const [resendFeedback, setResendFeedback] = useState<FeedbackMessage | null>(null);

    async function resendVerification(email: string) {
        const trimmedEmail = email.trim();
        setResendFeedback(null);

        if (!trimmedEmail) {
            setResendFeedback({
                type: 'error',
                text: 'Informe seu e-mail para reenviar a confirmação.',
            });
            return;
        }

        setResending(true);
        try {
            const { data } = await api.post<MessageResponse>('/auth/resend-verification', {
                email: trimmedEmail,
            });
            setResendFeedback({
                type: 'success',
                text:
                    data.message ||
                    'E-mail de confirmação reenviado! Confira sua caixa de entrada e spam.',
            });
        } catch (err: unknown) {
            setResendFeedback({
                type: 'error',
                text: extractApiErrorMessage(
                    err,
                    'Não foi possível reenviar o e-mail de confirmação.'
                ),
            });
        } finally {
            setResending(false);
        }
    }

    return {
        resending,
        resendFeedback,
        setResendFeedback,
        resendVerification,
    };
}
