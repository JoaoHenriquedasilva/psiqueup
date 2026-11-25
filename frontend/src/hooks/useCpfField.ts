import { useState } from 'react';
import { formatCpf, isValidCpf, stripCpf } from '../utils/cpf';

export const CPF_ERROR_MESSAGE = 'Informe um CPF válido com 11 dígitos.';

/**
 * Hook compartilhado para controle, formatação e validação de campos de CPF.
 */
export function useCpfField(initialValue = '') {
    const [cpf, setCpf] = useState(initialValue);
    const [cpfError, setCpfError] = useState('');

    function handleCpfChange(rawValue: string) {
        const formatted = formatCpf(rawValue);
        setCpf(formatted);
        if (cpfError && isValidCpf(formatted)) {
            setCpfError('');
        }
    }

    function handleCpfBlur() {
        if (!cpf.trim()) {
            setCpfError('');
            return;
        }
        setCpfError(isValidCpf(cpf) ? '' : CPF_ERROR_MESSAGE);
    }

    function validateCpf(): boolean {
        if (!isValidCpf(cpf)) {
            setCpfError(CPF_ERROR_MESSAGE);
            return false;
        }
        setCpfError('');
        return true;
    }

    function resetCpf() {
        setCpf('');
        setCpfError('');
    }

    return {
        cpf,
        cpfError,
        setCpfError,
        handleCpfChange,
        handleCpfBlur,
        validateCpf,
        resetCpf,
        strippedCpf: stripCpf(cpf),
    };
}
