import axios from 'axios';
import type { ApiErrorResponse } from '../types/api';

/**
 * Extrai a mensagem mais específica possível de um erro HTTP da API,
 * priorizando erros de validação por campo (fieldErrors) quando presentes.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return fallback;
    }

    const data = error.response?.data;
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
