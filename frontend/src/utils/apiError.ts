import axios from 'axios';
import type { ApiErrorResponse } from '../types/api';

/**
 * Extrai a mensagem mais específica possível de um erro HTTP da API,
 * diferenciando falhas de conexão/servidor offline e priorizando erros de validação por campo.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return fallback;
    }

    if (!error.response) {
        return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }

    if (error.response.status === 429) {
        return (
            error.response.data?.message ||
            'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.'
        );
    }

    const data = error.response.data;
    if (!data) {
        return fallback;
    }

    const fieldMessages = data.fieldErrors ? Object.values(data.fieldErrors).filter(Boolean) : [];
    if (fieldMessages.length > 0) {
        return fieldMessages.join(' ');
    }

    return data.message || fallback;
}

/** Retorna true quando o erro HTTP corresponde exatamente ao status informado. */
export function isApiHttpStatus(error: unknown, status: number): boolean {
    return axios.isAxiosError(error) && error.response?.status === status;
}
