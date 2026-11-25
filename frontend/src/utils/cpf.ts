/**
 * Utilitários de sanitização, máscara e validação de CPF (11 dígitos).
 */

/** Remove todos os caracteres não numéricos e limita a 11 dígitos. */
export function stripCpf(value: string): string {
    return value.replace(/\D/g, '').slice(0, 11);
}

/** Aplica a máscara progressiva 000.000.000-00 ao CPF. */
export function formatCpf(value: string): string {
    const digits = stripCpf(value);
    return digits
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function calcCheckDigit(digits: string, length: number): number {
    let sum = 0;
    let weight = length + 1;
    for (let i = 0; i < length; i++) {
        sum += Number(digits[i]) * weight--;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
}

/** Valida se o CPF possui 11 dígitos numéricos e dígitos verificadores oficiais válidos. */
export function isValidCpf(value: string): boolean {
    const digits = stripCpf(value);
    if (digits.length !== 11) {
        return false;
    }

    if (/^(\d)\1{10}$/.test(digits)) {
        return false;
    }

    const firstDigit = calcCheckDigit(digits, 9);
    const secondDigit = calcCheckDigit(digits, 10);

    return firstDigit === Number(digits[9]) && secondDigit === Number(digits[10]);
}
