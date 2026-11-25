import { useState } from 'react';
import { formatCnpj, isValidCnpj, stripCnpj } from '../utils/cnpj';

export const CNPJ_ERROR_MESSAGE = 'Informe um CNPJ válido com 14 dígitos.';

/**
 * Hook compartilhado para controle, formatação e validação de campos de CNPJ.
 */
export function useCnpjField(initialValue = '') {
    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState('');

    function handleChange(rawValue: string) {
        const formatted = formatCnpj(rawValue);
        setValue(formatted);
        if (error && isValidCnpj(formatted)) {
            setError('');
        }
    }

    function handleBlur() {
        if (!value.trim()) {
            setError('');
            return;
        }
        setError(isValidCnpj(value) ? '' : CNPJ_ERROR_MESSAGE);
    }

    function validate(): boolean {
        if (!isValidCnpj(value)) {
            setError(CNPJ_ERROR_MESSAGE);
            return false;
        }
        setError('');
        return true;
    }

    function reset() {
        setValue('');
        setError('');
    }

    return {
        value,
        error,
        setError,
        handleChange,
        handleBlur,
        validate,
        reset,
        strippedValue: stripCnpj(value),
    };
}
